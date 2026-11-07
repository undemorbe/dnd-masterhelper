<script setup>
import { ref, watch, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { state } from './store.js'
import TopBar from './components/TopBar.vue'
import SectionRail from './components/SectionRail.vue'
import NotesPanel from './components/NotesPanel.vue'

const route = useRoute()
const railOpen = ref(false)

watch(() => route.fullPath, () => { railOpen.value = false })

// Режим «Экран для игроков» прячет тайны и заметки.
watchEffect(() => document.body.classList.toggle('players', !!state.players))
</script>

<template>
  <TopBar @toggle-rail="railOpen = !railOpen" />
  <div class="app">
    <SectionRail :class="{ open: railOpen }" />
    <button v-if="railOpen" class="rail-backdrop" aria-label="Закрыть список разделов" @click="railOpen = false" />
    <main id="main">
      <div class="page">
        <RouterView />
      </div>
    </main>
    <NotesPanel />
  </div>
</template>
