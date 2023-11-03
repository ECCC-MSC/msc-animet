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

const ct = require("countries-and-timezones");
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const countryCode = ct.getCountryForTimezone(timeZone).id;

Vue.prototype.$countryCode = countryCode;

new Vue({
  router,
  store,
  i18n,
  vuetify,
  render: (h) => h(App),
}).$mount("#app");
