import { createRouter, createWebHistory } from 'vue-router/auto'

import Home from '@/views/Home.vue'
import MultiDisplay from '@/views/MultiDisplay.vue'
import NotFound from '@/views/NotFound.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
    props: (route) => ({
      layers: route.query.layers,
      extent: route.query.extent,
      color: route.query.color,
      basemap: route.query.basemap,
      proj: route.query.proj,
      grat: route.query.grat,
    }),
  },
  {
    path: '/:number(1|2|3|4)-displays',
    name: 'MultiDisplay',
    component: MultiDisplay,
    props: (route) => ({
      disp: route.query.disp,
    }),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL),
  routes: routes,
})

router.beforeEach((to, from, next) => {
  // Normalize the path by removing multiple slashes
  const cleanedPath = to.path.replace(/\/\/+/g, '/')
  const cleanedFullPath = to.fullPath.replace(/\/\/+/g, '/')
  let newPath
  if (cleanedPath === '/') {
    newPath = cleanedFullPath
  } else {
    newPath = cleanedFullPath.replace(cleanedPath, '')
  }

  if (cleanedPath !== to.path) {
    next({ path: newPath, replace: true })
  } else {
    next()
  }
})

// Workaround for https://github.com/vitejs/vite/issues/11804
router.onError((err, to) => {
  if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
    if (!localStorage.getItem('vuetify:dynamic-reload')) {
      console.log('Reloading page to fix dynamic import error')
      localStorage.setItem('vuetify:dynamic-reload', 'true')
      location.assign(to.fullPath)
    } else {
      console.error('Dynamic import error, reloading page did not fix it', err)
    }
  } else {
    console.error(err)
  }
})

router.isReady().then(() => {
  localStorage.removeItem('vuetify:dynamic-reload')
})

export default router
