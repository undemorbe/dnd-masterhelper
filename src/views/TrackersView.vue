<script setup>
import { computed } from 'vue'
import { state } from '../store.js'
import { EMOTIONS, WORDS, ARTS, WORD_STATES, WORD_LABELS, ART_STATES, ART_LABELS, OPTIONS } from '../trackers.js'
import PipScale from '../components/PipScale.vue'

const T = computed(() => state.trackers)
const cleanWords = computed(() => Object.values(T.value.words).filter((x) => x === 'clean').length)

const cycle = (list, cur) => list[(list.indexOf(cur) + 1) % list.length]
const nextArt = (a) => { T.value.arts[a] = cycle(ART_STATES, T.value.arts[a]) }
const nextWord = (w) => { T.value.words[w] = cycle(WORD_STATES, T.value.words[w]) }

const HEROES = [
  { id: 'estel', name: 'Эстел', sub: 'Табакси, плут' },
  { id: 'velissa', name: 'Велисса', sub: 'Фея, колдун · носитель Желания' },
  { id: 'uma', name: 'Ума', sub: 'Фэйри, мистический рыцарь' },
]
</script>

<template>
  <div class="crumbs">Состояние кампании</div>
  <h1>Трекеры</h1>
  <div class="hint" style="margin-bottom:12px">
    Всё сохраняется автоматически. Клик по делению ставит значение, повторный клик по последнему делению убавляет на одно.
  </div>
  <div class="grid">
    <section class="card">
      <h3>Где мы</h3>
      <div class="trow">
        <label for="tAct">Акт</label>
        <select id="tAct" v-model="T.act" class="inp"><option v-for="a in OPTIONS.act" :key="a">{{ a }}</option></select>
      </div>
      <div class="trow">
        <label for="tLoc">Локация</label>
        <input id="tLoc" v-model="T.location" class="inp">
      </div>
    </section>

    <section class="card">
      <h3>Часы и шкалы</h3>
      <div class="trow"><label>Часы Холста</label><PipScale v-model="T.clocks.canvas" :max="6" label="Часы Холста" /></div>
      <div class="trow"><label>Часы Культа</label><PipScale v-model="T.clocks.cult" :max="8" color="red" label="Часы Культа" /></div>
      <div class="trow"><label>Страх нарисованных</label><PipScale v-model="T.clocks.fear" :max="5" color="red" label="Страх нарисованных" /></div>
      <div class="trow"><label>Последнее блюдо (ночи)</label><PipScale v-model="T.clocks.feast" :max="3" color="gold" label="Последнее блюдо" /></div>
      <div class="trow"><label>Флакон краски</label><PipScale v-model="T.flask" :max="5" color="gold" label="Флакон краски" /></div>
      <div class="legend">Часы Холста полны → Ночь Перекраски. Каждые 2 деления Часов Культа — культ забирает артефакт.</div>
    </section>

    <section class="card">
      <h3>Артефакты ритуала</h3>
      <div class="chips">
        <button v-for="a in ARTS" :key="a" type="button" class="chip" :data-s="T.arts[a]" @click="nextArt(a)">
          {{ a }}: {{ ART_LABELS[T.arts[a]] }}
        </button>
      </div>
      <div class="legend">Клик меняет: не найден → у героев → у культа.</div>
    </section>

    <section class="card">
      <h3>Слова Вести <span class="val">{{ cleanWords }}/10 чисто</span></h3>
      <div class="chips">
        <button v-for="[e, w] in WORDS" :key="e" type="button" class="chip" :data-s="T.words[e]" :title="e" @click="nextWord(e)">
          «{{ w }}» · {{ WORD_LABELS[T.words[e]] }}
        </button>
      </div>
      <div class="legend">Клик меняет: нет → надтреснуто → чисто → у врага.</div>
    </section>

    <section v-for="h in HEROES" :key="h.id" class="card">
      <h3>{{ h.name }}</h3>
      <div class="sub">{{ h.sub }}</div>
      <div class="trow"><label>Мазки</label><PipScale v-model="T.pcs[h.id].mazki" :max="6" :label="`${h.name}: Мазки`" /></div>

      <template v-if="h.id === 'estel'">
        <div class="trow">
          <label for="tSeal">Печать</label>
          <select id="tSeal" v-model="T.pcs.estel.seal" class="inp"><option v-for="a in OPTIONS.seal" :key="a">{{ a }}</option></select>
        </div>
        <div class="trow"><label>Оттепель</label><PipScale v-model="T.pcs.estel.thaw" :max="5" color="gold" label="Оттепель" /></div>
      </template>

      <div v-if="h.id === 'velissa'" class="trow">
        <label for="tVch">Незаконченность</label>
        <select id="tVch" v-model="T.pcs.velissa.choice" class="inp"><option v-for="a in OPTIONS.velissa" :key="a">{{ a }}</option></select>
      </div>

      <template v-if="h.id === 'uma'">
        <div class="trow"><label>Недоверие командования</label><PipScale v-model="T.pcs.uma.distrust" :max="4" color="red" label="Недоверие командования" /></div>
        <div class="trow"><label>Спасённые дети</label><PipScale v-model="T.pcs.uma.kids" :max="3" color="gold" label="Спасённые дети" /></div>
        <div class="trow">
          <label for="tRank">Звание</label>
          <select id="tRank" v-model="T.pcs.uma.rank" class="inp"><option v-for="a in OPTIONS.rank" :key="a">{{ a }}</option></select>
        </div>
      </template>

      <details>
        <summary class="hint">Отголоски эмоций</summary>
        <div class="echo">
          <template v-for="m in EMOTIONS" :key="m">
            <span>{{ m }}</span>
            <PipScale
              :model-value="T.pcs[h.id].echo[m] || 0"
              :max="3"
              color="violet"
              :show-value="false"
              :label="`${h.name}: ${m}`"
              @update:model-value="(v) => (T.pcs[h.id].echo[m] = v)"
            />
          </template>
        </div>
      </details>
    </section>

    <section class="card">
      <h3>Тесори и Узы</h3>
      <div class="trow">
        <label for="tTes">Тесори</label>
        <select id="tTes" v-model="T.pcs.tesori.status" class="inp"><option v-for="a in OPTIONS.tesori" :key="a">{{ a }}</option></select>
      </div>
      <div class="trow">
        <label for="tPor">Групповой портрет</label>
        <select id="tPor" v-model="T.bonds.portrait" class="inp"><option v-for="a in OPTIONS.portrait" :key="a">{{ a }}</option></select>
      </div>
      <div class="trow"><label>Эстел ↔ Велисса «Ключ»</label><PipScale v-model="T.bonds.ev" :max="3" color="gold" label="Ключ" /></div>
      <div class="trow"><label>Велисса ↔ Ума «Щит и тень»</label><PipScale v-model="T.bonds.vu" :max="3" color="gold" label="Щит и тень" /></div>
      <div class="trow"><label>Ума ↔ Эстел «Вперёд!»</label><PipScale v-model="T.bonds.ue" :max="3" color="gold" label="Вперёд!" /></div>
    </section>
  </div>
</template>
