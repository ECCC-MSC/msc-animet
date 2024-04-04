<template>
  <div id="time-snackbar">
    <v-snackbar v-model="notifyExtentRebuilt" timeout="8000" class="snackbar">
      {{ expiredSnackBarMessage }}
      <template v-slot:action="{ attrs }">
        <v-btn
          color="warning"
          text
          v-bind="attrs"
          @click="notifyExtentRebuilt = false"
        >
          {{ $t("Close") }}
        </v-btn>
      </template>
    </v-snackbar>

    <v-snackbar
      v-model="notifyCancelAnimateResize"
      timeout="-1"
      class="snackbar"
    >
      {{ $t("MP4CreateNotifyCancelAnimation") }}
      <template v-slot:action="{ attrs }">
        <v-btn
          color="warning"
          text
          v-bind="attrs"
          @click="notifyCancelAnimateResize = false"
        >
          {{ $t("Close") }}
        </v-btn>
      </template>
    </v-snackbar>

    <v-snackbar v-model="notifyWrongFormat" timeout="5000" class="snackbar">
      <span class="snackMessage">{{ $t("WrongTimeFormat") }}</span>

      <template v-slot:action="{ attrs }">
        <v-btn
          color="warning"
          text
          v-bind="attrs"
          @click="notifyWrongFormat = false"
        >
          {{ $t("Close") }}
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script>
import axios from "axios";
import { mapGetters, mapState } from "vuex";
import SaxonJS from "saxon-js";

import datetimeManipulations from "../../mixins/datetimeManipulations";

export default {
  mixins: [datetimeManipulations],
  mounted() {
    this.$root.$on("cancelAnimationResize", () => {
      this.notifyCancelAnimateResize = true;
    });
    this.$root.$on("checkLoadingErrors", this.checkExpiredOnMapMoveOrResize);
    this.$root.$on("fixTimeExtent", this.fixTimeExtent);
    this.$root.$on("loadingError", this.errorDispatcher);
    this.$root.$on("notifyWrongFormat", () => {
      this.notifyWrongFormat = true;
    });
    this.$root.$on("refreshExpired", this.autoRefreshHandler);
  },
  beforeDestroy() {
    this.$root.$off("checkLoadingErrors", this.checkExpiredOnMapMoveOrResize);
    this.$root.$off("fixTimeExtent", this.fixTimeExtent);
    this.$root.$off("loadingError", this.errorDispatcher);
    this.$root.$off("refreshExpired", this.autoRefreshHandler);
  },
  data() {
    return {
      blockRefresh: false,
      errorLayersList: [],
      expiredSnackBarMessage: this.$t("MissingTimesteps"),
      expiredTimestepList: [],
      notifyCancelAnimateResize: false,
      notifyExtentRebuilt: false,
      notifyWrongFormat: false,
      timeoutHandles: {},
      xsltTime: `parse-xml($xml)//Layer[not(.//Layer) and Name = 'REPLACE_WITH_LAYERNAME']!map
                      {
                          'Dimension' : map
                          {
                              'Dimension_time' : string(Dimension[@name = 'time']),
                              'Dimension_time_default' : string(Dimension[@name = 'time']/@default),
                              'Dimension_ref_time' : string(Dimension[@name = 'reference_time'])
                          }
                      }`,
    };
  },
  methods: {
    async autoRefreshHandler(layerList) {
      if (
        this.isAnimating &&
        !(this.getDatetimeRangeSlider[0] === this.getDatetimeRangeSlider[1])
      ) {
        await new Promise((resolve) =>
          this.$mapCanvas.mapObj.once("rendercomplete", resolve)
        );
      }
      if (!this.blockRefresh) {
        layerList.forEach((imageLayer) => {
          this.errorLayersList.push(imageLayer.get("layerName"));
        });
        layerList.forEach((imageLayer) => {
          this.refreshExpired(imageLayer);
        });
      }
      if (
        !this.isAnimating ||
        this.getDatetimeRangeSlider[0] === this.getDatetimeRangeSlider[1]
      )
        this.fixTimeExtent();
    },
    async checkExpiredOnMapMoveOrResize() {
      if (this.expiredTimestepList.length !== 0) {
        this.fixTimeExtent();
      }
    },
    clearAllTimeouts() {
      for (var layerName in this.timeoutHandles) {
        clearTimeout(this.timeoutHandles[layerName]["timeoutId"]);
        const params = this.timeoutHandles[layerName]["params"];
        this.errorDispatcher(params[0], params[1]);
        delete this.timeoutHandles[layerName];
      }
    },
    async fixTimeExtent() {
      await new Promise((resolve) => {
        let checkInterval = setInterval(() => {
          if (this.errorLayersList.length === 0) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100); // Check every 100ms
      });
      if (this.expiredTimestepList.length !== 0) {
        let noChangeFlag = true;
        if (this.expiredTimestepList.includes(this.getMapTimeSettings.Step)) {
          noChangeFlag = false;
        }
        this.expiredTimestepList = [];
        if (noChangeFlag) {
          this.expiredSnackBarMessage = this.$t("MissingTimesteps");
          this.notifyExtentRebuilt = true;
          if (this.isAnimating && this.playState !== "play") {
            this.$root.$emit("redoAnimation");
            this.$root.$emit("animationCanvasReset");
          } else {
            this.$root.$emit("fixLayerTimes");
          }
        } else {
          if (this.getMapTimeSettings.SnappedLayer !== null) {
            this.changeMapTime(
              this.getMapTimeSettings.Step,
              this.$mapLayers.arr.find(
                (l) =>
                  l.get("layerName") === this.getMapTimeSettings.SnappedLayer
              )
            );
            this.expiredSnackBarMessage = this.$t("MissingTimesteps");
            this.notifyExtentRebuilt = true;
            if (this.isAnimating && this.playState !== "play") {
              this.$root.$emit("redoAnimation");
            }
          } else {
            const currentHighBoundDate =
              this.getMapTimeSettings.Extent[this.getDatetimeRangeSlider[1]];
            this.changeMapTime(this.getMapTimeSettings.Step);
            if (this.getMapTimeSettings.Extent[0] >= currentHighBoundDate) {
              // Cancel animation
              this.expiredSnackBarMessage = this.$t("ExtentFullyOOB");
              this.notifyExtentRebuilt = true;
              if (this.isAnimating) {
                this.$root.$emit("restoreState");
              }
            } else {
              this.expiredSnackBarMessage = this.$t("MissingTimesteps");
              this.notifyExtentRebuilt = true;
              if (this.isAnimating && this.playState !== "play") {
                this.$root.$emit("redoAnimation");
              }
            }
          }
        }
      }
      this.$root.$emit("loadingStop");
      this.blockRefresh = false;
    },
    async errorDispatcher(layer, e) {
      this.blockRefresh = true;
      try {
        this.errorLayersList.push(layer.get("layerName"));
        const response = await axios.get(e.image.src_);
        const xmlDoc = new DOMParser().parseFromString(
          response.data,
          "text/xml"
        );
        const serviceException =
          xmlDoc.getElementsByTagName("ogc:ServiceException")[0] ||
          xmlDoc.getElementsByTagName("ServiceException")[0];
        // An error like 500 will trigger the catch.
        // "undefined" means there's actually no error.
        // Call refresh just to update the values and continue.
        if (serviceException === undefined) {
          this.refreshExpired(layer);
          this.$root.$emit("loadingStop");
          return;
        }
        const attrs = serviceException.attributes;
        if (
          "code" in attrs &&
          attrs["code"].nodeValue === "NoMatch" &&
          attrs["locator"].nodeValue === "time"
        ) {
          this.refreshExpired(layer);
        } else if (
          serviceException.textContent.includes("Unable to access file")
        ) {
          this.$root.$emit("cancelExpired");
          this.expiredTimestepList.push(layer.get("layerTimeStep"));
          let newExtent = [...layer.get("layerDateArray")];
          newExtent.splice(layer.get("layerDateIndex"), 1);
          if (newExtent.length === 0) {
            throw new Error("All of the layer's timesteps are broken");
          }
          let newDefaultTimeIndex = this.findLayerIndex(
            layer.get("layerDefaultTime"),
            newExtent,
            layer.get("layerTimeStep")
          );
          layer.setProperties({
            layerDateArray: newExtent,
            layerDateIndex: this.findLayerIndex(
              this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex],
              newExtent,
              layer.get("layerTimeStep")
            ),
            layerDefaultTime:
              newDefaultTimeIndex > 0
                ? newExtent[newDefaultTimeIndex]
                : newExtent[0],
            layerStartTime: newExtent[0],
            layerEndTime: newExtent[newExtent.length - 1],
          });
          this.errorLayersList = this.errorLayersList.filter(
            (l) => l !== layer.get("layerName")
          );
        } else if (
          "code" in attrs &&
          attrs["code"].nodeValue === "StyleNotDefined"
        ) {
          layer.getSource().updateParams({ STYLES: null });
          this.expiredSnackBarMessage = this.$t("StyleError");
          this.notifyExtentRebuilt = true;
          this.errorLayersList = this.errorLayersList.filter(
            (l) => l !== layer.get("layerName")
          );
        } else {
          this.$root.$emit("cancelExpired");
          this.$root.$emit("removeLayer", layer);
          this.expiredSnackBarMessage = this.$t("UnhandledError");
          console.log(e);
          this.notifyExtentRebuilt = true;
          this.errorLayersList = this.errorLayersList.filter(
            (l) => l !== layer.get("layerName")
          );
        }
      } catch (error) {
        if (this.playState === "play" && this.isLooping) {
          this.$root.$emit("cancelCriticalError", true);
          const name = layer.get("layerName");
          const timeoutId = setTimeout(() => {
            clearTimeout(this.timeoutHandles[name]["timeoutId"]);
            delete this.timeoutHandles[name];
            this.errorDispatcher(layer, e);
            this.$root.$emit("cancelCriticalError", false);
          }, 45000);
          if (name in this.timeoutHandles) {
            clearTimeout(this.timeoutHandles[name]["timeoutId"]);
            delete this.timeoutHandles[name];
          }
          this.timeoutHandles[name] = {
            timeoutId: timeoutId,
            params: [layer, e],
          };
          this.expiredSnackBarMessage = this.$t("LoopRetry");
          this.notifyExtentRebuilt = true;
          return;
        }
        this.$root.$emit("cancelExpired");
        this.$root.$emit("removeLayer", layer);
        this.expiredSnackBarMessage = this.$t("BrokenLayer");
        this.notifyExtentRebuilt = true;
        this.errorLayersList = this.errorLayersList.filter(
          (l) => l !== layer.get("layerName")
        );
      }
    },
    async refreshExpired(layer) {
      this.$root.$emit("cancelExpired");
      this.expiredTimestepList.push(layer.get("layerTimeStep"));
      let layerData = null;
      const currentMR = layer.get("layerCurrentMR");
      const api = axios.create({
        baseURL: layer.get("source")["url_"],
        params: {
          SERVICE: "WMS",
          VERSION: "1.3.0",
          REQUEST: "GetCapabilities",
          LAYERS: layer.get("layerName"),
          t: new Date().getTime(),
        },
      });
      await api.get().then((response) => {
        layerData = SaxonJS.XPath.evaluate(
          this.xsltTime.replace(
            "REPLACE_WITH_LAYERNAME",
            layer.get("layerName")
          ),
          null,
          {
            xpathDefaultNamespace: "http://www.opengis.net/wms",
            namespaceContext: {
              xlink: "http://www.w3.org/1999/xlink",
            },
            params: {
              xml: response.data,
            },
          }
        );
      });
      let newMRs =
        layerData.Dimension.Dimension_ref_time === ""
          ? null
          : this.findFormat(layerData.Dimension.Dimension_ref_time)[0][0];
      let sameMR = true;
      // Check if the model run was the problem and not the timestep
      if (currentMR !== null) {
        sameMR = false;
        for (let i = 0; i < newMRs.length; i++) {
          if (newMRs[i].getTime() === currentMR.getTime()) {
            sameMR = true;
            break;
          }
        }
      }
      const layerActiveConfig = layer.get("layerActiveConfig");
      let configs;
      if (
        layer.getSource().getParams().DIM_REFERENCE_TIME === undefined ||
        !sameMR
      ) {
        configs = this.createTimeLayerConfigs(
          layerData.Dimension.Dimension_time
        );
      } else {
        configs = layer.get("layerConfigs");
      }
      let newLayerIndex = this.findLayerIndex(
        this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex],
        configs[layerActiveConfig].layerDateArray,
        configs[layerActiveConfig].layerTimeStep
      );
      if (!sameMR) {
        layer.getSource().updateParams({
          DIM_REFERENCE_TIME: undefined,
        });
        if (newLayerIndex < 0) {
          layer.getSource().updateParams({
            TIME: this.getProperDateString(
              configs[layerActiveConfig].layerDateArray[0],
              configs[layerActiveConfig].dateFormat
            ),
          });
        }
      }
      let layerMR;
      if (
        (layer.getSource().getParams().DIM_REFERENCE_TIME === undefined ||
          !sameMR) &&
        currentMR !== null
      ) {
        layerMR = newMRs[newMRs.length - 1];
      } else {
        layerMR = layer.get("layerCurrentMR");
      }
      layer.setProperties({
        layerConfigs: configs,
        layerDateArray: configs[layerActiveConfig].layerDateArray,
        layerDateIndex: newLayerIndex,
        layerDefaultTime: new Date(layerData.Dimension.Dimension_time_default),
        layerDimensionRefTime: layerData.Dimension.Dimension_ref_time,
        layerDimensionTime: layerData.Dimension.Dimension_time,
        layerModelRuns: newMRs,
        layerCurrentMR: layerMR,
        layerStartTime: new Date(configs[layerActiveConfig].layerStartTime),
        layerEndTime: new Date(configs[layerActiveConfig].layerEndTime),
        layerTimeStep: configs[layerActiveConfig].layerTimeStep,
        layerTrueTimeStep: configs[layerActiveConfig].layerTrueTimeStep,
      });
      this.errorLayersList = this.errorLayersList.filter(
        (l) => l !== layer.get("layerName")
      );
    },
  },
  watch: {
    playState(newState, oldState) {
      if (newState !== "play" && oldState === "play") {
        this.clearAllTimeouts();
      }
    },
  },
  computed: {
    ...mapGetters("Layers", ["getDatetimeRangeSlider", "getMapTimeSettings"]),
    ...mapState("Layers", ["isAnimating", "isLooping", "playState"]),
  },
};
</script>

<style scoped>
.snackbar::v-deep .v-snack__wrapper {
  border-radius: 15px;
  bottom: 128px;
}
.snackMessage {
  white-space: pre-wrap;
}
</style>
