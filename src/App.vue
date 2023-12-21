<template>
  <v-app>
    <router-view />
  </v-app>
</template>

<script>
export default {
  name: "App",
  created() {
    const locale = navigator.language.split("-")[0];
    const lang = locale === "fr" ? "fr" : "en";
    this.$store.dispatch("Layers/setLang", lang);
    this.$i18n.locale = lang;
    this.$vuetify.current = lang;
    document.title = "MSC AniMet";
  },
};
</script>

<style lang="scss">
html {
  overflow-y: hidden !important;
}
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
/* Track */
::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}
/* Handle */
::-webkit-scrollbar-thumb {
  background: #99ddff;
  border-radius: 10px;
}
/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
  background: #00aaff;
}
</style>
