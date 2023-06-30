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
    @input="changeModelRun()"
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
  data() {
    return {
      currentMR: this.item.get("layerCurrentMR"),
    };
  },
  methods: {
    changeModelRun() {
      let newDateArray = [];
      let timeDiff =
        this.currentMR.getTime() - this.item.get("layerCurrentMR").getTime();
      this.item
        .get("layerDateArray")
        .forEach((date) =>
          newDateArray.push(new Date(date.getTime() + timeDiff))
        );

      this.item.getSource().updateParams({
        DIM_REFERENCE_TIME: this.getProperDateString(
          this.currentMR,
          this.item.get("layerDateFormat")
        ),
      });
      this.item.setProperties({
        layerDateArray: newDateArray,
        layerDefaultTime: new Date(
          this.item.get("layerDefaultTime").getTime() + timeDiff
        ),
        layerCurrentMR: this.currentMR,
        layerStartTime: newDateArray[0],
        layerEndTime: newDateArray[newDateArray.length - 1],
      });
      this.item.set;
      if (this.item.get("layerTimeStep") === this.getMapTimeSettings.Step) {
        if (
          this.item.get("layerName") === this.getMapTimeSettings.SnappedLayer
        ) {
          this.changeMapTime(this.item.get("layerTimeStep"), this.item);
        } else {
          this.changeMapTime(this.item.get("layerTimeStep"));
        }
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
  },
};
</script>

<style scoped>
.model-run {
  max-width: 350px;
}
</style>
