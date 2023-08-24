import Vue from "vue";
import VueI18n from "vue-i18n";

import localeData from "../locales/importLocaleFiles";

Vue.use(VueI18n);
let en = { ...require("../locales/en/common.json") };
for (const src in localeData["enLocaleData"]) {
  Object.assign(en, localeData["enLocaleData"][src]);
}
let fr = { ...require("../locales/fr/common.json") };
for (const src in localeData["frLocaleData"]) {
  Object.assign(fr, localeData["frLocaleData"][src]);
}
// Translated messages/strings
const messages = {
  en: en,
  fr: fr,
};

// Default locale based on brwoser settings
let locale = navigator.language.split("-")[0];

export default new VueI18n({
  fallbackLocale: "en",
  locale,
  messages,
  silentFallbackWarn: true,
});
