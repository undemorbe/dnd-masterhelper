import { createRouter, createWebHashHistory } from 'vue-router'
import { byId, defaultSectionId } from './content.js'
import { state } from './store.js'
import SectionView from './views/SectionView.vue'
import SearchView from './views/SearchView.vue'
import TrackersView from './views/TrackersView.vue'
import JournalView from './views/JournalView.vue'
import ToolsView from './views/ToolsView.vue'

// Hash-маршруты (#/s12, #/track…) работают на GitHub Pages без серверных перенаправлений.
const routes = [
  { path: '/', redirect: () => ({ name: 'section', params: { id: byId[state.last] ? state.last : defaultSectionId } }) },
  { path: '/:id(s\\d+)', name: 'section', component: SectionView, props: true },
  { path: '/search', name: 'search', component: SearchView },
  { path: '/track', name: 'track', component: TrackersView },
  { path: '/journal', name: 'journal', component: JournalView },
  { path: '/tools', name: 'tools', component: ToolsView },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  if (to.name === 'section' && !byId[to.params.id]) return { name: 'section', params: { id: defaultSectionId } }
})

router.afterEach((to) => {
  if (to.name === 'section') state.last = to.params.id
})

export default router
