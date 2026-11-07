<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { sections, byId } from '../content.js'
import { state, noteText, setNote } from '../store.js'

const route = useRoute()

const section = computed(() => (route.name === 'section' ? byId[route.params.id] : null))
const noteKey = computed(() => (section.value ? section.value.key : 'general'))
const title = computed(() => (section.value ? section.value.disp : 'Общие заметки кампании'))

const text = computed({
  get: () => noteText(noteKey.value),
  set: (v) => setNote(noteKey.value, v),
})

const recent = computed(() =>
  sections
    .filter((s) => noteText(s.key).trim())
    .sort((a, b) => (state.notes[b.key].updatedAt || 0) - (state.notes[a.key].updatedAt || 0))
    .slice(0, 8),
)
</script>

<template>
  <aside class="notes" aria-label="Заметки мастера">
    <h3>Заметки к разделу</h3>
    <div class="for">{{ title }}</div>
    <textarea
      v-model="text"
      aria-label="Текст заметки"
      placeholder="Что случилось на сессии, что поменять, что игроки уже знают…"
    ></textarea>
    <div class="hint">Сохраняется автоматически в этом браузере. Резервная копия — во вкладке «Инструменты».</div>
    <div v-if="recent.length" class="recent">
      <div class="hint">Заметки есть в разделах:</div>
      <RouterLink v-for="s in recent" :key="s.id" :to="{ name: 'section', params: { id: s.id } }">{{ s.disp }}</RouterLink>
    </div>
  </aside>
</template>

<style scoped>
.recent a { display: block; padding: 3px 0; text-decoration: none; }
</style>
