<template>
  <div id="animet_logo" :class="getLangCSS">
    <span class="animet">{{ $t("MSCAnimet") }}</span>
    <transition-group tag="span" name="fade" class="img-transition">
      <img
        v-if="$i18n.locale === 'fr'"
        key="fr"
        id="eccc_logo_fr"
        :src="img"
        alt="Logo d'Environnement et Changement climatique Canada"
      />
      <img
        v-else
        key="en"
        id="eccc_logo_en"
        :src="img"
        alt="Logo of Environment and Climate Change Canada"
      />
    </transition-group>
  </div>
</template>

<script>
export default {
  computed: {
    img() {
      const locale = this.$i18n.locale;
      const isFirefox = window.navigator.userAgent.indexOf("Firefox") !== -1;
      const extension = isFirefox ? "png" : "svg";
      return new URL(`../../assets/eccc_c_${locale}.${extension}`, import.meta.url).href;
    },
    getLangCSS() {
      return {
        width_en: this.$i18n.locale === "en",
        width_fr: this.$i18n.locale === "fr",
      };
    },
  },
};
</script>

<style scoped>
.animet {
  padding-left: 10px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
.img-transition {
  margin-bottom: 20px;
  margin-left: 10px;
}
.width_en {
  width: 314px;
}
.width_fr {
  width: 380px;
}
#animet_logo {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: black;
  margin: auto;
  background: rgba(255, 255, 255, 0.5);
  text-shadow: 2px 2px 2px rgba(0, 0, 0, 0.5);
  font-family: sans-serif;
  letter-spacing: normal;
  font-size: 1.4rem;
  border-radius: 15px;
  white-space: nowrap;
  pointer-events: auto;
  position: relative;
  z-index: 2;
}
#eccc_logo_en {
  height: 22px;
  width: 171px;
  padding-right: 10px;
  object-fit: cover;
  object-position: 0 100%;
  position: absolute;
}
#eccc_logo_fr {
  height: 22px;
  width: 206px;
  padding-right: 10px;
  object-fit: cover;
  object-position: 0 100%;
  position: absolute;
}
</style>
