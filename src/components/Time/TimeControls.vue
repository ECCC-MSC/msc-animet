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
    this.$root.$on("cancelExpired", this.handleCancelExpired);
    this.$root.$on("fixLayerTimes", this.mapControls);
    this.$root.$on("timeLayerRemoved", this.removedTimeLayerManager);
  },
  beforeDestroy() {
    this.$root.$off("addTemporalLayer", this.layerTimeManager);
    this.$root.$off("cancelExpired", this.handleCancelExpired);
    this.$root.$off("fixLayerTimes", this.mapControls);
    this.$root.$off("timeLayerRemoved", this.removedTimeLayerManager);
  },
  methods: {
    delay(time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    },
    handleCancelExpired() {
      this.cancelExpired = true;
    },
    layerTimeManager(imageLayer, layerData) {
      let [start, end, step] = layerData.Dimension.Dimension_time.split("/");
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
    async mapControls() {
      this.cancelExpired = false;
      const driverDate =
        this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex];
      let visibleTLayers = this.$mapLayers.arr.filter((l) => {
        return l.get("layerVisibilityOn") && l.get("layerIsTemporal");
      });
      let noChange = true;
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
          noChange = false;
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
      if (noChange) {
        this.map.updateSize();
        if (this.playState === "play") {
          this.$root.$emit("playAnimation");
        }
        return;
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
        this.$root.$emit("fixTimeExtent");
      } else if (this.playState === "play") {
        if (r < 1000) {
          await this.delay(1000 - r);
        }
        this.$root.$emit("playAnimation");
      }
    },
    measurePromise(fn) {
      let onPromiseDone = () => performance.now() - start;

      let start = performance.now();
      return fn().then(onPromiseDone, onPromiseDone);
    },
    onExtentChanged(newExtent, newStep, oldExtent, oldStep) {
      if (
        this.getMapTimeSettings.SnappedLayer !== null &&
        newStep !== oldStep
      ) {
        return;
      } else if (newStep !== oldStep) {
        this.$store.commit("Layers/setDatetimeRangeSlider", [
          0,
          newExtent.length - 1,
        ]);
      } else {
        if (this.getMapTimeSettings.SnappedLayer === null) {
          if (
            this.getDatetimeRangeSlider[1] >
            this.getMapTimeSettings.Extent.length - 1
          ) {
            let first =
              this.getDatetimeRangeSlider[0] >= 0
                ? this.getDatetimeRangeSlider[0]
                : 0;
            this.$store.commit("Layers/setDatetimeRangeSlider", [
              first > this.getMapTimeSettings.DateIndex
                ? this.getMapTimeSettings.DateIndex
                : first,
              newExtent.length - 1,
            ]);
          } else if (oldExtent[this.getDatetimeRangeSlider[1]] < newExtent[0]) {
            this.$store.commit("Layers/setDatetimeRangeSlider", [
              0,
              newExtent.length - 1,
            ]);
          } else if (
            this.getMapTimeSettings.DateIndex < this.getDatetimeRangeSlider[0]
          ) {
            this.$store.dispatch("Layers/setMapSnappedLayer", null);
            this.$store.commit("Layers/setDatetimeRangeSlider", [
              this.getMapTimeSettings.DateIndex,
              this.getDatetimeRangeSlider[1],
            ]);
          } else if (
            this.getMapTimeSettings.DateIndex > this.getDatetimeRangeSlider[1]
          ) {
            this.$store.dispatch("Layers/setMapSnappedLayer", null);
            this.$store.commit("Layers/setDatetimeRangeSlider", [
              this.getDatetimeRangeSlider[0],
              this.getMapTimeSettings.DateIndex,
            ]);
          }
        } else {
          this.onSnappedLayerChanged(this.getMapTimeSettings.SnappedLayer);
        }
      }
    },
    onSnappedLayerChanged(newSnappedLayerName) {
      let newSnappedLayer = this.$mapLayers.arr.find(
        (l) => l.get("layerName") === newSnappedLayerName
      );
      const first = this.findLayerIndex(
        newSnappedLayer.get("layerStartTime"),
        this.getMapTimeSettings.Extent,
        newSnappedLayer.get("layerTimeStep")
      );
      const last = this.findLayerIndex(
        newSnappedLayer.get("layerEndTime"),
        this.getMapTimeSettings.Extent,
        newSnappedLayer.get("layerTimeStep")
      );
      if (
        this.getMapTimeSettings.DateIndex < first ||
        this.getMapTimeSettings.DateIndex > last
      ) {
        const newCurrent = this.findLayerIndex(
          newSnappedLayer.get("layerDefaultTime"),
          this.getMapTimeSettings.Extent,
          newSnappedLayer.get("layerTimeStep")
        );
        this.$store.dispatch("Layers/setMapTimeIndex", newCurrent);
      }
      this.$store.commit("Layers/setDatetimeRangeSlider", [first, last]);
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
    dateIndex: {
      deep: true,
      handler(newIndex) {
        if (newIndex !== null) {
          this.mapControls();
        }
      },
    },
    extent: {
      deep: true,
      handler([newExtent, newStep], [oldExtent, oldStep]) {
        if (oldExtent !== null && newExtent !== null) {
          if (
            newExtent[0].getTime() !== oldExtent[0].getTime() ||
            newExtent[newExtent.length - 1].getTime() !==
              oldExtent[oldExtent.length - 1].getTime()
          ) {
            this.onExtentChanged(newExtent, newStep, oldExtent, oldStep);
          } else if (this.getMapTimeSettings.SnappedLayer !== null) {
            this.onSnappedLayerChanged(this.getMapTimeSettings.SnappedLayer);
          } else if (newExtent.length !== oldExtent.length) {
            let first = this.findLayerIndex(
              oldExtent[this.getDatetimeRangeSlider[0]],
              newExtent,
              newStep
            );
            let last = this.findLayerIndex(
              oldExtent[this.getDatetimeRangeSlider[1]],
              newExtent,
              newStep
            );
            if (first < 0 || first === newExtent.length - 1) {
              first = 0;
            }
            if (last <= 0) {
              last = newExtent.length - 1;
            }
            this.$store.commit("Layers/setDatetimeRangeSlider", [first, last]);
          }
        }
      },
    },
    layerList(newLength, oldLength) {
      if (newLength !== oldLength && newLength === 0) {
        this.$store.commit("Layers/setDatetimeRangeSlider", [null, null]);
      }
    },
    snappedLayer(newSnap, oldSnap) {
      if (newSnap !== null && newSnap !== oldSnap) {
        this.onSnappedLayerChanged(newSnap);
      }
    },
  },
  computed: {
    ...mapGetters("Layers", ["getDatetimeRangeSlider", "getMapTimeSettings"]),
    ...mapState("Layers", ["playState"]),
    layerList() {
      return this.$mapLayers.arr.length;
    },
    dateIndex() {
      return this.getMapTimeSettings.DateIndex;
    },
    extent() {
      return [this.getMapTimeSettings.Extent, this.getMapTimeSettings.Step];
    },
    snappedLayer() {
      return this.getMapTimeSettings.SnappedLayer;
    },
  },
};
</script>
