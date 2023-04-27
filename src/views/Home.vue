<template>
  <div class="Home">
    <v-main>
      <v-container fluid>
        <MapViewer id="mapComponent" />
        <GeoMetTree id="geoMetTree" class="my-4" />
        <LayerControls
          id="layerControls"
          v-show="getLayerList.length !== 0"
          class="my-4"
        />
        <MP4CreateControls
          id="createMP4Controls"
          v-show="getMapTimeSettings.Step !== null"
          class="my-4"
        />
        <create-animation-button></create-animation-button>
        <MP4CreateProgress v-if="!getMP4CreateFlag" class="my-12" />
        <MP4Export v-if="MP4ExportFlag" id="MP4exportid" class="my-4" />
      </v-container>
    </v-main>
  </div>
</template>

<script>
import MapViewer from "../components/MapViewer.vue";
import { mapGetters } from "vuex";
import MP4CreateControls from "../components/MP4CreateControls.vue";
import MP4Export from "../components/MP4Export.vue";
import GeoMetTree from "../components/GeoMetTree.vue";
import MP4CreateProgress from "../components/MP4CreateProgress.vue";
import LayerControls from "../components/LayerControls.vue";
import CreateAnimationButton from "../components/CreateAnimationButton.vue";

import axios from "axios";
import SaxonJS from "saxon-js";
import parseDuration from "../assets/parseHelper";

import climateJSON from "../locales/en/layers_climate.json";
import weatherJSON from "../locales/en/layers_weather.json";

export default {
  name: "Home",
  props: ["layers", "extent", "width", "height", "color"],
  async mounted() {
    if (this.layers !== undefined) {
      const layersPassed = this.layers.split(",");
      if (layersPassed.length > 0) {
        this.$root.$emit("permalinkLayersFlag", true);
      }
      layersPassed.forEach((layer, index) => {
        this.addLayerEvent(index, ...layer.split(";"));
      });
    }
    if (this.extent !== undefined) {
      let extentPassed = this.extent.split(",");
      let castedExtent = [];
      extentPassed.forEach((element) => {
        castedExtent.push(parseFloat(element));
      });
      this.$root.$emit("goToExtent", castedExtent);
    }
    if (this.width !== undefined && this.height !== undefined) {
      this.$root.$emit("setMapSize", [
        parseInt(this.width),
        parseInt(this.height),
      ]);
    }
    if (this.color !== undefined) {
      var matchColor = /((\d{1,3}),(\d{1,3}),(\d{1,3}))/;
      var match = matchColor.exec(this.color);
      if (match !== null) {
        this.$store.dispatch("Layers/setRGB", [
          Number(match[2]),
          Number(match[3]),
          Number(match[4]),
        ]);
        this.$root.$emit("darkModeMapEvent", true);
      }
    }
  },
  methods: {
    async addLayerEvent(
      index,
      layerName,
      opacity,
      isSnapped,
      isVisible,
      style
    ) {
      if (!this.added.includes(layerName)) {
        var baseURL;
        if (layerName in weatherJSON) {
          baseURL = "https://geo.weather.gc.ca/geomet";
        } else if (layerName in climateJSON) {
          baseURL = "https://geo.weather.gc.ca/geomet-climate";
        } else {
          return;
        }
        let layer = {};
        layer.Name = layerName;
        layer.isLeaf = true;
        let layerData = null;
        let this_ = this;
        const api = axios.create({
          baseURL: baseURL,
          params: {
            service: "WMS",
            version: "1.3.0",
            request: "GetCapabilities",
            LANG: this_.$i18n.locale,
            LAYER: layerName,
            t: new Date().getTime(),
          },
        });
        await api.get().then((response) => {
          layerData = SaxonJS.XPath.evaluate(this.xsltFull, null, {
            xpathDefaultNamespace: "http://www.opengis.net/wms",
            namespaceContext: {
              xlink: "http://www.w3.org/1999/xlink",
            },
            params: {
              xml: response.data,
            },
          });
        });
        layer.isTemporal =
          layerData.Dimension.Dimension_time !== "" &&
          layerData.Dimension.Dimension_time.split("/")[2] !== "PT0H";
        layer.Title = layerData.Title;
        layer.Style = layerData.Style;
        layer.ZIndex = index;
        let op = parseFloat(opacity);
        layer.Opacity = isNaN(op) || op > 1 || op < 0 ? 0.75 : op;
        layer.Visible = isVisible === "0" ? false : true;
        if (!isNaN(parseFloat(style))) {
          // Have to add this because "0" is indeed in layer.Style since it's an object
          layer.currentStyle = layerData.Style[0].Name;
        } else if (style in layer.Style) {
          layer.currentStyle = style;
        } else {
          layer.currentStyle = layerData.Style[0].Name;
        }

        if (layer.isTemporal) {
          const dateTriplet = this.getStartEndTime(
            layerData.Dimension.Dimension_time
          );
          const extentDateArray = this.getDateArray(
            dateTriplet[0],
            dateTriplet[1],
            dateTriplet[2]
          );
          layer.dateTriplet = dateTriplet;
          layer.extentDateArray = extentDateArray;
          layer.extentLength = extentDateArray.length - 1;
          if (dateTriplet[2] === "P1Y") {
            layer.default_time = new Date(
              layerData.Dimension.Dimension_time_default + "/01/01"
            );
          } else if (dateTriplet[2] === "P1M") {
            layer.default_time = new Date(
              layerData.Dimension.Dimension_time_default.replace("-", "/") +
                "/01"
            );
          } else {
            layer.default_time = new Date(
              layerData.Dimension.Dimension_time_default
            );
          }
          this.$store.dispatch("Layers/addTimestep", layer.dateTriplet[2]);
          if (layerData.Dimension.Dimension_ref_time !== "") {
            layer.ReferenceTime = this.getStartEndTime(
              layerData.Dimension.Dimension_ref_time
            )[1];
          }
        }
        if (
          layer.isTemporal &&
          (this.getMapTimeSettings.Step === null || isSnapped === "1")
        ) {
          const mapTimeSettings = {
            SnappedLayer: layer,
            Step: layer.dateTriplet[2],
            DateIndex: this.findLayerIndex(
              layer.default_time,
              layer.extentDateArray,
              layer.dateTriplet[2]
            ),
            Extent: layer.extentDateArray,
            MapLegendLayer: layer,
          };
          this.$store.dispatch("Layers/setMapTimeSettings", mapTimeSettings);
          this.$store.commit("Layers/setDatetimeRangeSlider", [
            0,
            layer.extentDateArray.length - 1,
          ]);
        }
        this.$store.dispatch("Layers/addLayer", layer);
        if (baseURL !== "https://geo.weather.gc.ca/geomet") {
          this.$root.$emit("addLayer", layer, baseURL);
        } else {
          this.$root.$emit("addLayer", layer);
        }
      }
    },
    getStartEndTime(layerDimension) {
      let data = layerDimension.split("/");
      if (data[2] === "P1Y") {
        data[0] += "/01/01";
        data[1] += "/01/01";
        return [new Date(data[0]), new Date(data[1]), data[2]];
      } else if (data[2] === "P1M") {
        data[0] = data[0].replace("-", "/") + "/01";
        data[1] = data[1].replace("-", "/") + "/01";
        return [new Date(data[0]), new Date(data[1]), data[2]];
      } else {
        if (data.length === 1) {
          return [null, new Date(data[0]), null];
        }
        return [new Date(data[0]), new Date(data[1]), data[2]];
      }
    },
    getDateArray(start, end, step) {
      let tempDateArray = new Array();
      let tempDate = new Date(start);
      if (step === "P1Y") {
        let currentDate = new Date(tempDate);
        while (tempDate <= end) {
          tempDateArray.push(currentDate);
          currentDate = new Date(
            tempDate.setFullYear(tempDate.getFullYear() + 1, 0, 1)
          );
        }
      } else if (step === "P1M") {
        let currentDate = new Date(tempDate);
        while (tempDate <= end) {
          tempDateArray.push(currentDate);
          currentDate = new Date(tempDate.setMonth(tempDate.getMonth() + 1, 1));
        }
      } else {
        let nextDate = parseDuration(step).add;
        while (tempDate <= end) {
          tempDateArray.push(tempDate);
          tempDate = nextDate(tempDate);
        }
      }
      return tempDateArray;
    },
    findLayerIndex(date, layerDateArr, step) {
      let start = 0;
      let end = layerDateArr.length - 1;
      if (date <= layerDateArr[start]) {
        if (date < layerDateArr[start]) {
          return -1;
        } else {
          return 0;
        }
      } else if (date >= layerDateArr[end]) {
        if (date >= parseDuration(step).add(layerDateArr[end])) {
          return -2;
        } else {
          return end;
        }
      }
      while (start <= end) {
        let mid = Math.floor((start + end) / 2);
        // If date is found
        if (layerDateArr[mid].getTime() === date.getTime()) return mid;
        else if (layerDateArr[mid] < date) start = mid + 1;
        else end = mid - 1;
      }
      return end;
    },
  },
  data() {
    return {
      xsltFull: `parse-xml($xml)//Layer[not(.//Layer)]!map 
                        {
                            'Name' : string(Name),
                            'Title' : string(Title),
                            'Abstract' : string(Abstract),
                            'Dimension' : map 
                            {
                                'Dimension_time' : string(Dimension[@name = 'time']),
                                'Dimension_time_default' : string(Dimension[@name = 'time']/@default),
                                'Dimension_ref_time' : string(Dimension[@name = 'reference_time'])
                            },
                            'Style' : array { Style !
                                map 
                                {
                                    'Name' : string(Name),
                                    'Title' : string(Title),
                                    'LegendWidth' : string(LegendURL/@width),
                                    'LegendHeight' : string(LegendURL/@height),
                                    'LegendURL' : string(LegendURL/OnlineResource/@xlink:href)
                                }
                            }
                        }`,
    };
  },
  computed: {
    ...mapGetters("Layers", [
      "getLayerList",
      "getMapTimeSettings",
      "getMP4URL",
      "getMP4CreateFlag",
      "getPossibleOverlays",
    ]),
    MP4CretedControlsFlag() {
      return this.getLayerList.length !== 0;
    },
    MP4ExportFlag() {
      return this.getMP4URL !== "null";
    },
    added() {
      return this.getLayerList.map((o) => o.Name);
    },
  },
  components: {
    MapViewer,
    GeoMetTree,
    MP4CreateControls,
    MP4Export,
    MP4CreateProgress,
    LayerControls,
    CreateAnimationButton,
  },
};
</script>

<style scoped></style>
