<script setup>
// HTML раздела методички + кнопки «Бросить dX» у таблиц d6/d20/… и подсветка найденного.
import { onMounted, ref, watch } from 'vue'
import { highlightRegExp } from '../search.js'

const props = defineProps({
  html: { type: String, required: true },
  highlight: { type: String, default: '' },
  tag: { type: String, default: 'div' },
})

const root = ref(null)

function addRollButtons(el) {
  el.querySelectorAll('.tbl').forEach((tbl) => {
    const th = tbl.querySelector('th')
    const m = th && th.textContent.trim().match(/^1?d(\d+)$/i)
    if (!m) return
    const sides = Number(m[1])
    const rows = [...tbl.querySelectorAll('tbody tr')]
    const wrap = document.createElement('div')
    wrap.className = 'roll-row'
    const btn = document.createElement('button')
    btn.className = 'btn small'
    btn.type = 'button'
    btn.textContent = 'Бросить d' + sides
    btn.addEventListener('click', () => {
      const r = 1 + Math.floor(Math.random() * sides)
      rows.forEach((x) => x.classList.remove('rolled'))
      const row = rows.find((x) => {
        const c = x.cells[0].textContent.trim()
        if (c === String(r)) return true
        const mm = c.match(/^(\d+)\D+(\d+)$/)
        return mm && r >= Number(mm[1]) && r <= Number(mm[2])
      })
      btn.textContent = `Выпало ${r} · бросить ещё`
      if (row) {
        row.classList.add('rolled')
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    })
    wrap.appendChild(btn)
    tbl.after(wrap)
  })
}

function markText(el, term) {
  const re = highlightRegExp(term)
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const nodes = []
  while (walker.nextNode()) {
    re.lastIndex = 0
    if (re.test(walker.currentNode.nodeValue)) nodes.push(walker.currentNode)
  }
  for (const n of nodes) {
    re.lastIndex = 0
    const frag = document.createDocumentFragment()
    const v = n.nodeValue
    let last = 0
    let m
    while ((m = re.exec(v))) {
      frag.append(v.slice(last, m.index))
      const mark = document.createElement('mark')
      mark.textContent = m[0]
      frag.append(mark)
      last = m.index + m[0].length
    }
    frag.append(v.slice(last))
    n.replaceWith(frag)
  }
  const first = el.querySelector('mark')
  if (first) setTimeout(() => first.scrollIntoView({ block: 'center' }), 30)
}

// Содержимое ставится вручную (а не через v-html), чтобы при смене подсветки
// снимать старые <mark> и не плодить кнопки бросков.
function render() {
  const el = root.value
  if (!el) return
  el.innerHTML = props.html
  addRollButtons(el)
  if (props.highlight) markText(el, props.highlight)
}

onMounted(render)
watch(() => [props.html, props.highlight], render, { flush: 'post' })
</script>

<template>
  <component :is="tag" ref="root"></component>
</template>
