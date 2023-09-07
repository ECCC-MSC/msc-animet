<template>
  <v-select
    v-if="
      item.get('layerIsTemporal') &&
      item.get('layerModelRuns') !== null &&
      item.get('layerModelRuns').length > 0
    "
    class="model-run"
    hide-details
    v-model="currentMR"
    :label="$t('SelectMR')"
    :items="item.get('layerModelRuns')"
    :disabled="isAnimating"
  >
    <template v-slot:item="{ item }">
      {{ localeDateFormat(item) }}
    </template>
    <template v-slot:selection="{ item }">
      {{ localeDateFormat(item) }}
    </template>
  </v-select>
</template>

<script>
import { mapGetters, mapState } from "vuex";

import datetimeManipulations from "../../mixins/datetimeManipulations";

export default {
  mixins: [datetimeManipulations],
  props: ["item"],
  methods: {
    changeModelRun(newModelRun) {
      let newDateArray = [];
      let timeDiff =
        newModelRun.getTime() - this.item.get("layerCurrentMR").getTime();
      this.item
        .get("layerDateArray")
        .forEach((date) =>
          newDateArray.push(new Date(date.getTime() + timeDiff))
        );

      this.item.getSource().updateParams({
        DIM_REFERENCE_TIME: this.getProperDateString(
          newModelRun,
          this.item.get("layerDateFormat")
        ),
      });
      this.item.setProperties({
        layerDateArray: newDateArray,
        layerDefaultTime: new Date(
          this.item.get("layerDefaultTime").getTime() + timeDiff
        ),
        layerCurrentMR: newModelRun,
        layerStartTime: newDateArray[0],
        layerEndTime: newDateArray[newDateArray.length - 1],
      });
      this.$root.$emit("modelRunChanged");
      if (this.item.get("layerTimeStep") === this.getMapTimeSettings.Step) {
        this.changeMapTime(this.item.get("layerTimeStep"));
      } else {
        const newLayerIndex = this.findLayerIndex(
          this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex],
          newDateArray,
          this.item.get("layerTimeStep")
        );
        this.item.setProperties({
          layerDateIndex: newLayerIndex,
        });
        this.$root.$emit("fixLayerTimes");
      }
    },
  },
  computed: {
    ...mapGetters("Layers", ["getMapTimeSettings"]),
    ...mapState("Layers", ["isAnimating"]),
    currentMR: {
      get() {
        return this.item.get("layerCurrentMR");
      },
      set(mr) {
        this.changeModelRun(mr);
      },
    },
  },
};
</script>

<style scoped>
.model-run {
  max-width: 350px;
}
</style>
