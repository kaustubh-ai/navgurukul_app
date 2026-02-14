import { useEffect, useState } from 'react'

export function SettingsDrawer({ open, onClose, settings, onUpdate }) {
  const [draft, setDraft] = useState(settings)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  if (!open) return null

  const update = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }))
  const updateModel = (key, value) => setDraft((prev) => ({ ...prev, models: { ...prev.models, [key]: value } }))

  return (
    <aside className="settings-drawer">
      <header className="panel-header">
        <h3>Settings</h3>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
      </header>

      <label>
        OpenAI API Key
        <input
          type="password"
          value={draft.apiKey}
          onChange={(event) => update('apiKey', event.target.value)}
          placeholder="sk-..."
        />
      </label>

      <label className="inline-check">
        <input
          type="checkbox"
          checked={draft.persistApiKey}
          onChange={(event) => update('persistApiKey', event.target.checked)}
        />
        Save key in localStorage (less safe)
      </label>

      <label>
        STT model
        <input value={draft.models.stt} onChange={(event) => updateModel('stt', event.target.value)} />
      </label>

      <label>
        Vision model
        <input value={draft.models.vision} onChange={(event) => updateModel('vision', event.target.value)} />
      </label>

      <label>
        Reasoning model
        <input value={draft.models.reasoning} onChange={(event) => updateModel('reasoning', event.target.value)} />
      </label>

      <label>
        STT chunk seconds
        <input type="number" min="5" max="30" value={draft.sttChunkSec} onChange={(event) => update('sttChunkSec', Number(event.target.value))} />
      </label>

      <label>
        OCR interval seconds
        <input type="number" min="2" max="12" value={draft.ocrIntervalSec} onChange={(event) => update('ocrIntervalSec', Number(event.target.value))} />
      </label>

      <label>
        Summary interval seconds
        <input type="number" min="20" max="180" value={draft.summaryIntervalSec} onChange={(event) => update('summaryIntervalSec', Number(event.target.value))} />
      </label>

      <label>
        Question budget
        <input type="number" min="4" max="15" value={draft.maxQuestions} onChange={(event) => update('maxQuestions', Number(event.target.value))} />
      </label>

      <label>
        OCR mode
        <select value={draft.ocrMode} onChange={(event) => update('ocrMode', event.target.value)}>
          <option value="model">Model-assisted OCR</option>
          <option value="local">Local OCR (Tesseract.js, offline)</option>
          <option value="disabled">Disabled</option>
        </select>
      </label>

      <label className="inline-check">
        <input type="checkbox" checked={draft.useAudioMix} onChange={(event) => update('useAudioMix', event.target.checked)} />
        Mix system + mic audio
      </label>

      <label className="inline-check">
        <input type="checkbox" checked={draft.storeScreenshotsLocally} onChange={(event) => update('storeScreenshotsLocally', event.target.checked)} />
        Store screenshots locally
      </label>

      <label className="inline-check">
        <input type="checkbox" checked={draft.showModelPayload} onChange={(event) => update('showModelPayload', event.target.checked)} />
        Show what is sent to model
      </label>

      <div className="row-actions">
        <button className="btn btn-primary" type="button" onClick={() => onUpdate(draft)}>Save Settings</button>
      </div>
    </aside>
  )
}
