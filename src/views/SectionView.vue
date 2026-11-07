<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { sections, byId } from '../content.js'
import { state, togglePin } from '../store.js'
import RichHtml from '../components/RichHtml.vue'

const props = defineProps({ id: { type: String, required: true } })
const route = useRoute()

const s = computed(() => byId[props.id])
const idx = computed(() => sections.indexOf(s.value))
const prev = computed(() => sections[idx.value - 1])
const next = computed(() => sections[idx.value + 1])
const pinned = computed(() => (state.prefs.pinned || []).includes(props.id))
const highlight = computed(() => String(route.query.hl || ''))

function scrollTo(anchor) {
  document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <template v-if="s">
    <div class="crumbs">{{ s.group }} · раздел {{ s.n }}</div>
    <h1>{{ s.disp }}</h1>
    <div class="page-actions">
      <button class="btn small" type="button" @click="togglePin(s.id)">{{ pinned ? '★ Открепить' : '☆ Закрепить' }}</button>
      <RouterLink v-if="prev" class="btn small" :to="{ name: 'section', params: { id: prev.id } }">← {{ prev.disp }}</RouterLink>
      <RouterLink v-if="next" class="btn small" :to="{ name: 'section', params: { id: next.id } }">{{ next.disp }} →</RouterLink>
    </div>
    <nav v-if="s.toc.length > 2" class="otoc">
      <b>На странице</b>
      <a v-for="[anchor, label] in s.toc" :key="anchor" :href="'#/' + s.id" @click.prevent="scrollTo(anchor)">{{ label }}</a>
    </nav>
    <RichHtml tag="article" :html="s.html" :highlight="highlight" />
  </template>
</template>

<style scoped>
.page-actions .btn { text-decoration: none; color: inherit; }
</style>
