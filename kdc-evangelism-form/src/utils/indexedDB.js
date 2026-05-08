import { openDB } from 'idb'

const DB_NAME = 'kdc-evangelism-db'
const DB_VERSION = 1
const CONVERTS_STORE = 'converts'
const META_STORE = 'meta'

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(CONVERTS_STORE)) {
        const store = db.createObjectStore(CONVERTS_STORE, { keyPath: 'id' })
        store.createIndex('date_reached', 'date_reached')
        store.createIndex('full_name', 'full_name')
        store.createIndex('created_at', 'created_at')
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' })
      }
    }
  })
}

/** Replace entire converts cache */
export async function cacheAllConverts(converts) {
  try {
    const db = await getDB()
    const tx = db.transaction(CONVERTS_STORE, 'readwrite')
    await tx.store.clear()
    await Promise.all(converts.map(c => tx.store.put(c)))
    await tx.done
    await setLastSync(Date.now())
  } catch (err) {
    console.warn('IndexedDB cache write failed:', err)
  }
}

/** Get all cached converts */
export async function getCachedConverts() {
  try {
    const db = await getDB()
    const all = await db.getAll(CONVERTS_STORE)
    return all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  } catch (err) {
    console.warn('IndexedDB read failed:', err)
    return []
  }
}

/** Add or update a single convert in cache */
export async function upsertCachedConvert(convert) {
  try {
    const db = await getDB()
    await db.put(CONVERTS_STORE, convert)
  } catch (err) {
    console.warn('IndexedDB upsert failed:', err)
  }
}

/** Remove a convert from cache */
export async function removeCachedConvert(id) {
  try {
    const db = await getDB()
    await db.delete(CONVERTS_STORE, id)
  } catch (err) {
    console.warn('IndexedDB delete failed:', err)
  }
}

/** Timestamp helpers */
export async function setLastSync(ts) {
  try {
    const db = await getDB()
    await db.put(META_STORE, { key: 'lastSync', value: ts })
  } catch {}
}

export async function getLastSync() {
  try {
    const db = await getDB()
    const meta = await db.get(META_STORE, 'lastSync')
    return meta?.value || null
  } catch {
    return null
  }
}
