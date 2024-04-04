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
      {{ localeDateFormat(item, null, "DATETIME_MED") }}
    </template>
    <template v-slot:selection="{ item }">
      {{ localeDateFormat(item, null, "DATETIME_MED") }}
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

      if (
        newModelRun ===
        this.item.get("layerModelRuns")[
          this.item.get("layerModelRuns").length - 1
        ]
      ) {
        this.item.getSource().updateParams({
          DIM_REFERENCE_TIME: undefined,
        });
      } else {
        this.item.getSource().updateParams({
          DIM_REFERENCE_TIME: this.getProperDateString(
            newModelRun,
            this.item.get("layerDateFormat")
          ),
        });
      }
      const layerActiveConfig = this.item.get("layerActiveConfig");
      const configs = this.item.get("layerConfigs");
      configs[layerActiveConfig].layerDateArray = newDateArray;
      configs[layerActiveConfig].layerStartTime = newDateArray[0];
      configs[layerActiveConfig].layerEndTime =
        newDateArray[newDateArray.length - 1];

      this.item.setProperties({
        layerConfigs: configs,
        layerDateArray: newDateArray,
        layerDefaultTime: new Date(
          this.item.get("layerDefaultTime").getTime() + timeDiff
        ),
        layerCurrentMR: newModelRun,
        layerStartTime: configs[layerActiveConfig].layerStartTime,
        layerEndTime: configs[layerActiveConfig].layerEndTime,
      });
      this.$root.$emit("modelRunChanged");
      this.$root.$emit("calcFooterPreview");
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
