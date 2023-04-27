<template>
  <div class="map-container">
    <div ref="map" class="map" id="map" :disabled="isAnimating">
      <v-btn
        id="customZoomPlus"
        color="primary"
        elevation="4"
        fab
        x-small
        class="ma-2"
        absolute
        @click="zoomIn"
        :disabled="isAnimating"
      >
        <v-icon>mdi-plus</v-icon>
      </v-btn>

      <v-btn
        id="customZoomMinus"
        color="primary"
        elevation="4"
        fab
        x-small
        class="ml-2 mt-11"
        absolute
        @click="zoomOut"
        :disabled="isAnimating"
      >
        <v-icon>mdi-minus</v-icon>
      </v-btn>
      <div id="expandableCustomControl" fluid class="ml-2">
        <v-menu
          bottom
          offset-y
          nudge-bottom="10"
          nudge-left="5"
          content-class="white black--text"
        >
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              color="primary"
              v-bind="attrs"
              v-on="on"
              x-small
              fab
              :disabled="isAnimating"
            >
              <v-icon>
                {{
                  attrs["aria-expanded"] === "true"
                    ? "mdi-menu-up"
                    : "mdi-menu-down"
                }}
              </v-icon>
            </v-btn>
          </template>
          <v-container @click.stop>
            <v-color-picker
              dot-size="20"
              mode="rgba"
              swatches-max-height="100"
              v-model="color"
            ></v-color-picker>
            <v-row cols="auto" class="d-flex justify-end">
              <v-tooltip bottom>
                <template v-slot:activator="{ on, attrs }">
                  <v-btn
                    icon
                    @click="applyColor"
                    color="primary"
                    fab
                    v-bind="attrs"
                    v-on="on"
                  >
                    <v-icon>mdi-spray</v-icon>
                  </v-btn>
                </template>
                <span>{{ $t("ApplyColor") }}</span>
              </v-tooltip>
              <v-tooltip bottom>
                <template v-slot:activator="{ on, attrs }">
                  <v-btn
                    icon
                    @click="darkBasemapHandler(false)"
                    color="primary"
                    fab
                    v-bind="attrs"
                    v-on="on"
                  >
                    <v-icon>mdi-undo</v-icon>
                  </v-btn>
                </template>
                <span>{{ $t("RevertColor") }}</span>
              </v-tooltip>
            </v-row>
          </v-container>
        </v-menu>
      </div>
      <div id="legendMapOverlay">
        <img
          id="mapLegend"
          crossorigin="anonymous"
          :src="getMapLegendURL"
          v-if="getMapTimeSettings.MapLegendLayer !== null"
        />
      </div>
    </div>
    <v-progress-linear :class="{ invisible: !loadingFlag }" indeterminate />
    <v-row
      id="mapAnimationControls"
      v-if="getControlsFlag && getMapTimeSettings.Step !== null"
      class="justify-space-between"
    >
      <v-col sm="4" md="6" class="d-flex">
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              @click="rewindBackToStart()"
              icon
              large
              color="primary"
              v-bind="attrs"
              v-on="on"
              :disabled="
                getMapTimeSettings.DateIndex === datetimeRangeSlider[0] ||
                isAnimating ||
                animationID !== null
              "
            >
              <v-icon>mdi-skip-backward</v-icon>
            </v-btn>
          </template>
          <span>{{ $t("MapRewindBackAll") }}</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              @click="rewindBackOneStep()"
              icon
              large
              color="primary"
              v-bind="attrs"
              v-on="on"
              :disabled="
                getMapTimeSettings.DateIndex === datetimeRangeSlider[0] ||
                isAnimating ||
                animationID !== null
              "
            >
              <v-icon>mdi-skip-previous</v-icon>
            </v-btn>
          </template>
          <span>{{ $t("MapRewindBackOne") }}</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              @click="playPause()"
              icon
              large
              color="primary"
              :disabled="
                getMapTimeSettings.DateIndex === datetimeRangeSlider[1] ||
                isAnimating
              "
              v-bind="attrs"
              v-on="on"
            >
              <v-icon>
                {{ playPauseFlag ? "mdi-pause" : "mdi-play" }}
              </v-icon>
            </v-btn>
          </template>
          <span>{{ $t("MapPlay") }}</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              @click="windForwardOneStep()"
              icon
              large
              color="primary"
              v-bind="attrs"
              v-on="on"
              :disabled="
                getMapTimeSettings.DateIndex === datetimeRangeSlider[1] ||
                isAnimating ||
                animationID !== null
              "
            >
              <v-icon>mdi-skip-next</v-icon>
            </v-btn>
          </template>
          <span>{{ $t("MapJumpForwardOne") }}</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              @click="windForwardToEnd()"
              icon
              large
              color="primary"
              v-bind="attrs"
              v-on="on"
              :disabled="
                getMapTimeSettings.DateIndex === datetimeRangeSlider[1] ||
                isAnimating ||
                animationID !== null
              "
            >
              <v-icon>mdi-skip-forward</v-icon>
            </v-btn>
          </template>
          <span>{{ $t("MapJumpForwardAll") }}</span>
        </v-tooltip>
      </v-col>
      <v-col sm="8" md="6" class="text-right">
        <div class="text-primary text-caption">
          {{
            this.localeDateFormat(
              this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex],
              this.getMapTimeSettings.Step
            )
          }}
        </div>
        <!-- display ref time on sm+ screns only -->
        <div
          v-if="displayReferenceTime"
          class="text-secondary text-caption d-none d-sm-block model-run"
        >
          <div v-for="line in modelRunMessage" :key="line">
            {{ line }}
          </div>
        </div>
      </v-col>
      <!-- display ref time on xs screens only -->
      <v-col v-if="displayReferenceTime" cols="12" class="d-flex d-sm-none">
        <div class="text-secondary text-caption">
          <div v-for="line in modelRunMessage" :key="line">
            {{ line }}
          </div>
        </div>
      </v-col>
    </v-row>
    <v-snackbar v-model="notifyCancelAnimateResize" timeout="5000">
      {{ $t("MP4CreateNotifyCancelAnimation") }}
      <template v-slot:action="{ attrs }">
        <v-btn
          color="warning"
          text
          v-bind="attrs"
          @click="notifyCancelAnimateResize = false"
        >
          {{ $t("close") }}
        </v-btn>
      </template>
    </v-snackbar>
    <v-snackbar v-model="notifyExtentRebuilt" timeout="5000">
      {{ expiredSnackBarMessage }}
      <template v-slot:action="{ attrs }">
        <v-btn
          color="warning"
          text
          v-bind="attrs"
          @click="notifyExtentRebuilt = false"
        >
          {{ $t("close") }}
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script>
import axios from "axios";
import canvasTxt from "canvas-txt";
import ImageWMS from "ol/source/ImageWMS";
import Map from "ol/Map";
import OLImage from "ol/layer/Image";
import OSM from "ol/source/OSM";
import parseDuration from "../assets/parseHelper";
import SaxonJS from "saxon-js";
import TileLayer from "ol/layer/Tile";
import View from "ol/View";
import "ol/ol.css";
import { Control, Attribution } from "ol/control";
import { DateTime } from "luxon";
import { fromLonLat } from "ol/proj";
import { mapGetters } from "vuex";
import { mapState } from "vuex";

import * as HME from "h264-mp4-encoder";

export default {
  async mounted() {
    this.$root.$on("adjustMapTime", this.mapControls);
    this.$root.$on("cancelAnimationCreation", this.cancelAnimationCreation);
    this.$root.$on("changeStyle", this.changeStyleHandler);
    this.$root.$on("createMP4", this.createMP4Handler);
    this.$root.$on("darkModeMapEvent", (flag) => {
      if (flag) {
        this.setColor();
      }
      this.darkBasemapHandler(flag);
    });
    this.$root.$on("darkModeOSM", this.darkModeOSMHandler);
    this.$root.$on("generatePermaLink", this.permaLinkHandler);
    this.$root.$on("getExtent", this.getExtent);
    this.$root.$on("goToExtent", this.goToExtentHandler);
    this.$root.$on("layerAdded", this.addLayerHandler);
    this.$root.$on("layerAdded", this.getModelRuns);
    this.$root.$on("localeChange", this.getModelRuns);
    this.$root.$on("removeLayer", this.getModelRuns);
    this.$root.$on("removeLayer", this.removeLayerHandler);
    this.$root.$on("setMapSize", (wh) => {
      document.getElementById("map").style.width = `${wh[0]}px`;
      document.getElementById("map").style.height = `${wh[1]}px`;
      this.map.updateSize();
    });
    this.$root.$on("setOpacity", this.setOpacityHandler);
    this.$root.$on("setVisibility", this.setVisibleHandler);
    this.$root.$on("setZIndex", this.setZIndexHandler);
    this.$root.$on("specialLayerToggle", this.addSpecialLayer);

    let legendMapOverlay = new Control({
      element: document.getElementById("legendMapOverlay"),
    });
    let zoomPlus = new Control({
      element: document.getElementById("customZoomPlus"),
    });
    let zoomMinus = new Control({
      element: document.getElementById("customZoomMinus"),
    });
    let expandableCustomControl = new Control({
      element: document.getElementById("expandableCustomControl"),
    });
    let attribution = new Attribution();

    this.map = new Map({
      target: this.$refs["map"],
      layers: [this.osm],
      view: new View({
        center: fromLonLat([-90, 55]),
        zoom: 4,
        maxZoom: 12,
      }),
      pixelRatio: 1,
      controls: [], // defaultControls({ attribution: true }),
    });

    this.map.addControl(attribution);
    this.map.addControl(zoomPlus);
    this.map.addControl(zoomMinus);
    this.map.addControl(expandableCustomControl);
    this.map.addControl(legendMapOverlay);

    this.map.on("moveend", this.resizeRefreshExpired);

    new ResizeObserver(() => {
      this.map.updateSize();
    }).observe(this.$refs.map);

    // cancel animation creations on window resize avoid Safari bug
    window.addEventListener("resize", this.cancelAnimationFromResize);
  },
  unmounted() {
    // cleanup
    window.removeEventListener("resize", this.cancelAnimationFromResize);
  },
  methods: {
    applyColor() {
      this.$root.$emit("darkBasemapSwichOff");
      this.darkBasemapHandler(true);
    },
    cancelAnimationFromResize() {
      if (this.isAnimating) {
        this.notifyCancelAnimateResize = true;
        this.cancelAnimationCreation();
      }
    },
    cancelAnimationCreation() {
      this.cancelFlag = false;
    },
    getExtent() {
      const extent = this.map.getView().calculateExtent();
      this.$store.dispatch("Layers/setExtent", extent);
    },
    goToExtentHandler(locExtent) {
      this.map.getView().fit(locExtent);
    },
    async addLayerHandler(layer, wmsSource = null) {
      let addedLayer = null;
      let layerDateIndex = 0;
      if (layer.isTemporal) {
        addedLayer = new OLImage({
          source: new ImageWMS({
            format: "image/png",
            url: wmsSource === null ? this.getCurrentWmsSource : wmsSource,
            params: { LAYERS: layer.Name },
            transition: 0,
            crossOrigin: "Anonymous",
            ratio: 1,
          }),
          maxZoom: 12.1,
          minZoom: 0.9,
          visible: layer.Visible,
          opacity: layer.Opacity,
          zIndex: Object.hasOwn(layer, "ZIndex") ? layer.ZIndex : 10,
        });
        addedLayer.setProperties({
          layerName: layer.Name,
          layerIsVisible: layer.Visible,
          layerStartTime: layer.dateTriplet[0],
          layerEndTime: layer.dateTriplet[1],
          layerTimeStep: layer.dateTriplet[2],
          layerDateArray: layer.extentDateArray,
          layerZIndex: Object.hasOwn(layer, "ZIndex") ? layer.ZIndex : 10,
          layerIsTemporal: layer.isTemporal,
          layerStyles: layer.Style,
          layerCurrentStyle: Object.hasOwn(layer, "currentStyle")
            ? layer.currentStyle
            : layer.Style[0].Name,
        });
        layerDateIndex = this.findLayerIndex(
          this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex],
          addedLayer.get("layerDateArray"),
          addedLayer.get("layerTimeStep")
        );
        addedLayer.setProperties({
          layerDateIndex: layerDateIndex,
        });
        if (layerDateIndex < 0) {
          addedLayer.getSource().updateParams({
            TIME: this.getProperDateString(
              addedLayer.get("layerDateArray")[0],
              addedLayer.get("layerTimeStep")
            ),
          });
        } else {
          addedLayer.getSource().updateParams({
            TIME: this.getProperDateString(
              addedLayer.get("layerDateArray")[layerDateIndex],
              addedLayer.get("layerTimeStep")
            ),
          });
          this.$root.$emit(
            "setCurrentTime",
            addedLayer.get("layerName"),
            addedLayer.get("layerDateArray")[layerDateIndex]
          );
        }
      } else {
        addedLayer = new OLImage({
          source: new ImageWMS({
            format: "image/png",
            url: wmsSource === null ? this.getCurrentWmsSource : wmsSource,
            params: { LAYERS: layer.Name },
            transition: 0,
            crossOrigin: "Anonymous",
            ratio: 1,
          }),
          maxZoom: 12.1,
          minZoom: 0.9,
          visible: layer.Visible,
          opacity: layer.Opacity,
          zIndex: Object.hasOwn(layer, "ZIndex") ? layer.ZIndex : 10,
        });
        addedLayer.setProperties({
          layerName: layer.Name,
          layerIsVisible: layer.Visible,
          layerZIndex: layer.ZIndex,
          layerIsTemporal: layer.isTemporal,
          layerStyles: layer.Style,
          layerCurrentStyle: Object.hasOwn(layer, "currentStyle")
            ? layer.currentStyle
            : layer.Style[0].Name,
        });
        if (this.getMapTimeSettings.Step === null) {
          this.$store.dispatch("Layers/setMapLegendLayer", layer);
        }
      }

      this.$store.commit("Layers/setLayerProperty", [
        layer.Name,
        "legendURL",
        addedLayer.get("source")["url_"],
      ]);

      addedLayer.getSource().on("imageloadstart", () => {
        this.loadingFlag = true;
      });

      addedLayer.getSource().on("imageloadend", () => {
        this.loadingFlag = false;
      });

      addedLayer.getSource().on("imageloaderror", () => {
        this.refreshExpired(addedLayer);
        // this.loadingFlag = false;
      });

      addedLayer.getSource().updateParams({
        STYLES: addedLayer.get("layerCurrentStyle"),
      });

      this.map.addLayer(addedLayer);

      if (layer.isTemporal) {
        if (this.getMapTimeSettings.Step === layer.dateTriplet[2]) {
          if (
            (this.getMapTimeSettings.SnappedLayer !== null &&
              this.getMapTimeSettings.SnappedLayer.Name !== layer.Name) ||
            this.getMapTimeSettings.SnappedLayer === null
          ) {
            this.$root.$emit("rangeSliderAdjust", layer.dateTriplet[2]);
          }
        }
      }

      if (layerDateIndex < 0) {
        addedLayer.setVisible(false);
        this.$root.$emit(
          "setIndexOOB",
          addedLayer.get("layerName"),
          this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex],
          addedLayer.get("layerDateArray")[
            layerDateIndex === -1
              ? 0
              : addedLayer.get("layerDateArray").length - 1
          ]
        );
      }
    },
    async removeLayerHandler(removedLayerName) {
      this.map
        .getLayers()
        .getArray()
        .filter((layer) => layer.get("layerName") === removedLayerName)
        .forEach((layer) => this.map.removeLayer(layer));
    },
    getProperDateString(date, timestep) {
      if (timestep === "P1Y") {
        return `${date.getFullYear()}`;
      } else if (timestep === "P1M") {
        let month = date.getMonth() + 1;
        if (month < 10) {
          month = "0" + month;
        }
        let year = date.getFullYear();
        return year + "-" + month;
      }
      return date.toISOString().split(".")[0] + "Z";
    },
    async resizeRefreshExpired() {
      await new Promise((resolve) => this.map.once("rendercomplete", resolve));
      if (this.expiredTimestepList.length !== 0) {
        this.fixTimeExtent();
        this.expiredTimestepList = [];
      }
    },
    async refreshExpired(layer) {
      this.expiredTimestepList.push(layer);
      var layerData = null;
      let this_ = this;
      const api = axios.create({
        baseURL: this.getCurrentWmsSource,
        params: {
          service: "WMS",
          version: "1.3.0",
          request: "GetCapabilities",
          LANG: this_.$i18n.locale,
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
      const dateTriplet = this.getStartEndTime(
        layerData.Dimension.Dimension_time
      );
      const extentDateArray = this.getDateArray(
        dateTriplet[0],
        dateTriplet[1],
        dateTriplet[2]
      );
      const newLayerIndex = this.findLayerIndex(
        this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex],
        extentDateArray,
        dateTriplet[2]
      );
      this.$store.commit("Layers/setLayerProperty", [
        layer.get("layerName"),
        "dateTriplet",
        dateTriplet,
      ]);
      this.$store.commit("Layers/setLayerProperty", [
        layer.get("layerName"),
        "extentDateArray",
        extentDateArray,
      ]);
      this.$store.commit("Layers/setLayerProperty", [
        layer.get("layerName"),
        "default_time",
        new Date(layerData.Dimension.Dimension_time_default),
      ]);
      if (layerData.Dimension.Dimension_ref_time !== "") {
        this.$store.commit("Layers/setLayerProperty", [
          layer.get("layerName"),
          "ReferenceTime",
          this.getStartEndTime(layerData.Dimension.Dimension_ref_time)[1],
        ]);
      }
      layer.setProperties({
        layerStartTime: dateTriplet[0],
        layerEndTime: dateTriplet[1],
        layerTimeStep: dateTriplet[2],
        layerDateArray: extentDateArray,
        layerDateIndex: newLayerIndex,
      });
      this.$root.$emit(
        "refreshExpired",
        layer.get("layerName"),
        dateTriplet,
        extentDateArray
      );
      this.setDateTime(layer, layer.get("layerStartTime"));
    },
    getStartEndTime(layerDimension) {
      var data = layerDimension.split("/");
      if (data.length === 1) {
        return [null, new Date(data[0]), null];
      }
      return [new Date(data[0]), new Date(data[1]), data[2]];
    },
    getDateArray(start, end, step) {
      let tempDareArray = new Array();
      let tempDate = start;
      let nextDate = parseDuration(step).add;
      while (tempDate <= end) {
        tempDareArray.push(tempDate);
        tempDate = nextDate(tempDate);
      }
      return tempDareArray;
    },
    getTimeTitleWidths(mapDivWidth) {
      if (mapDivWidth < 600) {
        return [280, 300];
      } else {
        return [mapDivWidth - 320, 300];
      }
    },
    getModelRuns() {
      let modelRuns = {};
      const timeLayers = this.getLayerList.filter((l) => l.isTemporal);
      for (let i = 0; i < timeLayers.length; i++) {
        if (
          Object.hasOwn(timeLayers[i], "ReferenceTime") &&
          !isNaN(timeLayers[i].ReferenceTime)
        ) {
          const refTime = timeLayers[i].ReferenceTime;
          if (refTime in modelRuns) {
            modelRuns[refTime].push(timeLayers[i].Name);
          } else {
            modelRuns[refTime] = [timeLayers[i].Name];
          }
        }
      }
      if (Object.keys(modelRuns).length === 0) {
        this.modelRunMessage = null;
      } else if (Object.keys(modelRuns).length === 1) {
        this.modelRunMessage = [
          `${this.$t("modelRun")}${this.$t("colon")} ${this.localeDateFormat(
            new Date(Date.parse(Object.keys(modelRuns)[0]))
          )}`,
        ];
      } else {
        let message = [];
        for (const [key, values] of Object.entries(modelRuns)) {
          message.push(
            `${this.$t("modelRun")}${this.$t("colon")} ${this.localeDateFormat(
              new Date(Date.parse(key))
            )}`
          );
          for (let i = 0; i < values.length; i++) {
            message.push("  - " + values[i]);
          }
        }
        this.modelRunMessage = message;
      }
    },
    permaLinkHandler() {
      this.$store.dispatch("Layers/setOutputWH", [
        this.mapWidth,
        this.mapHeight,
      ]);
      let rgb = [];
      if (this.isMapColored) {
        rgb = [this.rgb.r, this.rgb.g, this.rgb.b];
      }
      this.$store.dispatch("Layers/setRGB", rgb);
    },
    async createMP4Handler() {
      this.cancelFlag = true;
      this.$store.dispatch("Layers/setIsAnimating", true);
      this.getExtent();
      this.evenSize();
      this.map.updateSize();
      let mapDiv = document.getElementById("map");
      this.$store.dispatch("Layers/setOutputWH", [
        this.mapWidth,
        this.mapHeight,
      ]);
      this.$store.dispatch(
        "Layers/setExportStyle",
        `max-width: ${this.mapWidth}px max-height: ${this.mapHeight}px width: 100% height: 100%`
      );
      mapDiv.style.resize = "none";
      this.map.getInteractions().forEach((x) => x.setActive(false));
      const mapWidthConst = this.mapWidth;
      const widths = this.getTimeTitleWidths(mapWidthConst);
      let visibleLayers = this.map
        .getLayers()
        .getArray()
        .filter((l) => {
          return l.get("layerIsVisible") && l instanceof OLImage;
        });
      const orderedVisibleLayers = this.getOrderedLayers.filter(
        (layerName) =>
          visibleLayers.filter((l) => l.get("layerName") === layerName)
            .length !== 0
      );
      visibleLayers.sort(
        (a, b) =>
          orderedVisibleLayers.indexOf(a.get("layerName")) -
          orderedVisibleLayers.indexOf(b.get("layerName"))
      );
      this.infoCanvas = this.getInfoCanvas(
        this.mapWidth,
        visibleLayers,
        widths,
        this.animationTitle
      );
      const encoder = await HME.createH264MP4Encoder();
      encoder.width = mapDiv.offsetWidth;
      encoder.height =
        this.mapHeight + this.infoCanvas.height + this.outputHeader.height;
      encoder.frameRate = this.framesPerSecond;
      encoder.quantizationParameter = 30;
      encoder.initialize();

      const MP4Length =
        this.datetimeRangeSlider[1] - this.datetimeRangeSlider[0] + 1;
      let progressCounter = 1;
      const initialState = this.getMapTimeSettings.DateIndex;
      this.$store.dispatch(
        "Layers/setMapTimeIndex",
        this.datetimeRangeSlider[0]
      );
      for (
        let i = this.datetimeRangeSlider[0];
        i <= this.datetimeRangeSlider[1];
        i++, progressCounter++
      ) {
        if (this.cancelFlag === false) {
          break;
        }
        if (this.cancelFlag === true) {
          for (let j = 0; j < visibleLayers.length; j++) {
            if (visibleLayers[j].get("layerIsTemporal")) {
              let tempDA = visibleLayers[j].get("layerDateArray");
              const layerDateIndex = this.findLayerIndex(
                this.getMapTimeSettings.Extent[i],
                tempDA,
                visibleLayers[j].get("layerTimeStep")
              );
              const sameIndex =
                layerDateIndex === visibleLayers[j].get("layerDateIndex") ||
                (layerDateIndex < 0 &&
                  visibleLayers[j].get("layerDateIndex") < 0);
              if (sameIndex && layerDateIndex < 0) {
                this.$root.$emit(
                  "setIndexOOB",
                  visibleLayers[j].get("layerName"),
                  this.getMapTimeSettings.Extent[
                    this.getMapTimeSettings.DateIndex
                  ],
                  visibleLayers[j].get("layerDateArray")[
                    layerDateIndex === -1
                      ? 0
                      : visibleLayers[j].get("layerDateArray").length - 1
                  ]
                );
              } else if (!sameIndex) {
                if (layerDateIndex < 0) {
                  visibleLayers[j].setProperties({
                    layerDateIndex: layerDateIndex,
                  });
                  visibleLayers[j].setVisible(false);
                  this.$root.$emit(
                    "setIndexOOB",
                    visibleLayers[j].get("layerName"),
                    this.getMapTimeSettings.Extent[
                      this.getMapTimeSettings.DateIndex
                    ],
                    visibleLayers[j].get("layerDateArray")[
                      layerDateIndex === -1
                        ? 0
                        : visibleLayers[j].get("layerDateArray").length - 1
                    ]
                  );
                } else if (visibleLayers[j].get("layerDateIndex") < 0) {
                  visibleLayers[j].setProperties({
                    layerDateIndex: layerDateIndex,
                  });
                  this.$root.$emit(
                    "setCurrentTime",
                    visibleLayers[j].get("layerName"),
                    visibleLayers[j].get("layerDateArray")[layerDateIndex]
                  );
                  visibleLayers[j].setVisible(true);
                  this.$root.$emit(
                    "setIndexOOB",
                    visibleLayers[j].get("layerName")
                  );
                  this.setDateTime(visibleLayers[j], tempDA[layerDateIndex]);
                } else {
                  visibleLayers[j].setProperties({
                    layerDateIndex: layerDateIndex,
                  });
                  this.$root.$emit(
                    "setCurrentTime",
                    visibleLayers[j].get("layerName"),
                    visibleLayers[j].get("layerDateArray")[layerDateIndex]
                  );
                  this.setDateTime(visibleLayers[j], tempDA[layerDateIndex]);
                }
              }
            }
          }
          await new Promise((resolve) =>
            this.map.once("rendercomplete", resolve)
          );
          if (this.expiredTimestepList.length !== 0) {
            this.$store.dispatch("Layers/setMapTimeIndex", initialState);
            this.mapControls();

            const redoAnimation = this.fixTimeExtent();
            if (!redoAnimation) {
              this.expiredTimestepList = [];
              this.cancelFlag = false;
            }
            break;
          }
          await this.composeCanvas(
            this.getMapTimeSettings.Extent[i],
            widths,
            encoder
          );
          this.$store.dispatch(
            "Layers/setMP4Percent",
            Math.round((progressCounter / MP4Length) * 100)
          );
        }
        this.$store.dispatch(
          "Layers/setMapTimeIndex",
          this.getMapTimeSettings.DateIndex + 1
        );
      }
      if (this.expiredTimestepList.length !== 0) {
        this.expiredTimestepList = [];
        this.createMP4Handler();
        return;
      }
      this.$store.dispatch("Layers/setMapTimeIndex", initialState);
      this.mapControls();

      this.$store.dispatch("Layers/setMP4Percent", 0);
      this.$store.dispatch("Layers/setMP4CreateFlag", false);
      encoder.finalize();
      const uint8Array = encoder.FS.readFile(encoder.outputFilename);
      const animationBlob = new Blob([uint8Array], { type: "video/mp4" });
      this.$store.dispatch("Layers/setOutputSize", animationBlob.size);
      const mp4URL = URL.createObjectURL(animationBlob);
      encoder.delete();
      this.$store.dispatch("Layers/setMP4CreateFlag", true);
      this.$store.dispatch("Layers/setIsAnimating", false);
      if (this.cancelFlag === true) {
        this.$store.dispatch("Layers/setMP4URL", mp4URL);
      }
      this.loadingFlag = false;
      this.map.getInteractions().forEach((x) => x.setActive(true)); // Enables all map interactions such as drag or zoom
      mapDiv.style.resize = "both"; // Enables map div resizing
    },
    async composeCanvas(date, widths, encoder) {
      this.map.updateSize();
      const mapCnv = this.getMapCanvas();
      if (this.getMapTimeSettings.MapLegendLayer !== null) {
        const mapLegend = document.getElementById("mapLegend");
        mapCnv
          .getContext("2d")
          .drawImage(
            mapLegend,
            mapCnv.width - mapLegend.naturalWidth,
            0,
            mapLegend.naturalWidth,
            mapLegend.naturalHeight
          ); // drawImage(image, dx, dy, dWidth, dHeight)
      }
      await this.updateInfoCanvas(date, widths);
      const composedCnv = await this.stitchCanvases(mapCnv);
      try {
        encoder.addFrameRgba(
          composedCnv
            .getContext("2d")
            .getImageData(0, 0, composedCnv.width, composedCnv.height).data
        );
      } catch (error) {
        console.error(
          "Crashed from addFrameRgba because the size of the Map was changed during animation creation."
        );
        this.cancelAnimationCreation();
      }
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
    },
    changeMapTime(timestep, snappedLayer = null) {
      const timeLayers = this.getLayerList.filter(
        (l) => l.isTemporal && l.dateTriplet[2] === timestep
      );
      let arrayCombine = timeLayers[0].extentDateArray;
      if (timeLayers.length > 1) {
        let layerDateArrays = [];
        for (let i = 0; i < timeLayers.length; i++) {
          layerDateArrays.push(timeLayers[i].extentDateArray);
        }

        for (let i = 1; i < layerDateArrays.length; i++) {
          // Cases covered:
          //  Both extents the same, both same start but not same end
          if (arrayCombine[0].getTime() === layerDateArrays[i][0].getTime()) {
            if (arrayCombine.length < layerDateArrays[i].length) {
              arrayCombine = layerDateArrays[i].slice(0);
            }
            // Cases covered:
            //  Both same end but not same start
          } else if (
            arrayCombine[arrayCombine.length - 1].getTime() ===
            layerDateArrays[i][layerDateArrays[i].length - 1].getTime()
          ) {
            if (arrayCombine.length < layerDateArrays[i].length) {
              arrayCombine = layerDateArrays[i].slice(0);
            }
          } else {
            let j = 0;
            let k = 0;
            let tempArray = [];
            while (j < arrayCombine.length && k < layerDateArrays[i].length) {
              if (
                arrayCombine[j].getTime() === layerDateArrays[i][k].getTime()
              ) {
                tempArray.push(arrayCombine[j]);
                j++;
                k++;
              } else if (arrayCombine[j] < layerDateArrays[i][k]) {
                tempArray.push(arrayCombine[j]);
                j++;
              } else {
                tempArray.push(layerDateArrays[i][k]);
                k++;
              }
            }
            if (j === arrayCombine.length) {
              tempArray = tempArray.concat(layerDateArrays[i].slice(k));
            } else {
              tempArray = tempArray.concat(arrayCombine.slice(j));
            }
            arrayCombine = tempArray.slice(0);
          }
        }
      }

      let dateIndex = this.findLayerIndex(
        timeLayers[0].default_time,
        timeLayers[0].extentDateArray,
        timeLayers[0].dateTriplet[2]
      );
      if (timestep === this.getMapTimeSettings.Step) {
        const currentDateIndex = this.findLayerIndex(
          this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex],
          arrayCombine,
          timestep
        );
        if (currentDateIndex >= 0) {
          dateIndex = currentDateIndex;
        }
      }
      if (snappedLayer === null) {
        if (this.getMapTimeSettings.SnappedLayer !== null) {
          if (
            timeLayers.filter(
              (l) => l.Name === this.getMapTimeSettings.SnappedLayer.Name
            ).length !== 0
          ) {
            snappedLayer = this.getMapTimeSettings.SnappedLayer;
          }
        }
      }
      const mapTimeSettings = {
        SnappedLayer: snappedLayer,
        Step: timestep,
        DateIndex: dateIndex,
        Extent: arrayCombine,
        MapLegendLayer:
          this.getLayerList.filter(
            (l) => l.Name === this.getMapTimeSettings.MapLegendLayer.Name
          ).length !== 0
            ? this.getMapTimeSettings.MapLegendLayer
            : timeLayers[0],
      };
      this.$store.dispatch("Layers/setMapTimeSettings", mapTimeSettings);
      if (snappedLayer !== null) {
        const first = this.findLayerIndex(
          snappedLayer.extentDateArray[0],
          arrayCombine,
          snappedLayer.dateTriplet[2]
        );
        const last = this.findLayerIndex(
          snappedLayer.extentDateArray[snappedLayer.extentDateArray.length - 1],
          arrayCombine,
          snappedLayer.dateTriplet[2]
        );
        this.$store.commit("Layers/setDatetimeRangeSlider", [first, last]);
      }
    },
    async stitchCanvases(mapCanvas) {
      return new Promise((resolve) => {
        let composedCnv = document.createElement("canvas");
        let ctx = composedCnv.getContext("2d");
        let ctx_w = mapCanvas.width;
        let ctx_h =
          this.outputHeader.height + mapCanvas.height + this.infoCanvas.height;

        composedCnv.width = ctx_w;
        composedCnv.height = ctx_h;

        [
          {
            cnv: this.outputHeader,
            y: 0,
          },
          {
            cnv: mapCanvas,
            y: this.outputHeader.height,
          },
          {
            cnv: this.infoCanvas,
            y: this.outputHeader.height + mapCanvas.height,
          },
        ].forEach((n) => {
          ctx.beginPath();
          ctx.drawImage(n.cnv, 0, n.y, ctx_w, n.cnv.height);
        });

        resolve(composedCnv);
      });
    },
    async setDateTime(layer, date) {
      layer.getSource().updateParams({
        TIME: this.getProperDateString(date, layer.get("layerTimeStep")),
      });
    },
    setOpacityHandler(layerName, opacity) {
      this.map
        .getLayers()
        .getArray()
        .find((layer) => layer.get("layerName") === layerName)
        .setOpacity(opacity);
      this.$store.commit("Layers/setLayerProperty", [
        layerName,
        "Opacity",
        opacity,
      ]);
    },
    setZIndexHandler(layerName, zIndex) {
      this.map
        .getLayers()
        .getArray()
        .find((layer) => layer.get("layerName") === layerName)
        .setZIndex(zIndex);
    },
    setVisibleHandler(layerName, visible) {
      var layer = this.map
        .getLayers()
        .getArray()
        .find((layer) => layer.get("layerName") === layerName);
      this.$store.commit("Layers/setLayerProperty", [
        layerName,
        "Visible",
        visible,
      ]);
      layer.setProperties({
        layerIsVisible: visible,
      });
      if (layer.get("layerIsTemporal") && visible) {
        const currentIndex = this.findLayerIndex(
          this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex],
          layer.get("layerDateArray"),
          layer.get("layerTimeStep")
        );
        if (currentIndex < 0) {
          this.$root.$emit(
            "setIndexOOB",
            layer.get("layerName"),
            this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex],
            layer.get("layerDateArray")[
              currentIndex === -1 ? 0 : layer.get("layerDateArray").length - 1
            ]
          );
          layer.setProperties({
            layerDateIndex: currentIndex,
          });
          return;
        } else if (layer.get("layerDateIndex") < 0) {
          this.$root.$emit("setIndexOOB", layer.get("layerName"));
        }
      }
      layer.setVisible(visible);
      if (layer.get("layerIsTemporal") && visible) {
        const layerDateIndex = this.findLayerIndex(
          this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex],
          layer.get("layerDateArray"),
          layer.get("layerTimeStep")
        );
        layer.setProperties({
          layerDateIndex: layerDateIndex,
        });
        if (layerDateIndex >= 0) {
          this.setDateTime(layer, layer.get("layerDateArray")[layerDateIndex]);
          this.$root.$emit(
            "setCurrentTime",
            layer.get("layerName"),
            layer.get("layerDateArray")[layerDateIndex]
          );
        }
      }
    },
    getMapCanvas() {
      let mapCanvas = document.createElement("canvas");
      let mapCanvasUI = document.getElementById("map");
      mapCanvas.width = mapCanvasUI.offsetWidth; //size[0]
      mapCanvas.height = mapCanvasUI.offsetHeight; //size[1]
      let mapContext = mapCanvas.getContext("2d");
      Array.prototype.forEach.call(
        document.querySelectorAll(".ol-layer canvas"),
        function (canvas) {
          if (canvas.width > 0) {
            const opacity = canvas.parentNode.style.opacity;
            mapContext.globalAlpha = opacity === "" ? 1 : Number(opacity);
            const transform = canvas.style.transform;
            const matrix = transform
              .match(/^matrix\(([^\(]*)\)$/)[1] //eslint-disable-line
              .split(",")
              .map(Number);
            CanvasRenderingContext2D.prototype.setTransform.apply(
              mapContext,
              matrix
            );
            mapContext.drawImage(canvas, 0, 0);
          }
        }
      );
      return mapCanvas;
    },
    getOutputHeader(mapCanvasWidth, widths, customTitle) {
      let outputHeaderCanvas = document.createElement("canvas");
      let ctx = outputHeaderCanvas.getContext("2d");
      let ctx_w = mapCanvasWidth;
      outputHeaderCanvas.width = ctx_w;
      outputHeaderCanvas.height = 60;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, outputHeaderCanvas.width, outputHeaderCanvas.height);
      ctx.strokeStyle = "black";
      ctx.fillStyle = "black";
      const logo_canvas = document.getElementById("eccc_logo");
      let ratio = logo_canvas.naturalWidth / logo_canvas.naturalHeight;
      let width = null;
      var fontSize = 26;
      ctx.font = fontSize + "px sans-serif";
      var metrics = ctx.measureText(customTitle);
      if (mapCanvasWidth > 1000) {
        width = 2 * widths[1];
        while (metrics.width > mapCanvasWidth - width && fontSize > 10) {
          fontSize -= 1;
          ctx.font = fontSize + "px sans-serif";
          metrics = ctx.measureText(customTitle);
        }
        canvasTxt.fontSize = fontSize;
        canvasTxt.align = "left";
        canvasTxt.drawText(ctx, customTitle, 0, 0, mapCanvasWidth - width, 60);
      } else {
        width = widths[1];
        while (metrics.width > mapCanvasWidth - width && fontSize > 10) {
          fontSize -= 1;
          ctx.font = fontSize + "px sans-serif";
          metrics = ctx.measureText(customTitle);
        }
        canvasTxt.fontSize = fontSize;
        canvasTxt.align = "left";
        canvasTxt.drawText(ctx, customTitle, 0, 0, mapCanvasWidth - width, 60);
      }
      let height = width / ratio;
      if (mapCanvasWidth > 1000) {
        ctx.drawImage(
          logo_canvas,
          ctx_w - 2 * widths[1],
          (outputHeaderCanvas.height - height) / 2,
          width,
          height
        );
      } else {
        ctx.drawImage(
          logo_canvas,
          ctx_w - widths[1],
          (outputHeaderCanvas.height - height) / 2,
          width,
          height
        );
      }
      this.outputHeader = outputHeaderCanvas;
    },
    getInfoCanvas(mapCanvasWidth, visibleLayers, widths, customTitle) {
      this.getOutputHeader(mapCanvasWidth, widths, customTitle);
      let infoCanvas = document.createElement("canvas");
      let ctx = infoCanvas.getContext("2d");
      let ctx_w = mapCanvasWidth;
      this.isLayerListShown =
        visibleLayers.length > 1 ||
        this.getLayerList.filter(
          (l) => l.Name === visibleLayers[0].get("layerName")
        )[0].Title !== customTitle;
      // Must be divisible by 2 otherwise encoder.initialize() will fail
      let ctx_h = 50;

      let fontArray = [];
      if (this.isLayerListShown) {
        const baseFont = this.getFont - 2;
        ctx_h = 0;
        for (let i = 0; i < visibleLayers.length; i++) {
          let layerName = this.$t(visibleLayers[i].get("layerName"));
          let fontSize = baseFont;
          ctx.font = fontSize + "px sans-serif";
          var metrics = ctx.measureText(layerName);
          while (metrics.width > widths[0] && fontSize > 7) {
            fontSize -= 1;
            ctx.font = fontSize + "px sans-serif";
            metrics = ctx.measureText(layerName);
          }
          ctx_h += fontSize + 8;
          fontArray.push({
            title: layerName,
            fontSize: fontSize,
          });
        }
        ctx_h += 10;
        // Must be divisible by 2 otherwise encoder.initialize() will fail
        ctx_h = 2 * Math.ceil(ctx_h / 2);
        let minHeight = 98;
        if (this.modelRunMessage !== null) {
          minHeight += (this.modelRunMessage.length - 1) * 10;
        }
        ctx_h = ctx_h >= minHeight ? ctx_h : minHeight;
      }

      infoCanvas.width = ctx_w;
      infoCanvas.height = ctx_h;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, infoCanvas.width, infoCanvas.height);
      ctx.strokeStyle = "black";
      ctx.fillStyle = "black";

      let hPos = 0;
      fontArray.forEach((timeLayer) => {
        canvasTxt.fontSize = timeLayer.fontSize;

        canvasTxt.drawText(
          ctx,
          timeLayer.title,
          0.01 * infoCanvas.width,
          hPos,
          widths[0],
          30
        );
        hPos += timeLayer.fontSize + 8;
      });

      if (this.displayReferenceTime) {
        canvasTxt.fontSize = 10;
        canvasTxt.align = "left";
        ctx.font = canvasTxt.fontSize + "px sans-serif";
        let metrics = ctx.measureText(this.modelRunMessage[0]);
        for (let i = 1; i < this.modelRunMessage.length; i++) {
          let textLength = ctx.measureText(this.modelRunMessage[i]);
          if (textLength.width > metrics.width) {
            metrics = textLength;
          }
        }

        let MRPlacement = ctx_w - metrics.width - 0.01 * infoCanvas.width;
        let side = 1;
        if (!this.isLayerListShown) {
          MRPlacement = 0.01 * infoCanvas.width;
          side = 0;
        }
        for (let i = 0; i < this.modelRunMessage.length; i++) {
          canvasTxt.drawText(
            ctx,
            this.modelRunMessage[i],
            MRPlacement,
            16 + 12 * i,
            widths[side],
            20
          );
        }
      }

      let animetPlacement = ctx_h - 40;
      let osmPlacement = ctx_h - 20;
      if (!this.isLayerListShown) {
        animetPlacement = 0.01 * infoCanvas.height;
        osmPlacement = 20;
      }

      let animetAttr = this.$t("madeWithAniMet");
      canvasTxt.fontSize = 15;
      canvasTxt.align = "left";
      ctx.font = canvasTxt.fontSize + "px sans-serif";
      var metrics = ctx.measureText(animetAttr);
      canvasTxt.drawText(
        ctx,
        animetAttr,
        ctx_w - metrics.width - 0.01 * infoCanvas.width,
        animetPlacement,
        widths[1],
        20
      );

      // © OpenStreetMap contributors
      let OSMAttr = this.$t("attributionOSM");
      canvasTxt.fontSize = 10;
      canvasTxt.align = "left";
      ctx.font = canvasTxt.fontSize + "px sans-serif";
      var metrics = ctx.measureText(OSMAttr);
      canvasTxt.drawText(
        ctx,
        OSMAttr,
        ctx_w - metrics.width - 0.01 * infoCanvas.width,
        osmPlacement,
        widths[1],
        20
      );

      return infoCanvas;
    },
    async updateInfoCanvas(newDate, widths) {
      return new Promise((resolve) => {
        let ctx = this.infoCanvas.getContext("2d");

        canvasTxt.fontSize = 14;
        canvasTxt.align = "left";
        const dateLabel = this.localeDateFormat(
          newDate,
          this.getMapTimeSettings.Step
        );
        ctx.font = canvasTxt.fontSize + "px sans-serif";
        var metrics = ctx.measureText(dateLabel);

        let datePlacement =
          this.infoCanvas.width - metrics.width - 0.01 * this.infoCanvas.width;
        let side = 1;
        if (!this.isLayerListShown) {
          datePlacement = 0.01 * this.infoCanvas.width;
          side = 0;
        }

        ctx.fillStyle = "white";
        if (side === 1) {
          ctx.fillRect(
            this.infoCanvas.width - widths[side],
            0,
            widths[side],
            20
          );
        } else {
          ctx.fillRect(datePlacement, 0, widths[side], 20);
        }
        ctx.fillStyle = "black";

        canvasTxt.drawText(
          ctx,
          dateLabel,
          datePlacement,
          0.01 * this.infoCanvas.height,
          widths[side],
          20
        );
        resolve();
      });
    },
    evenSize() {
      let mapDiv = document.getElementById("map");
      if (mapDiv.offsetHeight % 2 == 1) {
        const newHeight = mapDiv.offsetHeight - 1;
        mapDiv.style.height = newHeight + "px";
      }
      if (mapDiv.offsetWidth % 2 == 1) {
        const newWidth = mapDiv.offsetWidth - 1;
        mapDiv.style.width = newWidth + "px";
      }
    },
    async rewindBackToStart() {
      if (this.getMapTimeSettings.DateIndex > this.datetimeRangeSlider[0]) {
        this.$store.dispatch(
          "Layers/setMapTimeIndex",
          this.datetimeRangeSlider[0]
        );
        this.mapControls();
      }
    },
    async rewindBackOneStep() {
      if (this.getMapTimeSettings.DateIndex > this.datetimeRangeSlider[0]) {
        this.$store.dispatch(
          "Layers/setMapTimeIndex",
          this.getMapTimeSettings.DateIndex - 1
        );
        this.mapControls();
      }
    },
    async playPause() {
      if (this.playPauseFlag === false) {
        this.playPauseFlag = !this.playPauseFlag;
        this.play();
      } else {
        this.playPauseFlag = !this.playPauseFlag;
        this.pause();
      }
    },
    async pause() {
      if (this.animationID !== null) {
        clearInterval(this.animationID);
        this.animationID = null;
      }
    },
    async play() {
      this.pause();
      this.animationID = setInterval(() => {
        this.windForwardOneStep();
      }, 1000);
    },
    windForwardOneStep() {
      if (this.getMapTimeSettings.DateIndex < this.datetimeRangeSlider[1]) {
        this.$store.dispatch(
          "Layers/setMapTimeIndex",
          this.getMapTimeSettings.DateIndex + 1
        );
        this.mapControls();
      } else {
        this.playPause();
      }
    },
    windForwardToEnd() {
      if (this.getMapTimeSettings.DateIndex < this.datetimeRangeSlider[1]) {
        this.$store.dispatch(
          "Layers/setMapTimeIndex",
          this.datetimeRangeSlider[1]
        );
        this.mapControls();
      }
    },
    async mapControls() {
      const driverDate =
        this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex];
      let visibleTLayers = this.map
        .getLayers()
        .getArray()
        .filter((l) => {
          return (
            l.get("layerIsVisible") &&
            l instanceof OLImage &&
            l.get("layerIsTemporal")
          );
        });

      for (let i = 0; i < visibleTLayers.length; i++) {
        let tempDA = visibleTLayers[i].get("layerDateArray");
        const layerDateIndex = this.findLayerIndex(
          driverDate,
          tempDA,
          visibleTLayers[i].get("layerTimeStep")
        );
        const sameIndex =
          layerDateIndex === visibleTLayers[i].get("layerDateIndex") ||
          (layerDateIndex < 0 && visibleTLayers[i].get("layerDateIndex") < 0);
        if (sameIndex && layerDateIndex < 0) {
          this.$root.$emit(
            "setIndexOOB",
            visibleTLayers[i].get("layerName"),
            this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex],
            visibleTLayers[i].get("layerDateArray")[
              layerDateIndex === -1
                ? 0
                : visibleTLayers[i].get("layerDateArray").length - 1
            ]
          );
        } else if (!sameIndex) {
          if (layerDateIndex < 0) {
            visibleTLayers[i].setProperties({
              layerDateIndex: layerDateIndex,
            });
            visibleTLayers[i].setVisible(false);
            this.$root.$emit(
              "setIndexOOB",
              visibleTLayers[i].get("layerName"),
              this.getMapTimeSettings.Extent[this.getMapTimeSettings.DateIndex],
              visibleTLayers[i].get("layerDateArray")[
                layerDateIndex === -1
                  ? 0
                  : visibleTLayers[i].get("layerDateArray").length - 1
              ]
            );
          } else if (visibleTLayers[i].get("layerDateIndex") < 0) {
            visibleTLayers[i].setProperties({
              layerDateIndex: layerDateIndex,
            });
            this.$root.$emit(
              "setCurrentTime",
              visibleTLayers[i].get("layerName"),
              visibleTLayers[i].get("layerDateArray")[layerDateIndex]
            );
            visibleTLayers[i].setVisible(true);
            this.$root.$emit("setIndexOOB", visibleTLayers[i].get("layerName"));
            this.setDateTime(visibleTLayers[i], tempDA[layerDateIndex]);
          } else {
            visibleTLayers[i].setProperties({
              layerDateIndex: layerDateIndex,
            });
            this.$root.$emit(
              "setCurrentTime",
              visibleTLayers[i].get("layerName"),
              visibleTLayers[i].get("layerDateArray")[layerDateIndex]
            );
            this.setDateTime(visibleTLayers[i], tempDA[layerDateIndex]);
          }
        }
      }
      await new Promise((resolve) => this.map.once("rendercomplete", resolve));
      if (this.expiredTimestepList.length !== 0) {
        this.fixTimeExtent();
        this.expiredTimestepList = [];
      }
    },
    findLayerIndex(date, layerDateArr, step) {
      let dateArray = [];
      var curDate;
      if (step === "P1Y") {
        for (let i = 0; i < layerDateArr.length; i++) {
          dateArray.push(layerDateArr[i].getFullYear());
        }
        curDate = date.getFullYear();
      } else if (step === "P1M") {
        for (let i = 0; i < layerDateArr.length; i++) {
          let month = layerDateArr[i].getMonth();
          if (month < 10) {
            month = "0" + month;
          }
          dateArray.push(`${layerDateArr[i].getFullYear()}${month}`);
        }
        let curMonth = date.getMonth();
        if (curMonth < 10) {
          curMonth = "0" + curMonth;
        }
        curDate = `${date.getFullYear()}${curMonth}`;
      } else {
        dateArray = layerDateArr;
        curDate = date;
      }
      let start = 0;
      let end = dateArray.length - 1;
      if (curDate <= dateArray[start]) {
        if (curDate < dateArray[start]) {
          return -1;
        } else {
          return 0;
        }
      } else if (curDate >= dateArray[end]) {
        let isOverOneInterval;
        if (["P1M", "P1Y"].includes(step)) {
          isOverOneInterval = curDate !== dateArray[end];
        } else {
          isOverOneInterval =
            curDate >= parseDuration(step).add(dateArray[end]);
        }
        if (isOverOneInterval) {
          return -2;
        } else {
          return end;
        }
      }
      while (start <= end) {
        let mid = Math.floor((start + end) / 2);
        // If date is found
        let isEqual;
        if (["P1Y", "P1M"].includes(step)) {
          isEqual = dateArray[mid] === curDate;
        } else {
          isEqual = dateArray[mid].getTime() === curDate.getTime();
        }
        if (isEqual) return mid;
        else if (dateArray[mid] < curDate) start = mid + 1;
        else end = mid - 1;
      }
      return end;
    },
    fixTimeExtent() {
      let noChangeFlag = true;
      for (let k = 0; k < this.expiredTimestepList.length; k++) {
        if (
          this.expiredTimestepList[k].get("layerTimeStep") ===
          this.getMapTimeSettings.Step
        ) {
          noChangeFlag = false;
          break;
        }
      }
      if (noChangeFlag) {
        for (let k = 0; k < this.expiredTimestepList.length; k++) {
          this.expiredTimestepList[k].setProperties({
            layerDateIndex: 0,
          });
        }
        this.mapControls();
        this.expiredSnackBarMessage = this.$t("expiredSecondaryLayer");
        this.notifyExtentRebuilt = true;
        return true;
      } else {
        if (this.getMapTimeSettings.SnappedLayer !== null) {
          this.changeMapTime(
            this.getMapTimeSettings.Step,
            this.getMapTimeSettings.SnappedLayer
          );
          this.expiredSnackBarMessage = this.$t("expiredExtentRefreshed");
          this.notifyExtentRebuilt = true;
          // redo animation
          return true;
        } else {
          const currentHighBoundDate =
            this.getMapTimeSettings.Extent[this.datetimeRangeSlider[1]];
          this.changeMapTime(this.getMapTimeSettings.Step);
          if (this.getMapTimeSettings.Extent[0] >= currentHighBoundDate) {
            // Cancel animation
            this.expiredSnackBarMessage = this.$t("extentFullyOOB");
            this.notifyExtentRebuilt = true;
            this.$store.commit("Layers/setDatetimeRangeSlider", [
              0,
              this.getMapTimeSettings.Extent.length - 1,
            ]);
            return false;
          } else {
            const highBoundIndex =
              this.datetimeRangeSlider[1] - this.datetimeRangeSlider[0];
            this.expiredSnackBarMessage = this.$t("expiredExtentRefreshed");
            this.notifyExtentRebuilt = true;
            this.$store.commit("Layers/setDatetimeRangeSlider", [
              0,
              highBoundIndex,
            ]);
            //redo animation
            return true;
          }
        }
      }
    },
    darkModeOSMHandler(flag) {
      if (this.darkOSMCallback === null && flag === false) {
        this.darkOSMCallback = (evt) => {
          evt.context.globalCompositeOperation = "color";
          evt.context.fillStyle = "rgba(0,0,0," + 1.0 + ")";
          evt.context.fillRect(
            0,
            0,
            evt.context.canvas.width,
            evt.context.canvas.height
          );
          evt.context.globalCompositeOperation = "overlay";
          evt.context.fillStyle = "rgb(" + [200, 200, 200].toString() + ")";
          evt.context.fillRect(
            0,
            0,
            evt.context.canvas.width,
            evt.context.canvas.height
          );
          evt.context.globalCompositeOperation = "difference";
          evt.context.fillStyle = "rgba(255,255,255," + 0.999 + ")";
          evt.context.fillRect(
            0,
            0,
            evt.context.canvas.width,
            evt.context.canvas.height
          );
          evt.context.globalCompositeOperation = "source-over";
        };
        this.map
          .getLayers()
          .getArray()[0]
          .on("postrender", this.darkOSMCallback);
        this.map.updateSize();
      }

      if (flag === false) {
        this.map
          .getLayers()
          .getArray()[0]
          .on("postrender", this.darkOSMCallback);
        this.map.updateSize();
      }

      if (flag === true) {
        this.map
          .getLayers()
          .getArray()[0]
          .un("postrender", this.darkOSMCallback);
        this.map.updateSize();
      }
    },
    capitalize(word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    },
    localeDateFormat(dateIn, interval = null) {
      if (interval === "P1Y") {
        return this.getProperDateString(dateIn, interval);
      } else if (interval === "P1M") {
        if (this.getTimeFormat === false) {
          return this.getProperDateString(dateIn, interval);
        } else if (this.getTimeFormat === true) {
          const locale =
            this.$i18n.locale === "fr" ? "fr-CA" : this.$i18n.locale;
          return DateTime.fromJSDate(dateIn)
            .setLocale(locale)
            .toLocaleString({ year: "numeric", month: "long" });
        }
      } else {
        if (this.getTimeFormat === false) {
          return dateIn.toISOString().replace(":00.000", "");
        } else if (this.getTimeFormat === true) {
          const locale =
            this.$i18n.locale === "fr" ? "fr-CA" : this.$i18n.locale;
          return this.capitalize(
            DateTime.fromJSDate(dateIn)
              .setLocale(locale)
              .toLocaleString(DateTime.DATETIME_FULL)
          );
        }
      }
    },
    setColor() {
      this.rgb = { r: this.getRGB[0], g: this.getRGB[1], b: this.getRGB[2] };
    },
    darkBasemapHandler(flag) {
      if (this.darkOSMCallback === null) {
        this.isMapColored = flag;
        this.darkOSMCallback = (evt) => {
          evt.context.globalCompositeOperation = "color";
          evt.context.fillStyle = "rgb(0,0,0)";
          evt.context.fillRect(
            0,
            0,
            evt.context.canvas.width,
            evt.context.canvas.height
          );
          evt.context.globalCompositeOperation = "overlay";
          evt.context.fillStyle = "rgb(0,0,0)";
          evt.context.fillRect(
            0,
            0,
            evt.context.canvas.width,
            evt.context.canvas.height
          );
          evt.context.globalCompositeOperation = "difference";
          evt.context.fillStyle =
            "rgba(" +
            [
              255 - this.rgb.r,
              255 - this.rgb.g,
              255 - this.rgb.b,
              1.0,
            ].toString() +
            ")";
          evt.context.fillRect(
            0,
            0,
            evt.context.canvas.width,
            evt.context.canvas.height
          );
          evt.context.globalCompositeOperation = "source-over";
        };
        this.map
          .getLayers()
          .getArray()[0]
          .on("postrender", this.darkOSMCallback);
        this.map.updateSize();
      }
      if (flag === true) {
        this.map
          .getLayers()
          .getArray()[0]
          .on("postrender", this.darkOSMCallback);
        this.map.updateSize();
      }
      if (flag === false) {
        this.map
          .getLayers()
          .getArray()[0]
          .un("postrender", this.darkOSMCallback);
        this.map.updateSize();
      }
    },
    changeStyleHandler(styleName, layerName) {
      this.$store.commit("Layers/setLayerProperty", [
        layerName,
        "currentStyle",
        styleName,
      ]);
      this.map
        .getLayers()
        .getArray()
        .filter((l) => l.get("layerName") === layerName)[0]
        .getSource()
        .updateParams({ STYLES: styleName });
      this.map
        .getLayers()
        .getArray()
        .filter((l) => l.get("layerName") === layerName)[0]
        .set("layerCurrentStyle", styleName);
      this.map.updateSize();
    },
    zoomIn() {
      let currentZoom = this.map.getView().getZoom();
      if (currentZoom < 20) {
        this.map.getView().setZoom(currentZoom + 1);
      }
    },
    zoomOut() {
      let currentZoom = this.map.getView().getZoom();
      if (currentZoom > 1) {
        this.map.getView().setZoom(currentZoom - 1);
      }
    },
    getTitleConfig(mapWidth) {
      const configMap = {
        500: {
          name: "smallest",
          fontSize: 10,
          width: 250,
        },
        750: {
          name: "medium",
          fontSize: 12,
          width: 500,
        },
        1000: {
          name: "large",
          fontSize: 14,
          width: 800,
        },
      };
      let keys = Object.keys(configMap);
      keys.sort(function (a, b) {
        return a - b;
      });

      let maxKey = -1;
      let len = keys.length;
      for (let i = 0; i < len; i++) {
        if (maxKey < 0 || keys[i] < mapWidth) {
          maxKey = Math.max(maxKey, keys[i]);
        }
      }
      return configMap[maxKey];
    },
    async addSpecialLayer(layer, layerName) {
      const layerFound = this.map
        .getLayers()
        .getArray()
        .filter((l) => l.get("layerName") === layerName);
      if (layerFound.length !== 0) {
        this.map.removeLayer(layerFound[0]);
      } else {
        var special_layer = new OLImage({
          source: new ImageWMS({
            format: "image/png",
            url: layer.url,
            params: {
              layers: layer.layers,
            },
            transition: 0,
            crossOrigin: "Anonymous",
            ratio: 1,
          }),
          maxZoom: 12.1,
          minZoom: 0.9,
          visible: true,
          opacity: 1,
          zIndex: layer.zIndex,
        });
        special_layer.setProperties({
          layerName: layerName,
        });
        this.map.addLayer(special_layer);
      }
      this.$store.dispatch("Layers/setOverlayDisplayed", layerName);
    },
  },
  computed: {
    ...mapState("Layers", [
      "animationTitle",
      "datetimeRangeSlider",
      "framesPerSecond",
      "isAnimating",
    ]),
    ...mapGetters("Layers", [
      "getCurrentWmsSource",
      "getLayerList",
      "getMapTimeSettings",
      "getOrderedLayers",
      "getRGB",
      "getTimeFormat",
    ]),
    color: {
      get() {
        return this.rgb;
      },
      set(v) {
        this.rgb = v;
      },
    },
    mapHeight() {
      return this.map.getSize()[1];
    },
    mapWidth() {
      return this.map.getSize()[0];
    },
    getFont() {
      const ratio = 24 / 1400;
      const size = this.mapWidth * ratio;
      if ((size | 0) > 20) {
        return 20;
      } else {
        return size | 0;
      }
    },
    getControlsFlag() {
      if (this.map !== null) {
        return (
          this.map
            .getLayers()
            .getArray()
            .filter((l) => l.get("layerIsTemporal")).length > 0
        );
      } else {
        return false;
      }
    },
    getMapLegendURL() {
      if (this.getMapTimeSettings.MapLegendLayer === null) {
        return null;
      } else {
        return `${this.getMapTimeSettings.MapLegendLayer.legendURL}?version=1.3.0&service=WMS&request=GetLegendGraphic&sld_version=1.1.0&layer=${this.getMapTimeSettings.MapLegendLayer.Name}&format=image/png&STYLE=${this.getMapTimeSettings.MapLegendLayer.currentStyle}`;
      }
    },
    displayMapLegend() {
      return this.getMapTimeSettings.MapLegendLayer !== null;
    },
    displayReferenceTime() {
      return (
        this.getMapTimeSettings.Step !== null && this.modelRunMessage !== null
      );
    },
  },
  watch: {
    getTimeFormat() {
      this.getModelRuns();
    },
    getMapTimeSettings(newSettings, oldSettings) {
      if (
        oldSettings.Step !== null &&
        newSettings.Step !== null &&
        (newSettings.Step !== oldSettings.Step ||
          newSettings.Extent[newSettings.DateIndex].getTime() !==
            oldSettings.Extent[oldSettings.DateIndex].getTime())
      ) {
        if (newSettings.SnappedLayer === null && !this.notifyExtentRebuilt) {
          this.$store.commit("Layers/setDatetimeRangeSlider", [
            0,
            newSettings.Extent.length - 1,
          ]);
        }
        const driverDateDefault = newSettings.Extent[newSettings.DateIndex];

        const timeLayers = this.map
          .getLayers()
          .getArray()
          .filter(
            (layer) =>
              layer.get("layerIsVisible") &&
              layer.get("layerIsTemporal") === true
          );
        for (let i = 0; i < timeLayers.length; i++) {
          let tempDA = timeLayers[i].get("layerDateArray");
          const layerDateIndex = this.findLayerIndex(
            driverDateDefault,
            tempDA,
            timeLayers[i].get("layerTimeStep")
          );
          const sameIndex =
            layerDateIndex === timeLayers[i].get("layerDateIndex") ||
            (layerDateIndex < 0 && timeLayers[i].get("layerDateIndex") < 0);
          if (sameIndex && layerDateIndex < 0) {
            this.$root.$emit(
              "setIndexOOB",
              timeLayers[i].get("layerName"),
              driverDateDefault,
              timeLayers[i].get("layerDateArray")[
                layerDateIndex === -1
                  ? 0
                  : timeLayers[i].get("layerDateArray").length - 1
              ]
            );
          } else if (!sameIndex) {
            if (layerDateIndex < 0) {
              timeLayers[i].setProperties({
                layerDateIndex: layerDateIndex,
              });
              timeLayers[i].setVisible(false);
              this.$root.$emit(
                "setIndexOOB",
                timeLayers[i].get("layerName"),
                driverDateDefault,
                timeLayers[i].get("layerDateArray")[
                  layerDateIndex === -1
                    ? 0
                    : timeLayers[i].get("layerDateArray").length - 1
                ]
              );
            } else if (timeLayers[i].get("layerDateIndex") < 0) {
              timeLayers[i].setProperties({
                layerDateIndex: layerDateIndex,
              });
              this.$root.$emit(
                "setCurrentTime",
                timeLayers[i].get("layerName"),
                timeLayers[i].get("layerDateArray")[layerDateIndex]
              );
              timeLayers[i].setVisible(true);
              this.$root.$emit("setIndexOOB", timeLayers[i].get("layerName"));
              this.setDateTime(timeLayers[i], tempDA[layerDateIndex]);
            } else {
              timeLayers[i].setProperties({
                layerDateIndex: layerDateIndex,
              });
              this.$root.$emit(
                "setCurrentTime",
                timeLayers[i].get("layerName"),
                timeLayers[i].get("layerDateArray")[layerDateIndex]
              );
              this.setDateTime(timeLayers[i], tempDA[layerDateIndex]);
            }
          }
        }
      }
    },
  },
  data() {
    return {
      animationID: null,
      cancelFlag: false,
      darkOSMCallback: null,
      expiredSnackBarMessage: this.$t("expiredExtentRefreshed"),
      expiredTimestepList: [],
      hex: "#646464",
      infoCanvas: null,
      infoCanvasHeightPadding: 68,
      isLayerListShown: true,
      isMapColored: false,
      loadingFlag: false,
      localeOptions: {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      },
      map: null,
      modelRunMessage: null,
      notifyCancelAnimateResize: false,
      notifyExtentRebuilt: false,
      osm: new TileLayer({ source: new OSM() }),
      outputHeader: null,
      playPauseFlag: false,
      rgb: {
        r: 200,
        g: 200,
        b: 200,
      },
      xsltTime: `parse-xml($xml)//Layer[not(.//Layer)]!map
                    {
                        'Dimension' : map
                        {
                            'Dimension_time' : string(Dimension[@name = 'time']),
                            'Dimension_time_default' : string(Dimension[@name = 'time']/@default),
                            'Dimension_ref_time' : string(Dimension[@name = 'reference_time'])
                        }
                    }`,
      zuluToggle: true,
    };
  },
};
</script>

<style scoped>
.map-container {
  overflow-y: hidden;
  overflow-x: auto;
  padding-right: 12px;
  width: 101%;
}
.model-run {
  white-space: pre-wrap;
  text-align: left;
  float: right;
}
.map {
  width: 100%;
  min-width: 600px;
  max-width: 4096px;
  height: 600px;
  min-height: 500px;
  max-height: 2160px;
  resize: both;
  overflow: auto;
  z-index: 0;
}

.invisible {
  visibility: hidden;
}

#insideMenuExpansionPanel {
  border-radius: 25px;
}

#legendMapOverlay {
  position: absolute; /* position to top-right */
  top: 0;
  right: 0;
  width: max-content;
  height: max-content;
}

#legendMapOverlay img {
  max-width: 150px;
  max-height: 350px;
  width: 100%;
  height: auto;
}
#expandableCustomControl {
  position: relative;
  top: 90px;
  max-width: 60px;
  max-height: 400px;
  margin: 0px;
}
</style>
