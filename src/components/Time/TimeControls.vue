<template>
  <v-card class="my-4">
    <v-row class="mr-3 ml-1" v-if="this.getMapTimeSettings.Step !== null">
      <time-slider />
      <interval-locale-selector />
    </v-row>
    <expired-timestep-manager />
  </v-card>
</template>

<script>
import { mapGetters, mapState } from "vuex";

import datetimeManipulations from "../../mixins/datetimeManipulations";

import ExpiredTimestepManager from "./ExpiredTimestepManager.vue";
import IntervalLocaleSelector from "./IntervalLocaleSelector.vue";
import TimeSlider from "./TimeSlider.vue";

export default {
  components: {
    ExpiredTimestepManager,
    IntervalLocaleSelector,
    TimeSlider,
  },
  mixins: [datetimeManipulations],
  data() {
    return {
      cancelExpired: false,
    };
  },
  mounted() {
    this.$root.$on("addTemporalLayer", this.layerTimeManager);
    this.$root.$on("cancelExpired", () => {
      this.cancelExpired = true;
    });
    this.$root.$on("fixLayerTimes", this.mapControls);
    this.$root.$on("timeLayerRemoved", this.removedTimeLayerManager);
  },
  methods: {
    async mapControls() {
      const driverDate =
        this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex];
      let visibleTLayers = this.$mapLayers.arr.filter((l) => {
        return l.get("layerVisibilityOn") && l.get("layerIsTemporal");
      });
      for (let i = 0; i < visibleTLayers.length; i++) {
        let dateArray = visibleTLayers[i].get("layerDateArray");
        const layerDateIndex = this.findLayerIndex(
          driverDate,
          dateArray,
          visibleTLayers[i].get("layerTimeStep")
        );
        visibleTLayers[i].setProperties({
          layerDateIndex: layerDateIndex,
        });
        if (layerDateIndex >= 0) {
          this.setDateTime(visibleTLayers[i], dateArray[layerDateIndex]);
          if (
            visibleTLayers[i].get("layerVisibilityOn") &&
            !visibleTLayers[i].get("visible")
          ) {
            visibleTLayers[i].setVisible(true);
          }
        } else if (visibleTLayers[i].get("visible")) {
          visibleTLayers[i].setVisible(false);
        }
      }
      // Count time it takes to finish render for play button,
      // if less than 1sec wait until it's been a second
      let r = await this.measurePromise(
        () => new Promise((resolve) => this.map.once("rendercomplete", resolve))
      );
      if (this.cancelExpired) {
        if (this.playState === "play") {
          this.$store.commit("Layers/setPlayState", "pause");
          this.$store.commit("Layers/setIsAnimating", false);
        }
        this.cancelExpired = false;
        this.$root.$emit("fixTimeExtent");
      } else if (this.playState === "play") {
        if (r < 1000) {
          await this.delay(1000 - r);
        }
        this.$root.$emit("play");
      }
    },
    measurePromise(fn) {
      let onPromiseDone = () => performance.now() - start;

      let start = performance.now();
      return fn().then(onPromiseDone, onPromiseDone);
    },
    delay(time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    },
    layerTimeManager(imageLayer, layerData) {
      var [start, end, step] = layerData.Dimension.Dimension_time.split("/");
      let referenceTime =
        layerData.Dimension.Dimension_ref_time === ""
          ? null
          : this.getDateArray(layerData.Dimension.Dimension_ref_time)[0];
      let [layerDateArray, dateFormat] = this.getDateArray(
        layerData.Dimension.Dimension_time
      );
      imageLayer.setProperties({
        layerDateArray: layerDateArray,
        layerDateFormat: dateFormat,
        layerDateIndex: 0,
        layerDefaultTime: new Date(layerData.Dimension.Dimension_time_default),
        layerIndexOOB: false,
        layerModelRuns: referenceTime,
        layerCurrentMR:
          referenceTime === null
            ? null
            : referenceTime[referenceTime.length - 1],
        layerStartTime: new Date(start),
        layerEndTime: new Date(end),
        layerTimeStep: step,
      });
      this.$store.dispatch(
        "Layers/addTimestep",
        imageLayer.get("layerTimeStep")
      );
      if (this.getMapTimeSettings.Step === null || layerData.isSnapped) {
        this.changeMapTime(imageLayer.get("layerTimeStep"), imageLayer);
        // let layerDateIndex = this.findLayerIndex(
        //   imageLayer.get("layerDefaultTime"),
        //   this.getMapTimeSettings.Extent,
        //   imageLayer.get("layerTimeStep")
        // );
        // imageLayer.setProperties({
        //   layerDateIndex: layerDateIndex,
        // });
      } else {
        let layerDateIndex = this.findLayerIndex(
          this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex],
          imageLayer.get("layerDateArray"),
          imageLayer.get("layerTimeStep")
        );
        imageLayer.setProperties({
          layerDateIndex: layerDateIndex,
        });
        if (this.getMapTimeSettings.Step === imageLayer.get("layerTimeStep")) {
          this.changeMapTime(imageLayer.get("layerTimeStep"));
        } else if (layerDateIndex < 0) {
          imageLayer.setVisible(false);
        }
      }
      this.$root.$emit("timeLayerAdded");
      this.map.addLayer(imageLayer);
    },
    removedTimeLayerManager(imageLayer) {
      const timestep = imageLayer.get("layerTimeStep");
      this.$store.dispatch("Layers/removeTimestep", timestep);
      if (this.getMapTimeSettings.Step === timestep) {
        if (
          this.$mapLayers.arr.filter((l) => l.get("layerTimeStep") === timestep)
            .length !== 0
        ) {
          this.changeMapTime(timestep);
        } else {
          let firstTimeLayerFound = this.$mapLayers.arr.find((l) =>
            l.get("layerIsTemporal")
          );
          if (firstTimeLayerFound === undefined) {
            const mapTimeSettings = {
              SnappedLayer: null,
              Step: null,
              DateIndex: null,
              Extent: null,
            };
            this.$store.dispatch("Layers/setMapTimeSettings", mapTimeSettings);
          } else {
            this.changeMapTime(firstTimeLayerFound.get("layerTimeStep"));
            this.$store.commit("Layers/setDatetimeRangeSlider", [
              0,
              this.getMapTimeSettings.Extent.length - 1,
            ]);
          }
        }
      }
    },
    async setDateTime(layer, date) {
      layer.getSource().updateParams({
        TIME: this.getProperDateString(date, layer.get("layerDateFormat")),
      });
    },
  },
  props: ["map"],
  watch: {
    mapDateIndex: {
      deep: true,
      handler(newVal) {
        if (newVal !== null) {
          if (newVal < this.datetimeRangeSlider[0]) {
            this.$store.dispatch("Layers/setMapSnappedLayer", null);
            this.$store.commit("Layers/setDatetimeRangeSlider", [
              newVal,
              this.datetimeRangeSlider[1],
            ]);
          } else if (newVal > this.datetimeRangeSlider[1]) {
            this.$store.dispatch("Layers/setMapSnappedLayer", null);
            this.$store.commit("Layers/setDatetimeRangeSlider", [
              this.datetimeRangeSlider[0],
              newVal,
            ]);
          }
          this.mapControls();
        }
      },
    },
    mapSnappedLayer(newSnappedLayerName) {
      if (newSnappedLayerName !== null) {
        let snappedLayer = this.$mapLayers.arr.find(
          (l) => l.get("layerName") === newSnappedLayerName
        );
        const first = this.findLayerIndex(
          snappedLayer.get("layerStartTime"),
          this.getMapTimeSettings.Extent,
          snappedLayer.get("layerTimeStep")
        );
        const last = this.findLayerIndex(
          snappedLayer.get("layerEndTime"),
          this.getMapTimeSettings.Extent,
          snappedLayer.get("layerTimeStep")
        );
        if (
          this.getMapTimeSettings.DateIndex < first ||
          this.getMapTimeSettings.DateIndex > last
        ) {
          const newCurrent = this.findLayerIndex(
            snappedLayer.get("layerDefaultTime"),
            this.getMapTimeSettings.Extent,
            snappedLayer.get("layerTimeStep")
          );
          this.$store.dispatch("Layers/setMapTimeIndex", newCurrent);
        }
        this.$store.commit("Layers/setDatetimeRangeSlider", [first, last]);
      }
    },
  },
  computed: {
    ...mapGetters("Layers", ["getDatetimeRangeSlider", "getMapTimeSettings"]),
    ...mapState("Layers", ["playState"]),
    datetimeRangeSlider: {
      get() {
        return this.getDatetimeRangeSlider;
      },
      set(dateRange) {
        this.$store.commit("Layers/setDatetimeRangeSlider", dateRange);
      },
    },
    mapDateIndex() {
      return this.getMapTimeSettings.DateIndex;
    },
    mapSnappedLayer() {
      return this.getMapTimeSettings.SnappedLayer;
    },
  },
};
</script>
