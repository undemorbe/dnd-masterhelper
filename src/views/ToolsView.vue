<script setup>
import { ref } from 'vue'
import { music, cheatSheet } from '../content.js'
import { state, exportBackup, importBackup } from '../store.js'
import RichHtml from '../components/RichHtml.vue'

/* ---------- кости ---------- */
const roll = (n) => 1 + Math.floor(Math.random() * n)
const result = ref('—')
const detail = ref(' ')
const expr = ref('')

function evalDice(input) {
  const s = input.replace(/\s+/g, '').toLowerCase().replace(/д/g, 'd')
  if (!/^[0-9d+-]+$/.test(s)) return null
  let total = 0
  let used = 0
  const parts = []
  const re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/g
  let m
  while ((m = re.exec(s))) {
    used += m[0].length
    if (m[3]) {
      const count = Number(m[2] || 1)
      const faces = Number(m[3])
      if (count > 100 || faces > 1000 || faces < 1) return null
      const rolls = Array.from({ length: count }, () => roll(faces))
      const sum = rolls.reduce((a, b) => a + b, 0)
      total += (m[1] === '-' ? -1 : 1) * sum
      parts.push(`${m[1] || ''}${count}d${faces}[${rolls.join(',')}]`)
    } else {
      total += (m[4] === '-' ? -1 : 1) * Number(m[5])
      parts.push((m[4] || '+') + m[5])
    }
  }
  if (used !== s.length) return null
  return { total, detail: parts.join(' ') }
}

function pushHist(label, res) {
  state.dice = [`${label} → ${res}`, ...state.dice].slice(0, 20)
}

function rollDie(n) {
  const r = roll(n)
  result.value = r
  detail.value = 'd' + n
  pushHist('d' + n, r)
}

function rollAdv(adv) {
  const a = roll(20)
  const b = roll(20)
  const r = adv ? Math.max(a, b) : Math.min(a, b)
  result.value = r
  detail.value = `${adv ? 'преимущество' : 'помеха'} [${a}, ${b}]`
  pushHist('d20 ' + (adv ? 'преим.' : 'помеха'), r)
}

function rollExpr() {
  const r = evalDice(expr.value)
  if (!r) {
    detail.value = 'Не понял формулу. Пример: 2d6+3 или 1d20-1'
    return
  }
  result.value = r.total
  detail.value = r.detail
  pushHist(expr.value, r.total)
}

/* ---------- инициатива ---------- */
const iniName = ref('')
const iniVal = ref('')

function addCombatant() {
  const n = iniName.value.trim()
  if (!n) return
  state.init.push({ n, v: iniVal.value === '' ? roll(20) : iniVal.value, hp: '' })
  iniName.value = ''
  iniVal.value = ''
}
function removeCombatant(i) {
  state.init.splice(i, 1)
  if (state.turn >= state.init.length) state.turn = 0
}
function nextTurn() {
  if (state.init.length) state.turn = (state.turn + 1) % state.init.length
}
function sortInit() {
  state.init.sort((a, b) => Number(b.v) - Number(a.v))
  state.turn = 0
}
function clearInit() {
  state.init = []
  state.turn = 0
}

/* ---------- резервная копия ---------- */
const fileInput = ref(null)
const dataMsg = ref(null)

function download() {
  const blob = new Blob([JSON.stringify(exportBackup(), null, 1)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `заметки-мастера-${new Date().toISOString().slice(0, 10)}.json`
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  dataMsg.value = { ok: true, text: 'Файл сохранён. Храните его рядом с методичкой.' }
}

async function upload(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    const r = importBackup(JSON.parse(await file.text()))
    const parts = [`заметок: ${r.notes}`, `записей журнала: ${r.entries}`]
    if (r.trackers) parts.push('трекеры')
    if (r.prefs) parts.push('закладки')
    dataMsg.value = { ok: true, text: 'Загружено — ' + parts.join(', ') + '.' }
  } catch (err) {
    dataMsg.value = { ok: false, text: 'Не удалось загрузить: ' + (err instanceof SyntaxError ? 'файл повреждён или это не JSON' : err.message) }
  }
}
</script>

<template>
  <div class="crumbs">За столом</div>
  <h1>Инструменты</h1>
  <div class="grid">
    <section class="card">
      <h3>Кости</h3>
      <div class="dice">
        <button v-for="n in [4, 6, 8, 10, 12, 20, 100]" :key="n" type="button" class="die" @click="rollDie(n)">d{{ n }}</button>
      </div>
      <div class="dice" style="margin-top:8px">
        <button type="button" class="die" @click="rollAdv(true)">d20 с преимуществом</button>
        <button type="button" class="die" @click="rollAdv(false)">d20 с помехой</button>
      </div>
      <form class="row" style="display:flex;gap:6px;margin-top:8px" @submit.prevent="rollExpr">
        <input v-model="expr" class="inp" placeholder="2d6+3" style="flex:1;min-width:0" aria-label="Формула броска">
        <button class="btn" type="submit">Бросить</button>
      </form>
      <div class="result" aria-live="polite">{{ result }}</div>
      <div class="hint">{{ detail }}</div>
      <div class="hist"><div v-for="(h, i) in state.dice" :key="i">{{ h }}</div></div>
    </section>

    <section class="card">
      <h3>Инициатива</h3>
      <form style="display:flex;gap:6px;flex-wrap:wrap" @submit.prevent="addCombatant">
        <input v-model="iniName" class="inp" placeholder="Имя" style="flex:1 1 120px;min-width:0" aria-label="Имя">
        <input v-model="iniVal" class="inp" type="number" placeholder="Иниц." style="width:5.5em" aria-label="Инициатива">
        <button class="btn" type="submit">Добавить</button>
      </form>
      <ul class="init-list">
        <li v-for="(c, i) in state.init" :key="i" :class="{ turn: i === state.turn }">
          <span class="val" style="text-align:left">{{ c.v }}</span>
          <span>{{ c.n }}</span>
          <input v-model="c.hp" type="text" placeholder="хиты" :aria-label="`Хиты ${c.n}`">
          <button class="btn small" type="button" :aria-label="`Убрать ${c.n}`" @click="removeCombatant(i)">×</button>
        </li>
        <li v-if="!state.init.length" class="empty">Добавьте участников боя.</li>
      </ul>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn small" type="button" @click="nextTurn">Следующий ход</button>
        <button class="btn small" type="button" @click="sortInit">Сортировать</button>
        <button class="btn small" type="button" @click="clearInit">Очистить</button>
      </div>
      <div class="hint" style="margin-top:6px">Хиты можно править прямо в списке.</div>
    </section>

    <section class="card music">
      <h3>Музыка</h3>
      <a v-for="m in music" :key="m.url + m.scene" :href="m.url" target="_blank" rel="noopener">
        {{ m.scene }}<small>{{ m.where }}</small>
      </a>
    </section>

    <section class="card">
      <h3>Мои данные</h3>
      <p class="hint">
        Заметки, трекеры, журнал и закладки хранятся в этом браузере (localStorage) и не уходят на сервер.
        На другом устройстве или после очистки данных сайта их не будет — периодически сохраняйте копию в файл.
      </p>
      <div class="data-actions">
        <button class="btn primary" type="button" @click="download">Сохранить в файл</button>
        <button class="btn" type="button" @click="fileInput.click()">Загрузить из файла</button>
        <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="upload">
      </div>
      <p class="hint">
        Загрузка добавляет данные к текущим: у заметок побеждает более свежая версия, записи журнала объединяются.
        Подходит и старый <code>data/store.json</code>.
      </p>
      <div v-if="dataMsg" class="data-msg" :class="dataMsg.ok ? 'ok' : 'err'" role="status">{{ dataMsg.text }}</div>
    </section>
  </div>

  <template v-if="cheatSheet">
    <h2 class="section-title" style="margin-top:28px">Шпаргалка мастера</h2>
    <RichHtml :html="cheatSheet.html" />
  </template>
</template>
