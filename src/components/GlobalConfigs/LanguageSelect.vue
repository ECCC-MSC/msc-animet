<template>
  <div id="lang-sel">
    <v-btn
      min-width="34px"
      width="34px"
      height="34px"
      class="rounded-circle font-weight-bold"
      @click="changeLang"
      :disabled="isAnimating"
    >
      {{ this.getFlagLang }}
    </v-btn>
  </div>
</template>

<script>
import { mapState } from "vuex";

export default {
  methods: {
    changeLang() {
      if (this.$i18n.locale === "en") {
        this.$store.dispatch("Layers/setLang", "fr");
        this.$i18n.locale = "fr";
        this.$vuetify.current = "fr";
      } else {
        this.$store.dispatch("Layers/setLang", "en");
        this.$i18n.locale = "en";
        this.$vuetify.current = "en";
      }
      this.$root.$emit("localeChange");
    },
  },
  computed: {
    ...mapState("Layers", ["isAnimating"]),
    getFlagLang() {
      if (this.$i18n.locale === "fr") {
        return "EN";
      } else {
        return "FR";
      }
    },
  },
};
</script>
<style scoped>
#lang-sel {
  pointer-events: auto;
  z-index: 4;
}
</style>
