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
  data() {
    return {
      channel: new BroadcastChannel('language-channel'),
    }
  },
  mounted() {
    this.channel.addEventListener('message', this.checkLang)
    this.channel.postMessage({ type: 'get-language' })
  },
  beforeUnmount() {
    this.channel.removeEventListener('message', this.checkLang)
    this.channel.close()
  },
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
    checkLang(event) {
      if (event.data.type === 'language-change') {
        const requestedLang = event.data.language
        const currentLang = this.$i18n.locale

        if (requestedLang !== currentLang) {
          this.changeLang()
        }
      }
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
