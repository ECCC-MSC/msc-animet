<template>
  <v-footer padless bottom absolute max-height="55">
    <v-container fluid>
      <v-row>
        <v-col class="text-no-wrap">
          <span class="text-caption text--primary">{{ $t("MSCAnimet") }}</span>
          <v-chip small label outlined color="info" class="ml-1">{{ version }}</v-chip>
        </v-col>
        <v-spacer />
        <v-col class="text-right">
          <img
            id="eccc_logo"
            :class="{ white: $vuetify.theme.dark }"
            :src="img"
            height="30"
          />
        </v-col>
      </v-row>
    </v-container>
  </v-footer>
</template>

<script>
import { version } from "../../package.json";
export default {
  mounted() {
    this.img = require(`../assets/eccc_c_${this.$i18n.locale}.${
      window.navigator.userAgent.indexOf("Firefox") != -1 ? "png" : "svg"
    }`);
  },
  data() {
    return {
      version: version,
      img: null,
    };
  },
};
</script>
