export const EMOTIONS = ['Тоска', 'Скрытность', 'Зависть', 'Обжорство', 'Гнев', 'Страх', 'Гордыня', 'Оцепенение', 'Желание', 'Нежность']

export const WORDS = [
  ['Тоска', 'Вы'], ['Скрытность', 'несовершенны'], ['Нежность', 'и'], ['Страх', 'поэтому'], ['Желание', 'живы'],
  ['Гордыня', 'Совершенное'], ['Зависть', 'не'], ['Обжорство', 'меняется'], ['Гнев', 'Неизменное'], ['Оцепенение', 'мертво'],
]

export const ARTS = ['Картина', 'Фотография', 'Записи', 'Клетка со зверьком', 'Кинжал']

export const WORD_STATES = ['none', 'cracked', 'clean', 'enemy']
export const WORD_LABELS = { none: 'нет', cracked: 'надтреснуто', clean: 'чисто', enemy: 'у врага' }
export const ART_STATES = ['none', 'party', 'cult']
export const ART_LABELS = { none: 'не найден', party: 'у героев', cult: 'у культа' }

export const OPTIONS = {
  act: ['Акт I', 'Акт II', 'Акт III', 'Акт IV', 'Акт V', 'Эпилог'],
  seal: ['Тихая', 'Зуд', 'Жжение', 'Зов', 'Снята', 'Перешла Гневом'],
  velissa: ['Не решено', 'Закончил Сайлас', 'Закончила сама', 'Осталась незаконченной', 'Вернула Желание', 'Перетканная', 'Похищена культом'],
  rank: ['Лейтенант', 'Старший лейтенант', 'Капитан', 'Лишена звания'],
  tesori: ['В Картине', 'В партии', 'Враг (суд проигран)', 'Свободен от Осириса', 'Погиб'],
  portrait: ['Не создан', '«Чужие»', 'Назван партией'],
}

export function trackerDefaults() {
  return {
    act: 'Акт I',
    location: 'Мастерская художника',
    clocks: { canvas: 0, cult: 0, fear: 0, feast: 0 },
    flask: 5,
    words: Object.fromEntries(WORDS.map((w) => [w[0], 'none'])),
    arts: Object.fromEntries(ARTS.map((a) => [a, 'none'])),
    pcs: {
      estel: { mazki: 0, seal: 'Тихая', thaw: 0, echo: {} },
      velissa: { mazki: 2, choice: 'Не решено', echo: {} },
      uma: { mazki: 0, distrust: 0, kids: 0, rank: 'Лейтенант', echo: {} },
      tesori: { status: 'В Картине' },
    },
    bonds: { ev: 0, vu: 0, ue: 0, portrait: 'Не создан' },
  }
}

// Дополняет сохранённое состояние недостающими полями (после обновлений сайта).
export function mergeTrackers(v) {
  const d = trackerDefaults()
  if (!v || typeof v !== 'object') return d
  const src = JSON.parse(JSON.stringify(v))
  const out = Object.assign(d, src)
  for (const k of ['clocks', 'words', 'arts', 'bonds']) out[k] = Object.assign(trackerDefaults()[k], src[k] || {})
  out.pcs = Object.assign(trackerDefaults().pcs, src.pcs || {})
  for (const p of Object.keys(trackerDefaults().pcs)) {
    out.pcs[p] = Object.assign(trackerDefaults().pcs[p], (src.pcs || {})[p] || {})
  }
  return out
}
