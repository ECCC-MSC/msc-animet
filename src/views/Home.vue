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

export default {
  name: "Home",
  props: ["layers", "extent", "width", "height"],
  async mounted() {
    if (this.layers !== undefined && this.extent !== undefined) {
      const layersPassed = this.layers.split(",");
      if (layersPassed.length > 0) {
        this.$root.$emit("permalinkLayersFlag", true);
      }
      layersPassed.forEach((layer, index) => {
        this.addLayerEvent(index, ...layer.split(";"));
      });
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
        let layer = {};
        layer.Name = layerName;
        layer.Opacity = parseFloat(opacity);
        layer.Visible = isVisible === "1";
        layer.isLeaf = true;
        let layerData = null;
        let this_ = this;
        const api = axios.create({
          baseURL: "https://geo.weather.gc.ca/geomet",
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
        layer.currentStyle = style === "0" ? layerData.Style[0].Name : style;
        layer.ZIndex = index;

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
          layer.default_time = new Date(
            layerData.Dimension.Dimension_time_default
          );
          this.$store.dispatch("Layers/addTimestep", layer.dateTriplet[2]);
          if (layerData.Dimension.Dimension_ref_time !== "") {
            layer.ReferenceTime = this.getStartEndTime(
              layerData.Dimension.Dimension_ref_time
            )[1];
          }
        }
        if (
          (layer.isTemporal && this.getMapTimeSettings.Step === null) ||
          Number(isSnapped)
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
        this.$root.$emit("addLayer", layer);
      }
    },
    getStartEndTime(layerDimension) {
      let data = layerDimension.split("/");
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
      "getMP4Flag",
      "getMP4URL",
      "getMP4CreateFlag",
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
