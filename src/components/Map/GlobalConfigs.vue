<template>
  <v-container fluid id="global_configs">
    <v-row class="align-center ma-0 justify-space-between">
      <v-col cols="0" lg="4" class="pa-0"></v-col>
      <v-col cols="12" lg="4" class="pa-0 pt-2" v-show="!getHidden.title">
        <animet-logo />
      </v-col>
      <v-col
        cols="12"
        lg="4"
        class="d-flex pa-0 pt-2 justify-center align-center"
      >
        <v-spacer v-if="$vuetify.breakpoint.lgAndUp"></v-spacer>
        <legend-selector class="mr-3" v-show="!getHidden.topMenus" />
        <map-customization class="mr-3" v-show="!getHidden.topMenus" />
        <page-theme class="mr-3" v-show="!getHidden.topMenus" />
        <language-select class="mr-3" v-show="!getHidden.topMenus" />
        <perma-link class="mr-3" v-show="!getHidden.topMenus" />
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              min-width="34px"
              width="34px"
              height="34px"
              class="rounded-circle info-btn"
              v-bind="attrs"
              v-on="on"
              :href="$t('DocumentationURL')"
              target="_blank"
              v-show="!getHidden.topMenus"
            >
              <v-icon> mdi-information-outline </v-icon>
            </v-btn>
          </template>
          <span>{{ $t("UserDoc") }}</span>
        </v-tooltip>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import AnimetLogo from "../GlobalConfigs/AnimetLogo.vue";
import LanguageSelect from "../GlobalConfigs/LanguageSelect.vue";
import LegendSelector from "../GlobalConfigs/LegendSelector.vue";
import MapCustomization from "../GlobalConfigs/MapCustomization.vue";
import PageTheme from "../GlobalConfigs/PageTheme.vue";
import PermaLink from "../GlobalConfigs/Share/PermaLink.vue";

import { mapGetters } from "vuex";

export default {
  components: {
    AnimetLogo,
    LanguageSelect,
    LegendSelector,
    MapCustomization,
    PageTheme,
    PermaLink,
  },
  computed: {
    ...mapGetters("Layers", ["getHidden"]),
  },
};
</script>

<style scoped>
.info-btn {
  pointer-events: auto;
  z-index: 4;
}
#global_configs {
  padding: 0 0.5em 0 0.5em;
  pointer-events: none !important;
  position: absolute;
}
</style>
