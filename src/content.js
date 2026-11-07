import data from 'virtual:content'

// Ключ заметки — хеш заголовка раздела (совместим со старой версией сайта и data/store.json).
function noteKey(title) {
  let h = 0
  for (const c of title) h = (h * 31 + c.codePointAt(0)) >>> 0
  return 'k' + h.toString(36)
}

export const sections = data.sections.map((s) => Object.freeze({ ...s, key: noteKey(s.title) }))
export const music = data.music
export const byId = Object.fromEntries(sections.map((s) => [s.id, s]))

export const groups = []
for (const s of sections) if (!groups.includes(s.group)) groups.push(s.group)

export const defaultSectionId = (sections.find((s) => s.title.startsWith('МАСТЕРСКАЯ')) || sections[0]).id
export const cheatSheet = sections.find((s) => s.title.startsWith('ШПАРГАЛКА')) || null
