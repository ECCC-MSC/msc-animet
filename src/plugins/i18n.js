import Vue from "vue";
import VueI18n from "vue-i18n";

Vue.use(VueI18n);

// Translated messages/strings
const messages = {
  en: {
    ...require("../locales/en/common.json"),
    ...require("../locales/en/layers.json"),
  },
  fr: {
    ...require("../locales/fr/common.json"),
    ...require("../locales/fr/layers.json"),
  },
};

// Default locale based on brwoser settings
let locale = navigator.language.split("-")[0];

export default new VueI18n({
  fallbackLocale: "en",
  locale,
  messages,
  silentFallbackWarn: true,
});
