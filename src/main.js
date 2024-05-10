import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import i18n from "./plugins/i18n";
import vuetify from "./plugins/vuetify";

Vue.prototype.$mapLayers = Vue.observable({ arr: [] });
Vue.prototype.$mapCanvas = Vue.observable({ mapObj: {} });
Vue.prototype.$animationCanvas = Vue.observable({ mapObj: {} });
Vue.config.productionTip = false;

const originalConsoleError = console.error;
function customLog(message) {
  // OpenLayers added an annoying console.error everytime a WMS request
  // returns XML even if it's handled so this code is there to silence it
  if (message.message !== "The source image cannot be decoded.")
    originalConsoleError(message);
}
console.error = customLog;

const ct = require("countries-and-timezones");
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const country = ct.getCountryForTimezone(timeZone);
if (country === null) {
  Vue.prototype.$countryCode = null;
} else {
  Vue.prototype.$countryCode = country.id;
}

new Vue({
  router,
  store,
  i18n,
  vuetify,
  render: (h) => h(App),
}).$mount("#app");
