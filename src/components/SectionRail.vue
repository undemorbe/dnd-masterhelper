<script setup>
import { computed, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { sections, groups, byId, defaultSectionId } from '../content.js'
import { state, noteText } from '../store.js'

const route = useRoute()

const currentId = computed(() => (route.name === 'section' ? route.params.id : state.last))
const pinned = computed(() => (state.prefs.pinned || []).filter((id) => byId[id]).map((id) => byId[id]))
const byGroup = Object.fromEntries(groups.map((g) => [g, sections.filter((s) => s.group === g)]))

// Открытые группы запоминаются; группа текущего раздела раскрывается сама.
const open = reactive(new Set())
watch(currentId, (id) => open.add((byId[id] || byId[defaultSectionId]).group), { immediate: true })

function onToggle(g, e) {
  if (e.target.open) open.add(g)
  else open.delete(g)
}
</script>

<template>
  <aside class="rail" aria-label="Разделы методички">
    <template v-if="pinned.length">
      <div class="pinned-head">Закреплено</div>
      <RouterLink
        v-for="s in pinned"
        :key="'p' + s.id"
        class="nav-item"
        :to="{ name: 'section', params: { id: s.id } }"
        :aria-current="s.id === currentId ? 'true' : null"
      >
        <span class="num">{{ s.n }}</span><span>{{ s.disp }}</span><span class="pin" aria-hidden="true">★</span>
      </RouterLink>
    </template>
    <details v-for="g in groups" :key="g" :open="open.has(g)" @toggle="onToggle(g, $event)">
      <summary>{{ g }} <span class="count">{{ byGroup[g].length }}</span></summary>
      <RouterLink
        v-for="s in byGroup[g]"
        :key="s.id"
        class="nav-item"
        :to="{ name: 'section', params: { id: s.id } }"
        :aria-current="s.id === currentId ? 'true' : null"
      >
        <span class="num">{{ s.n }}</span><span>{{ s.disp }}</span>
        <span v-if="noteText(s.key).trim()" class="dot" title="Есть заметка"></span>
      </RouterLink>
    </details>
  </aside>
</template>

<style scoped>
.nav-item { text-decoration: none; }
</style>
