<template>
  <v-snackbar v-model="notifyExtentRebuilt" timeout="5000">
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
</template>

<script>
import axios from "axios";
import { mapGetters, mapState } from "vuex";
import SaxonJS from "saxon-js";

import datetimeManipulations from "../../mixins/datetimeManipulations";

export default {
  mixins: [datetimeManipulations],
  mounted() {
    this.$root.$on("checkLoadingErrors", this.checkExpiredOnMapMoveOrResize);
    this.$root.$on("fixTimeExtent", this.fixTimeExtent);
    this.$root.$on("loadingError", this.refreshExpired);
  },
  data() {
    return {
      expiredSnackBarMessage: this.$t("ExpiredExtentRefreshed"),
      expiredTimestepList: [],
      notifyExtentRebuilt: false,
      xsltTime: `parse-xml($xml)//Layer[not(.//Layer)]!map
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
    async checkExpiredOnMapMoveOrResize() {
      if (this.expiredTimestepList.length !== 0) {
        this.fixTimeExtent();
      }
    },
    fixTimeExtent() {
      let noChangeFlag = true;
      if (this.expiredTimestepList.includes(this.getMapTimeSettings.Step)) {
        noChangeFlag = false;
      }
      this.expiredTimestepList = [];
      if (noChangeFlag) {
        this.expiredSnackBarMessage = this.$t("expiredSecondaryLayer");
        this.notifyExtentRebuilt = true;
        if (this.isAnimating) {
          this.$root.$emit("redoAnimation");
        } else {
          this.$root.$emit("fixLayerTimes");
        }
      } else {
        if (this.getMapTimeSettings.SnappedLayer !== null) {
          this.changeMapTime(
            this.getMapTimeSettings.Step,
            this.$mapLayers.arr.find(
              (l) => l.get("layerName") === this.getMapTimeSettings.SnappedLayer
            ),
            0
          );
          this.expiredSnackBarMessage = this.$t("ExpiredExtentRefreshed");
          this.notifyExtentRebuilt = true;
          if (this.isAnimating) {
            this.$root.$emit("redoAnimation");
          }
        } else {
          const currentHighBoundDate =
            this.getMapTimeSettings.Extent[this.datetimeRangeSlider[1]];
          this.changeMapTime(this.getMapTimeSettings.Step, null, 0);
          if (this.getMapTimeSettings.Extent[0] >= currentHighBoundDate) {
            // Cancel animation
            this.expiredSnackBarMessage = this.$t("extentFullyOOB");
            this.notifyExtentRebuilt = true;
            this.$store.commit("Layers/setDatetimeRangeSlider", [
              0,
              this.getMapTimeSettings.Extent.length - 1,
            ]);
            if (this.isAnimating) {
              this.$root.$emit("restoreState");
            }
          } else {
            const highBoundIndex =
              this.datetimeRangeSlider[1] - this.datetimeRangeSlider[0];
            this.expiredSnackBarMessage = this.$t("ExpiredExtentRefreshed");
            this.notifyExtentRebuilt = true;
            this.$store.commit("Layers/setDatetimeRangeSlider", [
              0,
              highBoundIndex,
            ]);
            if (this.isAnimating) {
              this.$root.$emit("redoAnimation");
            }
          }
        }
      }
    },
    async refreshExpired(layer) {
      this.$root.$emit("cancelExpired");
      this.expiredTimestepList.push(layer.get("layerTimeStep"));
      var layerData = null;
      const api = axios.create({
        baseURL: layer.get("source")["url_"],
        params: {
          service: "WMS",
          version: "1.3.0",
          request: "GetCapabilities",
          LANG: this.$i18n.locale,
          LAYER: layer.get("layerName"),
          t: new Date().getTime(),
        },
      });
      await api.get().then((response) => {
        layerData = SaxonJS.XPath.evaluate(this.xsltTime, null, {
          xpathDefaultNamespace: "http://www.opengis.net/wms",
          namespaceContext: {
            xlink: "http://www.w3.org/1999/xlink",
          },
          params: {
            xml: response.data,
          },
        });
      });
      let [start, end, step] = layerData.Dimension.Dimension_time.split("/");
      let extentDateArray = this.getDateArray(
        layerData.Dimension.Dimension_time
      )[0];
      const newLayerIndex = this.findLayerIndex(
        this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex],
        extentDateArray,
        step
      );
      layer.setProperties({
        layerDateArray: extentDateArray,
        layerDateIndex: newLayerIndex,
        layerDefaultTime: new Date(layerData.Dimension.Dimension_time_default),
        layerModelRuns:
          layerData.Dimension.Dimension_ref_time === ""
            ? null
            : this.getDateArray(layerData.Dimension.Dimension_ref_time)[0],
        layerStartTime: new Date(start),
        layerEndTime: new Date(end),
        layerTimeStep: step,
      });
    },
  },
  computed: {
    ...mapGetters("Layers", ["getDatetimeRangeSlider", "getMapTimeSettings"]),
    ...mapState("Layers", ["isAnimating"]),
    datetimeRangeSlider: {
      get() {
        return this.getDatetimeRangeSlider;
      },
      set(dateRange) {
        this.$store.commit("Layers/setDatetimeRangeSlider", dateRange);
      },
    },
  },
};
</script>
