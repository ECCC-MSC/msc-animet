<template>
  <v-col class="flex-shrink-1 flex-grow-0 pl-0">
    <div v-if="screenWidth >= 565">
      <v-select
        class="interval"
        :label="$t('TimestepsDropdown')"
        v-model="selection"
        hide-details
        :items="getUniqueTimestepsList"
        :disabled="getUniqueTimestepsList.length === 0 || isAnimating"
        @input="changeMapStep(selection)"
      >
        <template v-slot:item="{ item }">
          {{ formatDuration(item) }}
        </template>
        <template v-slot:selection="{ item }">
          {{ formatDuration(item) }}
        </template>
      </v-select>
      <locale-selector />
    </div>
    <v-row class="justify-space-between pt-0 second-row" v-else>
      <v-select
        class="interval"
        :label="$t('TimestepsDropdown')"
        v-model="selection"
        hide-details
        :items="getUniqueTimestepsList"
        :disabled="getUniqueTimestepsList.length === 0 || isAnimating"
        @input="changeMapStep(selection)"
      >
        <template v-slot:item="{ item }">
          {{ formatDuration(item) }}
        </template>
        <template v-slot:selection="{ item }">
          {{ formatDuration(item) }}
        </template>
      </v-select>
      <v-col cols="5">
        <locale-selector class="small-locale" />
      </v-col>
    </v-row>
  </v-col>
</template>

<script>
import { Duration } from "luxon";
import { mapGetters, mapState } from "vuex";

import LocaleSelector from "./LocaleSelector.vue";

import datetimeManipulations from "../../mixins/datetimeManipulations";

export default {
  components: {
    LocaleSelector,
  },
  mixins: [datetimeManipulations],
  data() {
    return {
      screenWidth: window.innerWidth,
      selection: null,
    };
  },
  mounted() {
    window.addEventListener("resize", this.updateScreenSize);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.updateScreenSize);
  },
  methods: {
    changeMapStep(selection) {
      this.$root.$emit("changeTab");
      this.changeMapTime(selection);
    },
    formatDuration(timestep) {
      let l = Duration.fromISO(timestep);
      l.loc.locale = this.$i18n.locale;
      l.loc.intl = this.$i18n.locale;
      return l.toHuman();
    },
    updateScreenSize() {
      this.screenWidth = window.innerWidth;
    },
  },
  watch: {
    mapInterval: {
      immediate: true,
      handler(newInterval) {
        if (newInterval !== null) {
          this.selection = newInterval;
          this.$root.$emit("calcFooterPreview");
        }
      },
    },
  },
  computed: {
    ...mapGetters("Layers", ["getMapTimeSettings", "getUniqueTimestepsList"]),
    ...mapState("Layers", ["isAnimating"]),
    mapInterval() {
      return this.getMapTimeSettings.Step;
    },
  },
};
</script>

<style scoped>
.interval {
  min-width: 136px;
  max-width: 142px;
  z-index: 4;
}
.second-row {
  padding-left: 54px;
  padding-right: 17px;
}
.small-locale {
  transform: translateX(28px);
}
</style>
