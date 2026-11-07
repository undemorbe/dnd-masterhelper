<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { search, highlightRegExp } from '../search.js'

const route = useRoute()
const term = computed(() => String(route.query.q || '').trim())
const results = computed(() => (term.value.length >= 2 ? search(term.value) : []))

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

function snippet(text) {
  const re = highlightRegExp(term.value)
  let out = ''
  let last = 0
  let m
  while ((m = re.exec(text))) {
    out += esc(text.slice(last, m.index)) + '<mark>' + esc(m[0]) + '</mark>'
    last = m.index + m[0].length
  }
  return out + esc(text.slice(last))
}
</script>

<template>
  <div class="crumbs">Поиск</div>
  <h1>«{{ term }}»</h1>
  <div class="hint">
    {{ results.length ? `Найдено в ${results.length} разделах` : 'Ничего не найдено. Попробуйте другое слово или часть слова.' }}
  </div>
  <div class="results">
    <RouterLink
      v-for="r in results"
      :key="r.s.id"
      class="res"
      :to="{ name: 'section', params: { id: r.s.id }, query: { hl: term } }"
    >
      <b>{{ r.s.disp }}</b>
      <span class="hint"> {{ r.count }} совп.{{ r.inNote ? ' · есть в заметках' : '' }}</span>
      <!-- eslint-disable-next-line vue/no-v-html — текст экранирован в snippet() -->
      <div class="snip" v-html="snippet(r.snip)"></div>
    </RouterLink>
  </div>
</template>

<style scoped>
.res { text-decoration: none; color: inherit; }
</style>
