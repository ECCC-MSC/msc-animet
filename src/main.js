import { registerPlugins } from '@/plugins'
import { useStore } from '@/stores/store'

import mitt from 'mitt'
import * as ct from 'countries-and-timezones'

import App from './App.vue'

import { createApp, reactive } from 'vue'

const emitter = mitt()
const app = createApp(App)

registerPlugins(app)
app.provide('store', useStore())

app.config.globalProperties.$mapLayers = reactive({ arr: [] })
app.config.globalProperties.$mapCanvas = reactive({ mapObj: {} })
app.config.globalProperties.$animationCanvas = reactive({ mapObj: {} })

app.config.globalProperties.emitter = emitter

const originalConsoleError = console.error
function customLog(message) {
  // OpenLayers added an annoying console.error everytime a WMS request
  // returns XML even if it's handled so this code is there to silence it
  if (!(message instanceof DOMException)) originalConsoleError(message)
}
console.error = customLog

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
