<template>
  <v-col class="flex-shrink-1 flex-grow-0">
    <v-select
      class="interval"
      :label="$t('TimestepsDropdown')"
      v-model="selection"
      hide-details
      :items="getUniqueTimestepsList"
      :disabled="getUniqueTimestepsList === [] || isAnimating"
      @input="changeMapTime(selection)"
    >
      <template v-slot:item="{ item }">
        {{ formatDuration(item) }}
      </template>
      <template v-slot:selection="{ item }">
        {{ formatDuration(item) }}
      </template>
    </v-select>
    <v-switch
      :disabled="isAnimating"
      v-model="timeFormat"
      hide-details
      :label="$t('MP4CreateTimeFormat')"
    >
    </v-switch>
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
      selection: null,
    };
  },
  methods: {
    formatDuration(timestep) {
      const locale = this.$i18n.locale === "fr" ? "fr-ca" : this.$i18n.locale;
      let l = Duration.fromISO(timestep);
      l.loc.locale = locale;
      l.loc.intl = locale;
      return l.toHuman();
    },
  },
  watch: {
    mapInterval: {
      immediate: true,
      handler(newInterval) {
        if (newInterval !== null) {
          this.selection = newInterval;
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
}
</style>
