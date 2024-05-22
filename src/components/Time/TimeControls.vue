<template>
  <v-card
    id="time-controls"
    :class="getCollapsedControls ? 'time-controls-collapsed' : ''"
  >
    <div class="controller-padding" v-if="getMapTimeSettings.Step !== null">
      <div v-if="screenWidth >= 565">
        <v-row
          class="mr-1 ml-1 pt-2 pb-1 px-0"
          :class="getCollapsedControls ? 'hide-controls' : ''"
        >
          <time-slider class="enable-events" />
          <interval-locale-selector class="enable-events" />
        </v-row>
        <v-btn
          id="collapse-button"
          class="enable-events"
          :class="getCollapsedControls ? 'collapsed' : 'extended'"
          small
          @click="
            $store.commit('Layers/setCollapsedControls', !getCollapsedControls)
          "
        >
          <v-icon v-if="!getCollapsedControls" large> mdi-chevron-down </v-icon>
          <div v-else>
            <span class="collapsed-date">{{
              getCollapsedDateFormat()[0]
            }}</span>
            <span class="collapsed-time">{{
              getCollapsedDateFormat()[1]
            }}</span>
          </div>
        </v-btn>
      </div>
      <v-col class="mr-1 pt-2 pb-2 px-0" v-else>
        <time-slider
          class="enable-events slider"
          :class="getCollapsedControls ? 'hide-controls' : ''"
        />
        <interval-locale-selector
          class="enable-events"
          :class="getCollapsedControls ? 'hide-controls' : ''"
        />
        <v-btn
          class="enable-events"
          :class="getCollapsedControls ? 'collapsed' : 'extended'"
          small
          @click="
            $store.commit('Layers/setCollapsedControls', !getCollapsedControls)
          "
        >
          <v-icon v-if="!getCollapsedControls" large> mdi-chevron-down </v-icon>
          <div v-else>
            <span class="collapsed-date">{{
              getCollapsedDateFormat()[0]
            }}</span>
            <span class="collapsed-time">{{
              getCollapsedDateFormat()[1]
            }}</span>
          </div>
        </v-btn>
      </v-col>
    </div>
    <error-manager />
  </v-card>
</template>

<script>
import { mapGetters, mapState } from "vuex";

import datetimeManipulations from "../../mixins/datetimeManipulations";

import ErrorManager from "./ErrorManager.vue";
import IntervalLocaleSelector from "./IntervalLocaleSelector.vue";
import TimeSlider from "./TimeSlider.vue";

export default {
  components: {
    ErrorManager,
    IntervalLocaleSelector,
    TimeSlider,
  },
  mixins: [datetimeManipulations],
  data() {
    return {
      screenWidth: window.innerWidth,
    };
  },
  mounted() {
    this.$root.$on("addTemporalLayer", this.layerTimeManager);
    this.$root.$on("fixLayerTimes", this.mapControls);
    this.$root.$on("timeLayerRemoved", this.removedTimeLayerManager);
    window.addEventListener("resize", this.updateScreenSize);
  },
  beforeDestroy() {
    this.$root.$off("addTemporalLayer", this.layerTimeManager);
    this.$root.$off("fixLayerTimes", this.mapControls);
    this.$root.$off("timeLayerRemoved", this.removedTimeLayerManager);
    window.removeEventListener("resize", this.updateScreenSize);
  },
  methods: {
    delay(time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    },
    getCollapsedDateFormat() {
      return this.localeDateFormatAnimation(
        this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex]
      );
    },
    layerTimeManager(imageLayer, layerData) {
      const referenceTime =
        layerData.Dimension.Dimension_ref_time === ""
          ? null
          : this.findFormat(layerData.Dimension.Dimension_ref_time)[0][0];
      const configs = this.createTimeLayerConfigs(
        layerData.Dimension.Dimension_time
      );
      if (configs === null) {
        this.$root.$emit("notifyWrongFormat");
        this.$root.$emit("removeLayer", imageLayer);
        return;
      }
      imageLayer.setProperties({
        layerActiveConfig: 0,
        layerConfigs: configs,
        layerDateArray: configs[0].layerDateArray,
        layerDateFormat: configs[0].layerDateFormat,
        layerDateIndex: 0,
        layerDefaultTime: new Date(layerData.Dimension.Dimension_time_default),
        layerDimensionRefTime: layerData.Dimension.Dimension_ref_time,
        layerDimensionTime: layerData.Dimension.Dimension_time,
        layerIndexOOB: false,
        layerModelRuns: referenceTime,
        layerCurrentMR:
          referenceTime === null
            ? null
            : referenceTime[referenceTime.length - 1],
        layerStartTime: new Date(configs[0].layerStartTime),
        layerEndTime: new Date(configs[0].layerEndTime),
        layerTimeStep: configs[0].layerTimeStep,
        layerTrueTimeStep: configs[0].layerTrueTimeStep,
      });
      this.$store.dispatch(
        "Layers/addTimestep",
        imageLayer.get("layerTimeStep")
      );
      if (layerData.isSnapped) {
        this.changeMapTime(imageLayer.get("layerTimeStep"), imageLayer);
      } else if (this.getMapTimeSettings.Step === null) {
        this.changeMapTime(imageLayer.get("layerTimeStep"));
        this.$store.commit("Layers/setDatetimeRangeSlider", [
          0,
          this.getMapTimeSettings.Extent.length - 1,
        ]);
      } else {
        const layerDateIndex = this.findLayerIndex(
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
      this.setDateTime(
        imageLayer,
        this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex]
      );
      this.$root.$emit("timeLayerAdded", imageLayer.get("layerName"));
      this.$mapCanvas.mapObj.addLayer(imageLayer);
    },
    async mapControls() {
      // Prevents a bug that triggers play twice
      const playStateBuffer = this.playState;

      const mapTime =
        this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex];

      const numLayers = this.$mapLayers.arr.length;
      let noChange = true;
      for (let i = 0; i < numLayers; i++) {
        if (
          this.$mapLayers.arr[i].get("layerVisibilityOn") &&
          this.$mapLayers.arr[i].get("layerIsTemporal")
        ) {
          const dateArray = this.$mapLayers.arr[i].get("layerDateArray");
          const layerDateIndex = this.findLayerIndex(
            mapTime,
            dateArray,
            this.$mapLayers.arr[i].get("layerTimeStep")
          );
          this.$mapLayers.arr[i].setProperties({
            layerDateIndex: layerDateIndex,
          });
          if (layerDateIndex >= 0) {
            this.setDateTime(this.$mapLayers.arr[i], dateArray[layerDateIndex]);
            noChange = false;
            if (!this.$mapLayers.arr[i].get("visible")) {
              this.$mapLayers.arr[i].setVisible(true);
            }
          } else {
            this.$mapLayers.arr[i].setVisible(false);
          }
        }
      }
      if (noChange) {
        await this.delay(100);
        this.$mapCanvas.mapObj.updateSize();
        if (this.isAnimating && playStateBuffer !== "play") {
          // Trigger manually because animation creation waits for
          // render events, but noChange means no layers are shown
          // so nothing ever changes or renders.
          this.$root.$emit("layersRendered");
          this.$animationCanvas.mapObj.updateSize();
        }
        return;
      }
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
          let first;
          let last;
          if (this.getDatetimeRangeSlider[0] === 0) {
            first = 0;
          }
          if (this.getDatetimeRangeSlider[1] === oldExtent.length - 1) {
            last = newExtent.length - 1;
          }
          if (first === undefined && last === undefined) {
            const firstDate = oldExtent[this.getDatetimeRangeSlider[0]];
            first = this.findLayerIndex(firstDate, newExtent, newStep);
            first = first >= 0 ? first : 0;

            const lastDate = oldExtent[this.getDatetimeRangeSlider[1]];
            last = this.findLayerIndex(lastDate, newExtent, newStep);
            last = last >= 0 ? last : newExtent.length - 1;
          } else if (first === undefined) {
            first =
              last -
              (this.getDatetimeRangeSlider[1] - this.getDatetimeRangeSlider[0]);
            if (first < 0 || first > newExtent.length - 1 || first > last) {
              first = 0;
            }
            const currentDate = this.findLayerIndex(
              oldExtent[this.getMapTimeSettings.DateIndex],
              newExtent,
              newStep
            );
            if (currentDate < first) {
              this.$store.dispatch("Layers/setMapTimeIndex", first);
            }
          } else if (last === undefined) {
            last =
              this.getDatetimeRangeSlider[1] -
              this.getDatetimeRangeSlider[0] +
              first;
            if (last < 0 || last > newExtent.length - 1 || first > last) {
              last = newExtent.length - 1;
            }
          }
          this.$store.commit("Layers/setDatetimeRangeSlider", [first, last]);
        } else {
          this.onSnappedLayerChanged(this.getMapTimeSettings.SnappedLayer);
        }
        this.$root.$emit("updatePermalink");
      }
    },
    onSnappedLayerChanged(newSnappedLayerName) {
      const newSnappedLayer = this.$mapLayers.arr.find(
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
        let newCurrent = this.findLayerIndex(
          newSnappedLayer.get("layerDefaultTime"),
          this.getMapTimeSettings.Extent,
          newSnappedLayer.get("layerTimeStep")
        );
        if (newCurrent < 0) {
          newCurrent = this.findLayerIndex(
            newSnappedLayer.get("layerStartTime"),
            this.getMapTimeSettings.Extent,
            newSnappedLayer.get("layerTimeStep")
          );
        }
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
          const firstTimeLayerFound = this.$mapLayers.arr.find((l) =>
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
    updateScreenSize() {
      this.screenWidth = window.innerWidth;
    },
  },
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
      this.$root.$emit("updatePermalink");
    },
    snappedLayer(newSnap, oldSnap) {
      if (newSnap !== null && newSnap !== oldSnap) {
        this.onSnappedLayerChanged(newSnap);
      }
    },
  },
  computed: {
    ...mapGetters("Layers", [
      "getCollapsedControls",
      "getDatetimeRangeSlider",
      "getMapTimeSettings",
    ]),
    ...mapState("Layers", ["isAnimating", "isLooping", "playState"]),
    dateIndex() {
      return this.getMapTimeSettings.DateIndex;
    },
    extent() {
      return [this.getMapTimeSettings.Extent, this.getMapTimeSettings.Step];
    },
    layerList() {
      return this.$mapLayers.arr.length;
    },
    snappedLayer() {
      return this.getMapTimeSettings.SnappedLayer;
    },
  },
};
</script>

<style scoped>
.collapsed {
  border-radius: 0;
  box-shadow: none;
  margin-top: 6px;
  transform: translateY(-13px);
  width: 100%;
  height: 50px !important;
}
.collapsed-date {
  display: block;
  font-size: 16px;
  text-transform: none !important;
  white-space: nowrap !important;
}
.collapsed-time {
  display: block;
  font-size: 24px;
  text-transform: none !important;
  white-space: nowrap !important;
}
.controller-padding {
  margin-bottom: -16px;
  pointer-events: none;
}
.enable-events {
  pointer-events: auto;
}
.extended {
  background-color: transparent !important;
  border-radius: 0;
  box-shadow: none;
  margin-top: 6px;
  transform: translateY(-13px);
  width: 100%;
  height: 26px !important;
}
.hide-controls {
  display: none;
}
.slider {
  padding-top: 2px;
  padding-bottom: 0;
}
#collapse-button::v-deep .v-btn__content {
  height: 20px;
}
#time-controls {
  position: absolute;
  bottom: 24px;
  width: 75%;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 20px;
  max-width: 1200px;
  z-index: 2;
}
@media (min-width: 1121px) {
  .collapsed {
    pointer-events: auto;
    border-radius: 4px 4px 0 0;
    box-shadow: none;
    margin-left: calc(35%);
    transform: translateY(10px);
    width: 30%;
    height: 50px !important;
  }
  .time-controls-collapsed {
    background-color: transparent;
    box-shadow: none !important;
    pointer-events: none !important;
    padding-top: 0;
  }
}
@media (max-width: 1120px) {
  #time-controls {
    width: 100%;
    transform: none;
    border-radius: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
}
@media (max-width: 565px) {
  .collapsed {
    margin-top: -8px;
    transform: translateY(-4px);
  }
  .controller-padding {
    pointer-events: auto;
  }
  .extended {
    transform: translateY(-4px);
  }
  #time-controls {
    padding-top: 0;
  }
}
</style>
