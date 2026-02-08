import { registerPlugins } from '@/plugins'
import { useStore } from '@/stores/store'

import mitt from 'mitt'
import * as ct from 'countries-and-timezones'

import App from './App.vue'

import { createApp, reactive } from 'vue'

const emitter = mitt()
const app = createApp(App)

registerPlugins(app)
const store = useStore()
app.provide('store', store)
app.provide('emitter', emitter)

const mapLayers = reactive({ arr: [] })
const mapCanvas = reactive({ mapObj: {} })
const animationCanvas = reactive({ mapObj: {} })

app.provide('mapLayers', mapLayers)
app.provide('mapCanvas', mapCanvas)
app.provide('animationCanvas', animationCanvas)

app.config.globalProperties.$mapLayers = mapLayers
app.config.globalProperties.$mapCanvas = mapCanvas
app.config.globalProperties.$animationCanvas = animationCanvas

app.config.globalProperties.emitter = emitter

const originalConsoleError = console.error
console.error = function (firstArg) {
  // OpenLayers adds console.error for WMS XML responses - ignore these
  if (!(firstArg instanceof DOMException)) {
    Function.prototype.apply.call(originalConsoleError, console, arguments)
  }
}

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
const country = ct.getCountryForTimezone(timeZone)

app.config.globalProperties.$timeZone = reactive({ id: timeZone })
if (country === null) {
  app.config.globalProperties.$countryCode = reactive({ id: null })
} else {
  app.config.globalProperties.$countryCode = reactive({ id: country.id })
}
app.config.globalProperties.$ct = ct

app.mount('#app')
