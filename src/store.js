// Состояние мастера: заметки, трекеры, журнал, закладки, кости, инициатива.
// Хранится в localStorage этого браузера (куки слишком малы — ~4 КБ на всё),
// синхронизируется между вкладками и выгружается/загружается файлом JSON.
import { reactive, ref, watch, toRaw } from 'vue'
import { mergeTrackers } from './trackers.js'

const PREFIX = 'gkn.'
const SAVE_DELAY = 400

function read(key, fallback) {
  try {
    const v = localStorage.getItem(PREFIX + key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

export const state = reactive({
  notes: read('notes', {}),
  trackers: mergeTrackers(read('trackers', null)),
  journal: read('journal', []),
  prefs: Object.assign({ pinned: [] }, read('prefs', {})),
  dice: read('dice', []),
  init: read('init', []),
  turn: read('turn', 0),
  players: read('players', false),
  last: read('last', null),
})

const KEYS = Object.keys(state)

export const saveStatus = ref('сохранено в браузере')

const lastWritten = {}
const pending = new Map()
let timer = null

function serialize(key) {
  return JSON.stringify(toRaw(state[key]))
}

function flush() {
  clearTimeout(timer)
  timer = null
  let ok = true
  for (const [key, json] of pending) {
    try {
      localStorage.setItem(PREFIX + key, json)
      lastWritten[key] = json
    } catch {
      ok = false
    }
  }
  pending.clear()
  saveStatus.value = ok ? 'сохранено в браузере' : 'не сохранилось: хранилище браузера недоступно'
}

for (const key of KEYS) {
  lastWritten[key] = serialize(key)
  watch(
    () => state[key],
    () => {
      const json = serialize(key)
      if (json === lastWritten[key]) {
        // Значение вернулось к сохранённому раньше, чем сработала запись, — отменяем её.
        pending.delete(key)
        if (!pending.size) {
          clearTimeout(timer)
          saveStatus.value = 'сохранено в браузере'
        }
        return
      }
      pending.set(key, json)
      saveStatus.value = 'сохраняю…'
      clearTimeout(timer)
      timer = setTimeout(flush, SAVE_DELAY)
    },
    { deep: true },
  )
}

if (typeof window !== 'undefined') {
  // Не теряем последние правки при закрытии вкладки.
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  // Правки из соседней вкладки.
  window.addEventListener('storage', (e) => {
    if (!e.key || !e.key.startsWith(PREFIX) || e.newValue == null) return
    const key = e.key.slice(PREFIX.length)
    if (!KEYS.includes(key) || pending.has(key)) return
    try {
      const value = JSON.parse(e.newValue)
      lastWritten[key] = e.newValue
      state[key] = key === 'trackers' ? mergeTrackers(value) : value
    } catch {
      /* битое значение — игнорируем */
    }
  })
  // Просим браузер не вычищать хранилище при нехватке места.
  navigator.storage?.persist?.().catch(() => {})
}

/* ---------- заметки и журнал ---------- */

export function noteText(key) {
  return state.notes[key]?.text || ''
}

export function setNote(key, text) {
  state.notes[key] = { text, updatedAt: Date.now() }
}

export function saveEntry(entry) {
  const i = state.journal.findIndex((x) => x.id === entry.id)
  if (i >= 0) state.journal[i] = entry
  else state.journal.push(entry)
}

export function deleteEntry(id) {
  state.journal = state.journal.filter((x) => x.id !== id)
}

export function togglePin(id) {
  const pins = new Set(state.prefs.pinned || [])
  if (pins.has(id)) pins.delete(id)
  else pins.add(id)
  state.prefs.pinned = [...pins]
}

/* ---------- резервная копия ---------- */

const BACKUP_KEYS = ['notes', 'trackers', 'journal', 'prefs']

export function exportBackup() {
  flush()
  const data = { app: 'gorod-kotoryi-narisovali', version: 1, exportedAt: new Date().toISOString() }
  for (const k of BACKUP_KEYS) data[k] = toRaw(state[k])
  return data
}

// Понимает и новый формат, и data/store.json старого локального сервера
// ({"notes/<key>": {...}, "journal/<id>": {...}, "state/trackers": {...}, "state/prefs": {...}}).
function normalizeBackup(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Это не файл заметок')
  if (BACKUP_KEYS.some((k) => k in raw)) return raw
  const out = { notes: {}, journal: [] }
  let found = false
  for (const [p, v] of Object.entries(raw)) {
    const [c, id] = p.split('/')
    if (c === 'notes' && id) { out.notes[id] = v; found = true }
    else if (c === 'journal' && id && v) { out.journal.push(v); found = true }
    else if (p === 'state/trackers') { out.trackers = v; found = true }
    else if (p === 'state/prefs') { out.prefs = v; found = true }
  }
  if (!found) throw new Error('В файле нет заметок, трекеров или журнала')
  return out
}

// Слияние без потерь: заметки — побеждает более свежая, журнал — по id,
// трекеры и закладки — берутся из файла, если они там есть.
export function importBackup(raw) {
  const data = normalizeBackup(raw)
  let notes = 0
  let entries = 0
  for (const [k, v] of Object.entries(data.notes || {})) {
    if (!v || typeof v.text !== 'string') continue
    const cur = state.notes[k]
    if (!cur || (v.updatedAt || 0) >= (cur.updatedAt || 0)) { state.notes[k] = v; notes++ }
  }
  for (const e of data.journal || []) {
    if (!e || !e.id) continue
    saveEntry(e)
    entries++
  }
  if (data.trackers) state.trackers = mergeTrackers(data.trackers)
  if (data.prefs) state.prefs = Object.assign({ pinned: [] }, data.prefs)
  return { notes, entries, trackers: !!data.trackers, prefs: !!data.prefs }
}
