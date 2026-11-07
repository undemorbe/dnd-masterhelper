import { sections } from './content.js'
import { noteText } from './store.js'

export const norm = (t) => t.toLowerCase().replace(/ё/g, 'е')

export function highlightRegExp(term) {
  const src = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[её]/gi, '[её]')
  return new RegExp(src, 'gi')
}

export function search(term) {
  const nt = norm(term)
  const res = []
  for (const s of sections) {
    const hay = norm(s.title + ' ' + s.text)
    let i = hay.indexOf(nt)
    let count = 0
    let first = -1
    while (i >= 0) {
      count++
      if (first < 0) first = i
      i = hay.indexOf(nt, i + nt.length)
    }
    const inNote = norm(noteText(s.key)).includes(nt)
    if (!count && !inNote) continue
    const src = s.title + ' ' + s.text
    const st = Math.max(0, first - 70)
    const snip = first >= 0 ? (st ? '…' : '') + src.slice(st, first + nt.length + 90) + '…' : ''
    res.push({ s, count, inNote, snip })
  }
  return res.sort((a, b) => b.count - a.count)
}
