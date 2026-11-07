// Парсер мини-разметки методички (content/*.txt) → { sections, music }.
// Используется Vite-плагином (virtual:content) и может быть запущен напрямую:
//   node scripts/content.js > content.json
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const W = '\\p{L}\\p{N}_' // аналог юникодного \w из Python

function escapeHtml(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function unescapeHtml(t) {
  return t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

const BOLD = /\*\*([^*]+)\*\*/g
const ITALIC = new RegExp(`(?<![${W}*])\\*([^*]+)\\*(?![${W}])`, 'gu')
const URL_RE = /(https?:\/\/[^\s<|]+)/g

function inline(t) {
  return escapeHtml(t)
    .replace(BOLD, '<strong>$1</strong>')
    .replace(ITALIC, '<em>$1</em>')
    .replace(URL_RE, '<a href="$1" target="_blank" rel="noopener">$1</a>')
}

const BOX = {
  '!': ['imp', 'Важно'],
  '?': ['tip', 'Совет мастеру'],
  '%': ['spoil', 'Тайна · только для мастера'],
  '>': ['quote', null],
}

function parse(src) {
  const sections = []
  const lines = src.split('\n')
  let cur = null
  let i = 0
  let h2i = 0
  const emit = (x) => cur.html.push(x)

  while (i < lines.length) {
    const l = lines[i]
    if (!l.trim()) { i++; continue }

    const m = l.match(/^# (\d+)\. (.*)/)
    if (m) {
      cur = { n: Number(m[1]), title: m[2].trim(), html: [], toc: [] }
      sections.push(cur)
      h2i = 0
      i++
      continue
    }
    if (cur === null) { i++; continue }

    if (l.startsWith('## ')) {
      h2i++
      const aid = `s${cur.n}-${h2i}`
      const text = l.slice(3).trim()
      cur.toc.push([aid, text])
      emit(`<h2 id="${aid}">${inline(text)}</h2>`)
      i++
      continue
    }
    if (l.startsWith('### ')) { emit(`<h3>${inline(l.slice(4))}</h3>`); i++; continue }
    if (l.startsWith('#### ')) { emit(`<h4>${inline(l.slice(5))}</h4>`); i++; continue }
    if (l === '---pb') { i++; continue }

    const bm = l.match(/^([!?%>]) /)
    if (bm) {
      const ch = bm[1]
      const [kind, label] = BOX[ch]
      const buf = []
      while (i < lines.length && lines[i].startsWith(ch + ' ')) { buf.push(lines[i].slice(2)); i++ }
      const parts = buf.map((raw, k) => {
        let lab = label
        let b = raw
        const mm = b.match(/^\[([^\]]+)\]\s*(.*)$/)
        if (k === 0 && mm) { lab = mm[1]; b = mm[2] }
        const pre = k === 0 && lab ? `<span class="box-label">${escapeHtml(lab)}</span> ` : ''
        return b.startsWith('- ')
          ? `<p class="box-li">${pre}${inline(b.slice(2))}</p>`
          : `<p>${pre}${inline(b)}</p>`
      })
      emit(`<div class="box ${kind}">${parts.join('')}</div>`)
      continue
    }

    if (l.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i].trim().replace(/^\|+|\|+$/g, '').split('|').map((c) => c.trim()))
        i++
      }
      const th = rows[0].map((c) => `<th>${inline(c)}</th>`).join('')
      const body = rows.slice(1)
        .map((r) => `<tr>${r.map((c) => `<td>${c.split(' // ').map(inline).join('<br>')}</td>`).join('')}</tr>`)
        .join('')
      emit(`<div class="tbl"><table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`)
      continue
    }

    if (/^\s*- /.test(l)) {
      let out = '<ul>'
      let depth = 0
      while (i < lines.length && /^\s*- /.test(lines[i])) {
        const mm = lines[i].match(/^(\s*)- (.*)$/)
        const d = mm[1].length >= 2 ? 1 : 0
        if (d > depth) out += '<ul>'
        else if (d < depth) out += '</ul>'
        depth = d
        out += `<li>${inline(mm[2])}</li>`
        i++
      }
      if (depth) out += '</ul>'
      emit(out + '</ul>')
      continue
    }

    if (/^\d+\. /.test(l)) {
      let out = '<ol>'
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        out += `<li>${inline(lines[i].replace(/^\d+\. /, ''))}</li>`
        i++
      }
      emit(out + '</ol>')
      continue
    }

    emit(`<p>${inline(l)}</p>`)
    i++
  }
  return sections
}

function groupOf(title, state) {
  const t = title.toUpperCase()
  if (t.startsWith('АКТ ')) state.g = 'Акт ' + title.split(':')[0].trim().split(/\s+/)[1]
  else if (t.startsWith('ПЕРСОНАЖИ')) state.g = 'Герои'
  else if (t.startsWith('МЕХАНИКИ') || t.startsWith('МИНИ-ИГРЫ')) state.g = 'Механики'
  else if (t.startsWith('ОРУЖИЕ') || t.startsWith('ПРОКАЧКА') || t.startsWith('СНАРЯЖЕНИЕ')) state.g = 'Снаряжение'
  else if (['МУЗЫКА', 'БАНК', 'ОТКРЫТЫЕ', 'ШПАРГАЛКА'].some((p) => t.startsWith(p))) state.g = 'Справочник'
  else if (t.startsWith('ROADMAP')) state.g = 'Roadmap'
  return state.g
}

const PROPER = [
  ['осирис', 'Осирис'], ['вейл', 'Вейл'], ['ашгрей', 'Ашгрей'], ['гравенхольм', 'Гравенхольм'],
  ['тесори', 'Тесори'], ['bloodborne', 'Bloodborne'], ['посланц', 'Посланц'], ['мглин', 'Мглин'],
  ['«терпение»', '«Терпение»'], ['«ненасытная луна»', '«Ненасытная луна»'], ['«глотка»', '«Глотка»'],
  ['«прогресс»', '«Прогресс»'], ['шипов', 'Шипов'], ['город-картина', 'Город-Картина'],
  ['изнанка холста', 'Изнанка Холста'], ['звёздный колодец', 'Звёздный Колодец'],
  ['король крыс', 'Король Крыс'], ['шпиль мольберта', 'Шпиль Мольберта'],
]
const ACT_RE = new RegExp(`акт (v|iv|iii|ii|i)(?![${W}])`, 'giu')

function displayTitle(title) {
  let t = title.toLowerCase()
  t = t.charAt(0).toUpperCase() + t.slice(1)
  for (const [a, b] of PROPER) t = t.split(a).join(b)
  return t.replace(ACT_RE, (_, n) => 'Акт ' + n.toUpperCase())
}

export function buildContent(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).sort()
  const src = files.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n')
  const secs = parse(src)

  const st = { g: 'Основы' }
  const sections = secs.map((s) => {
    const body = s.html.join('')
    const text = unescapeHtml(body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim()
    return {
      id: `s${s.n}`, n: s.n, title: s.title, disp: displayTitle(s.title),
      group: groupOf(s.title, st), html: body, toc: s.toc, text,
    }
  })

  const music = []
  const ROW = /<tr><td>(.*?)<\/td><td>.*?href="([^"]+)".*?<\/td><td>(.*?)<\/td><\/tr>/g
  for (const s of secs) {
    if (!s.title.startsWith('МУЗЫКА')) continue
    for (const row of s.html.join('').matchAll(ROW)) {
      music.push({ scene: row[1].replace(/<[^>]+>/g, ''), url: row[2], where: row[3].replace(/<[^>]+>/g, '') })
    }
  }
  return { sections, music }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'content')
  process.stdout.write(JSON.stringify(buildContent(dir)))
}
