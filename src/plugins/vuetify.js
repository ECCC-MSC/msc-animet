import "@mdi/font/css/materialdesignicons.css";
import Vue from "vue";
import Vuetify from "vuetify/lib";

const locales = {
  en: require("vuetify/es5/locale/en"),
  fr: require("vuetify/es5/locale/fr"),
};

const current = navigator.language.split("-")[0];

Vue.use(Vuetify);

export default new Vuetify({
  locales,
  current,
  icons: {
    iconfont: "mdi",
  },
  theme: {
    dark: false,
    themes: {
      dark: {
        primary: "#1689E7",
        accent: "#4CBB99",
        secondary: "#7BC6FF",
        success: "#4CAF50",
        info: "#2196F3",
        warning: "#FB8C00",
        error: "#FF5252",
      },
      light: {
        primary: "#1689E7",
        accent: "#4CBB99",
        secondary: "#7BC6FF",
        success: "#4CAF50",
        info: "#2196F3",
        warning: "#FB8C00",
        error: "#FF5252",
      },
    },
  },
});
