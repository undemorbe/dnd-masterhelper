<script setup>
import { computed, reactive, ref } from 'vue'
import { state, saveEntry, deleteEntry } from '../store.js'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const list = computed(() =>
  [...state.journal].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0)),
)

const form = reactive({ title: '', date: today(), text: '' })
function add() {
  const title = form.title.trim()
  if (!title) return
  saveEntry({ id: 'e' + Date.now().toString(36), title, date: form.date || today(), text: form.text, createdAt: Date.now() })
  Object.assign(form, { title: '', date: today(), text: '' })
}

const editing = ref(null)
const draft = reactive({ title: '', date: '', text: '' })
function edit(en) {
  editing.value = en.id
  confirmDel.value = null
  Object.assign(draft, { title: en.title, date: en.date || '', text: en.text || '' })
}
function save(en) {
  saveEntry({ ...en, ...draft })
  editing.value = null
}

const confirmDel = ref(null)
function remove(id) {
  deleteEntry(id)
  confirmDel.value = null
}
</script>

<template>
  <div class="crumbs">Журнал сессий</div>
  <h1>Журнал</h1>
  <form class="form" @submit.prevent="add">
    <div class="row">
      <input v-model="form.title" class="inp" placeholder="Название сессии, например «Разделённый холст»" aria-label="Название сессии" required>
      <input v-model="form.date" class="inp" type="date" aria-label="Дата" style="flex:0 1 170px">
    </div>
    <textarea v-model="form.text" aria-label="Что произошло" placeholder="Что произошло, какие решения приняли игроки, какие крючки остались открытыми…"></textarea>
    <div class="row"><button class="btn primary" type="submit">Добавить запись</button></div>
  </form>

  <p v-if="!list.length" class="empty">
    Записей пока нет. Добавьте первую после ближайшей сессии: так будет проще вспомнить, на чём остановились.
  </p>
  <article v-for="en in list" :key="en.id" class="entry">
    <form v-if="editing === en.id" class="form" @submit.prevent="save(en)">
      <div class="row">
        <input v-model="draft.title" class="inp" aria-label="Название сессии" required>
        <input v-model="draft.date" class="inp" type="date" aria-label="Дата" style="flex:0 1 170px">
      </div>
      <textarea v-model="draft.text" aria-label="Текст записи"></textarea>
      <div class="row">
        <button class="btn primary" type="submit">Сохранить</button>
        <button class="btn" type="button" @click="editing = null">Отмена</button>
      </div>
    </form>
    <template v-else>
      <header><span class="date">{{ en.date }}</span><h4>{{ en.title }}</h4></header>
      <div class="txt">{{ en.text }}</div>
      <div class="actions">
        <button class="btn small" type="button" @click="edit(en)">Изменить</button>
        <template v-if="confirmDel === en.id">
          <span class="hint">Удалить запись?</span>
          <button class="btn small danger" type="button" @click="remove(en.id)">Да, удалить</button>
          <button class="btn small" type="button" @click="confirmDel = null">Нет</button>
        </template>
        <button v-else class="btn small" type="button" @click="confirmDel = en.id">Удалить</button>
      </div>
    </template>
  </article>
</template>

<style scoped>
.actions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
</style>
