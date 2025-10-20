<template>
  <div id="lang-sel">
    <v-btn
      size="34"
      class="rounded-circle font-weight-bold lang-size"
      @click="changeLang"
      :disabled="isAnimating && playState !== 'play'"
    >
      {{ this.getFlagLang }}
    </v-btn>
  </div>
</template>

<script>
export default {
  inject: ['store'],
  methods: {
    changeLang() {
      if (this.$i18n.locale === 'en') {
        this.store.setLang('fr')
        this.$i18n.locale = 'fr'
      } else {
        this.store.setLang('en')
        this.$i18n.locale = 'en'
      }
      localStorage.setItem('user-lang', this.$i18n.locale)
      this.emitter.emit('localeChange')
    },
  },
  computed: {
    isAnimating() {
      return this.store.getIsAnimating
    },
    playState() {
      return this.store.getPlayState
    },
    getFlagLang() {
      if (this.$i18n.locale === 'fr') {
        return 'EN'
      } else {
        return 'FR'
      }
    },
  },
}
</script>
<style scoped>
.lang-size {
  font-size: 16px;
}
#lang-sel {
  pointer-events: auto;
  z-index: 4;
}
</style>
