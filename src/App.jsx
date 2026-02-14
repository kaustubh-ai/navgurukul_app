import { useCallback, useMemo, useState } from 'react'
import { LandingPage } from './components/LandingPage'
import { SessionPage } from './components/SessionPage'
import { ReportPage } from './components/ReportPage'
import { SettingsDrawer } from './components/SettingsDrawer'
import { useSessionController } from './hooks/useSessionController'

const SETTINGS_KEY = 'ai_interviewer_settings'
const API_KEY_STORAGE_KEY = 'ai_interviewer_api_key'

const DEFAULT_SETTINGS = {
  apiKey: '',
  persistApiKey: false,
  models: {
    stt: 'gpt-4o-mini-transcribe',
    vision: 'gpt-4.1-mini',
    reasoning: 'gpt-4.1-mini',
  },
  sttChunkSec: 15,
  ocrIntervalSec: 4,
  summaryIntervalSec: 45,
  maxQuestions: 10,
  useAudioMix: true,
  storeScreenshotsLocally: false,
  showModelPayload: false,
  ocrMode: 'model',
}

function loadInitialSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    const stored = raw ? JSON.parse(raw) : {}
    const persistedKey = localStorage.getItem(API_KEY_STORAGE_KEY) || ''

    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      models: {
        ...DEFAULT_SETTINGS.models,
        ...(stored.models || {}),
      },
      apiKey: persistedKey || '',
      persistApiKey: Boolean(persistedKey),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export default function App() {
  const [settings, setSettings] = useState(loadInitialSettings)
  const [page, setPage] = useState('landing')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reportBundle, setReportBundle] = useState(null)

  const onSessionDone = useCallback((bundle) => {
    setReportBundle(bundle)
    setPage('report')
  }, [])

  const controller = useSessionController({ settings, onSessionDone })

  const hasApiKey = useMemo(() => Boolean(settings.apiKey?.trim()), [settings.apiKey])

  const updateSettings = (nextSettings) => {
    setSettings(nextSettings)

    const publicSettings = {
      ...nextSettings,
      apiKey: '',
      persistApiKey: false,
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(publicSettings))

    if (nextSettings.persistApiKey && nextSettings.apiKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, nextSettings.apiKey)
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY)
    }
  }

  const startMode = async (mode) => {
    await controller.startSession(mode)
    setPage('session')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="topbar-title">AI Interviewer</p>
          <p className="topbar-subtitle">Client-only React demo</p>
        </div>
        <button className="btn btn-ghost" type="button" onClick={() => setSettingsOpen(true)}>
          Settings
        </button>
      </header>

      {page === 'landing' && (
        <LandingPage
          onStartLive={() => startMode('live')}
          onStartRecord={() => startMode('record_then_interview')}
          hasApiKey={hasApiKey}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {page === 'session' && (
        <SessionPage
          controller={controller}
          settings={settings}
          onUpdateSettings={updateSettings}
          onBack={() => setPage('landing')}
        />
      )}

      {page === 'report' && <ReportPage bundle={reportBundle} onBack={() => setPage('landing')} />}

      <SettingsDrawer
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onUpdate={(next) => {
          updateSettings(next)
          setSettingsOpen(false)
        }}
      />
    </div>
  )
}
