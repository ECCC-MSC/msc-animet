<template>
  <v-col class="flex-grow-1 flex-shrink-0">
    <v-row class="d-flex justify-space-between top_row">
      <div>
        <arrow-controls action="first" class="button_group"></arrow-controls>
        <arrow-controls action="previous" class="button_group"></arrow-controls>
      </div>
      {{
        localeDateFormat(
          getMapTimeSettings.Extent[getMapTimeSettings.DateIndex],
          getMapTimeSettings.Step
        )
      }}
      <div>
        <arrow-controls action="next" class="button_group"></arrow-controls>
        <arrow-controls action="last" class="button_group"></arrow-controls>
      </div>
    </v-row>
    <v-row>
      <play-pause-controls></play-pause-controls>
      <v-col>
        <v-range-slider
          class="range_slider"
          v-model="datetimeRangeSlider"
          :disabled="isAnimating"
          :min="0"
          :max="getMapTimeSettings.Extent.length - 1"
          :rules="[rangeValuesNotSame]"
          :color="hideRangeSlider"
          :thumb-color="hideRangeSlider"
          :track-color="hideRangeSlider"
          :track-fill-color="hideRangeSlider"
          hide-details
          @end="changeDisplayedTime"
        ></v-range-slider>
        <v-slider
          class="mt-n8"
          :disabled="isAnimating"
          :min="0"
          :max="getMapTimeSettings.Extent.length - 1"
          color="rgba(0, 0, 0, 0)"
          track-color="rgba(0, 0, 0, 0)"
          thumb-color="rgba(231, 116, 22, 0.5)"
          :thumb-size="36"
          hide-details
          v-model="currentTime"
        ></v-slider>
      </v-col>
    </v-row>
    <v-row justify="space-between" class="mt-n6 bottom_row">
      <v-col class="text-left">{{ formatDate(datetimeRangeSlider[0]) }}</v-col>
      <v-col class="text-right">{{ formatDate(datetimeRangeSlider[1]) }}</v-col>
    </v-row>
  </v-col>
</template>

<script>
import { mapGetters, mapState } from "vuex";

import datetimeManipulations from "../../mixins/datetimeManipulations";

import ArrowControls from "./ArrowControls.vue";
import PlayPauseControls from "./PlayPauseControls.vue";

export default {
  mixins: [datetimeManipulations],
  components: {
    ArrowControls,
    PlayPauseControls,
  },
  methods: {
    rangeValuesNotSame(rangeInput) {
      return !(rangeInput[0] === rangeInput[1]);
    },
    changeDisplayedTime() {
      if (
        this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex] <
        this.getMapTimeSettings.Extent[this.datetimeRangeSlider[0]]
      ) {
        this.$store.dispatch(
          "Layers/setMapTimeIndex",
          this.datetimeRangeSlider[0]
        );
        this.$root.$emit("adjustMapTime");
      } else if (
        this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex] >
        this.getMapTimeSettings.Extent[this.datetimeRangeSlider[1]]
      ) {
        this.$store.dispatch(
          "Layers/setMapTimeIndex",
          this.datetimeRangeSlider[1]
        );
        this.$root.$emit("adjustMapTime");
      }
      if (this.getMapTimeSettings.SnappedLayer !== null) {
        this.$store.dispatch("Layers/setMapSnappedLayer", null);
      }
    },
    formatDate(index) {
      if (index > this.getMapTimeSettings.Extent.length - 1) {
        index = this.getMapTimeSettings.Extent.length - 1;
      } else if (index < 0) {
        index = 0;
      }
      return this.localeDateFormat(
        this.getMapTimeSettings.Extent[index],
        this.getMapTimeSettings.Step
      );
    },
  },
  computed: {
    ...mapGetters("Layers", ["getDatetimeRangeSlider", "getMapTimeSettings"]),
    ...mapState("Layers", ["isAnimating"]),
    currentTime: {
      get() {
        return this.getMapTimeSettings.DateIndex;
      },
      set(newDateIndex) {
        this.$store.dispatch("Layers/setMapTimeIndex", newDateIndex);
      },
    },
    datetimeRangeSlider: {
      get() {
        return this.getDatetimeRangeSlider;
      },
      set(dateRange) {
        this.$store.commit("Layers/setDatetimeRangeSlider", dateRange);
      },
    },
    hideRangeSlider() {
      if (
        this.getMapTimeSettings.Extent !== null &&
        this.getMapTimeSettings.Extent.length === 1
      ) {
        return "rgba(0, 0, 0, 0)";
      } else {
        return undefined;
      }
    },
  },
};
</script>

<style scoped>
.range_slider::v-deep .v-slider__thumb:before {
  left: -15px;
  top: -6px;
}
.range_slider::v-deep .v-slider__thumb {
  width: 6px;
  height: 24px;
  left: -3px;
  border-radius: 15px;
  z-index: 2;
}
.button_group {
  display: inline-block;
}
.top_row {
  padding-left: 59px;
  padding-right: 7px;
  padding-top: 8px;
  margin-bottom: -26px;
}
.bottom_row {
  padding-left: 68px;
  padding-right: 17px;
}
</style>
