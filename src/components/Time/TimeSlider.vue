<template>
  <v-col class="flex-grow-1 flex-shrink-0">
    <v-row class="d-flex justify-space-between top_row">
      <div>
        <arrow-controls action="first" class="button_group"></arrow-controls>
        <arrow-controls action="previous" class="button_group"></arrow-controls>
      </div>
      <span class="text-wrap">
        {{
          localeDateFormat(
            getMapTimeSettings.Extent[getMapTimeSettings.DateIndex],
            getMapTimeSettings.Step,
            dateFormat
          )
        }}
      </span>
      <div>
        <arrow-controls action="next" class="button_group"></arrow-controls>
        <arrow-controls action="last" class="button_group"></arrow-controls>
      </div>
    </v-row>
    <v-row>
      <play-pause-controls class="play-pause"></play-pause-controls>
      <v-col class="pl-0">
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
          @change="changeDisplayedTime"
        ></v-range-slider>
        <v-slider
          class="mt-n8 play-head"
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
      <v-col class="text-left text-wrap px-0">{{
        formatDate(datetimeRangeSlider[0], dateFormat)
      }}</v-col>
      <v-col class="text-right text-wrap px-0">{{
        formatDate(datetimeRangeSlider[1], dateFormat)
      }}</v-col>
    </v-row>
  </v-col>
</template>

<script>
import { mapGetters, mapState } from "vuex";

import datetimeManipulations from "../../mixins/datetimeManipulations";

import ArrowControls from "./AnimationControls/ArrowControls.vue";
import PlayPauseControls from "./AnimationControls/PlayPauseControls.vue";

export default {
  mixins: [datetimeManipulations],
  components: {
    ArrowControls,
    PlayPauseControls,
  },
  data() {
    return {
      screenWidth: window.innerWidth,
    };
  },
  mounted() {
    window.addEventListener("resize", this.updateScreenSize);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.updateScreenSize);
  },
  methods: {
    rangeValuesNotSame(rangeInput) {
      return !(rangeInput[0] === rangeInput[1]);
    },
    updateScreenSize() {
      this.screenWidth = window.innerWidth;
    },
    changeDisplayedTime() {
      this.$root.$emit("changeTab");
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
      this.$root.$emit("updatePermalink");
    },
    formatDate(index, format) {
      if (index > this.getMapTimeSettings.Extent.length - 1) {
        index = this.getMapTimeSettings.Extent.length - 1;
      } else if (index < 0) {
        index = 0;
      }
      return this.localeDateFormat(
        this.getMapTimeSettings.Extent[index],
        this.getMapTimeSettings.Step,
        format
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
        this.$root.$emit("changeTab");
        if (this.getMapTimeSettings.DateIndex !== null) {
          if (newDateIndex < this.datetimeRangeSlider[0]) {
            this.$store.dispatch("Layers/setMapSnappedLayer", null);
            this.$store.commit("Layers/setDatetimeRangeSlider", [
              newDateIndex,
              this.datetimeRangeSlider[1],
            ]);
          } else if (newDateIndex > this.datetimeRangeSlider[1]) {
            this.$store.dispatch("Layers/setMapSnappedLayer", null);
            this.$store.commit("Layers/setDatetimeRangeSlider", [
              this.datetimeRangeSlider[0],
              newDateIndex,
            ]);
          }
        }
        this.$store.dispatch("Layers/setMapTimeIndex", newDateIndex);
        this.$root.$emit("updatePermalink");
      },
    },
    dateFormat() {
      if (this.screenWidth > 850) {
        return "DATETIME_FULL";
      } else if (this.screenWidth > 720) {
        return "DATETIME_MED";
      } else {
        return "DATETIME_SHORT";
      }
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
.play-head::v-deep .v-slider__thumb {
  z-index: 2;
}
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
  padding-left: 31px;
  padding-right: 7px;
  padding-top: 8px;
  margin-bottom: -26px;
}
.bottom_row {
  padding-left: 40px;
  padding-right: 17px;
}
.play-pause {
  display: flex;
  align-items: center;
  justify-content: center;
}
.text-wrap {
  overflow: hidden;
  white-space: nowrap !important;
  text-overflow: ellipsis;
}
</style>
