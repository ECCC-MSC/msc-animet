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
