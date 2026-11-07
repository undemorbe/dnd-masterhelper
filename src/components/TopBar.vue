<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { state, saveStatus } from '../store.js'

defineEmits(['toggle-rail'])

const route = useRoute()
const router = useRouter()

const TABS = [
  { name: 'ref', label: 'Методичка', to: () => ({ name: 'section', params: { id: state.last || 's1' } }) },
  { name: 'track', label: 'Трекеры', to: () => ({ name: 'track' }) },
  { name: 'journal', label: 'Журнал', to: () => ({ name: 'journal' }) },
  { name: 'tools', label: 'Инструменты', to: () => ({ name: 'tools' }) },
]

function activeTab() {
  if (route.name === 'section' || route.name === 'search') return 'ref'
  return route.name
}

const q = ref(route.name === 'search' ? String(route.query.q || '') : '')
let timer = null

function onSearch() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    const term = q.value.trim()
    if (term.length >= 2) router.replace({ name: 'search', query: { q: term } })
    else if (route.name === 'search') router.replace('/')
  }, 180)
}

watch(() => route.name, (name) => { if (name !== 'search') q.value = '' })
</script>

<template>
  <header class="topbar">
    <button class="btn small menu-btn" aria-label="Открыть список разделов" @click="$emit('toggle-rail')">Разделы</button>
    <div class="brand"><span class="eye" aria-hidden="true"></span>Город, который нарисовали</div>
    <nav class="tabs" role="tablist" aria-label="Режимы">
      <button
        v-for="t in TABS"
        :key="t.name"
        class="tab"
        role="tab"
        :aria-selected="String(activeTab() === t.name)"
        @click="router.push(t.to())"
      >{{ t.label }}</button>
    </nav>
    <div class="search">
      <input
        v-model="q"
        type="search"
        placeholder="Поиск по методичке: Корвин, Мазки, ловушки…"
        aria-label="Поиск"
        @input="onSearch"
      >
    </div>
    <button
      class="chip-btn"
      :aria-pressed="String(!!state.players)"
      title="Скрывает тайны и заметки, чтобы можно было показать экран игрокам"
      @click="state.players = !state.players"
    >Экран для игроков</button>
    <span class="save-state" aria-live="polite">{{ saveStatus }}</span>
  </header>
</template>
