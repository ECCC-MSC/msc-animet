<template>
  <v-app>
    <AppBar />
    <router-view class="pb-12" />
    <AppFooter />
  </v-app>
</template>

<script>
import AppBar from './components/AppBar.vue'
import AppFooter from './components/AppFooter.vue'

export default {
  name: 'App',
  components: {
    AppBar,
    AppFooter
  },
  created () {
    let locale = navigator.language.split('-')[0]
    this.$store.dispatch('Layers/setLang', locale)
    this.$i18n.locale = locale
    this.$vuetify.current = locale
    document.title = 'MSC AniMet'
  }
}
</script>

<style lang="scss">
html {
  overflow-y: scroll; /* Always show vertical scrollbar */
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
