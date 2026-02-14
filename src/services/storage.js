const DB_NAME = 'ai-interviewer-db'
const DB_VERSION = 1

let dbPromise

function getDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result
        const create = (name, keyPath) => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath })
          }
        }
        create('sessions', 'id')
        create('transcriptSegments', 'id')
        create('ocrResults', 'id')
        create('questions', 'id')
        create('answers', 'id')
        create('reports', 'sessionId')
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  return dbPromise
}

async function runTx(storeName, mode, callback) {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const result = callback(store)
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error)
  })
}

export const storage = {
  async put(storeName, value) {
    return runTx(storeName, 'readwrite', (store) => store.put(value))
  },

  async putMany(storeName, values) {
    return runTx(storeName, 'readwrite', (store) => {
      values.forEach((value) => store.put(value))
    })
  },

  async get(storeName, key) {
    const db = await getDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  },

  async getAll(storeName) {
    const db = await getDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  },

  async saveSessionBundle(bundle) {
    const { session, transcriptSegments, ocrResults, questions, answers, report } = bundle
    if (session) await this.put('sessions', session)
    if (transcriptSegments?.length) await this.putMany('transcriptSegments', transcriptSegments)
    if (ocrResults?.length) await this.putMany('ocrResults', ocrResults)
    if (questions?.length) await this.putMany('questions', questions)
    if (answers?.length) await this.putMany('answers', answers)
    if (report) await this.put('reports', { sessionId: session.id, ...report })
  },
}
