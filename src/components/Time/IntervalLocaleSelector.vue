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
      <v-switch
        class="locale-switch"
        :disabled="isAnimating"
        v-model="timeFormat"
        hide-details
        :label="$t('MP4CreateTimeFormat')"
      >
      </v-switch>
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
      <v-switch
        class="locale-switch"
        :disabled="isAnimating"
        v-model="timeFormat"
        hide-details
        :label="$t('MP4CreateTimeFormat')"
      >
      </v-switch>
    </v-row>
  </v-col>
</template>

<script>
import { Duration } from "luxon";
import { mapGetters, mapState } from "vuex";

import datetimeManipulations from "../../mixins/datetimeManipulations";

export default {
  mixins: [datetimeManipulations],
  data() {
    return {
      screenWidth: window.innerWidth,
      selection: null,
    };
  },
  mounted() {
    window.addEventListener("resize", this.updateScreenSize);
    const userLocaleChoice = this.getLocale();
    if (userLocaleChoice === "false") {
      this.$store.dispatch("Layers/setTimeFormat", false);
    }
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
    getLocale() {
      return localStorage.getItem("user-locale");
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
    ...mapGetters("Layers", [
      "getMapTimeSettings",
      "getTimeFormat",
      "getUniqueTimestepsList",
    ]),
    ...mapState("Layers", ["isAnimating"]),
    timeFormat: {
      get() {
        return this.getTimeFormat;
      },
      set(flag) {
        this.$store.dispatch("Layers/setTimeFormat", flag);
        localStorage.setItem("user-locale", flag);
        this.$root.$emit("calcFooterPreview");
      },
    },
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
.locale-switch {
  margin-top: 10px;
}
.locale-switch::v-deep .v-input--selection-controls__ripple {
  z-index: 4;
}
.second-row {
  padding-left: 54px;
  padding-right: 17px;
}
</style>
