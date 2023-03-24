<template>
  <v-expansion-panels v-model="expandTreePanel">
    <v-expansion-panel v-model="expandTreePanel">
      <v-expansion-panel-header>
        {{ $t("GeoMetTreeTitle") }}
      </v-expansion-panel-header>
      <v-expansion-panel-content>
        <v-text-field
          autofocus
          v-model="searchGeoMet"
          :label="$t('GeoMetTreeSearchLabel')"
          clearable
          dense
          hide-details
          @input="filterOnInput"
        >
        </v-text-field>
        <v-treeview
          :items="filteredTreeNodes"
          item-key="Name"
          dense
          open-on-click
          activatable
          hoverable
          ref="tree"
        >
          <template v-slot:prepend="{ item }">
            <v-btn
              v-if="!item.children"
              x-large
              color="white"
              icon
              :disabled="isAnimating"
              @click="addLayerEvent(item)"
            >
              <v-icon color="primary">
                {{ added.includes(item.Name) ? "mdi-minus" : "mdi-plus" }}
              </v-icon>
            </v-btn>
          </template>
          <template v-slot:label="{ item }">
            <v-container
              @click="isAnimating ? null : addLayerEvent(item)"
              class="ma-0 pa-0"
            >
              <strong :title="item.Title">{{ item.Title }}</strong>
            </v-container>
          </template>
          <template v-slot:append="{ item }">
            <v-tooltip v-if="!item.children" right color="light-blue" top>
              <template v-slot:activator="{ on, attrs }">
                <span v-bind="attrs" v-on="on" class="grey--text"
                  >({{ item.Name }})</span
                >
              </template>
              <span>
                <span v-if="!item.children">{{ item.Abstract[0] }}</span>
              </span>
            </v-tooltip>
          </template>
        </v-treeview>
      </v-expansion-panel-content>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import axios from "axios";
import SaxonJS from "saxon-js";
import parseDuration from "../assets/parseHelper";

export default {
  created() {
    this.$root.$on("permalinkLayersFlag", (flag) => {
      if (flag === true) {
        this.expandTreePanel = null;
      }
    });
  },
  mounted() {
    this.filteredTreeNodes = this.getGeoMetTreeItems;
    this.$root.$on("localeChange", this.resetSearchAndTree);
  },
  data() {
    return {
      expandTreePanel: 0,
      searchGeoMet: null,
      openedLevels: [],
      filteredTreeNodes: [],
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
                                    'LegendWith' : string(LegendURL/@width),
                                    'LegendHeight' : string(LegendURL/@height),
                                    'LegendURL' : string(LegendURL/OnlineResource/@xlink:href)
                                }
                            }
                        }`,
      xsltStyle: `parse-xml($xml)//Layer[not(.//Layer)]!map 
                        {
                            'Name' : string(Name),
                            'Title' : string(Title),
                            'Abstract' : string(Abstract),
                            'Style' : array { Style !
                                map 
                                {
                                    'Name' : string(Name),
                                    'Title' : string(Title),
                                    'LegendWith' : string(LegendURL/@width),
                                    'LegendHeight' : string(LegendURL/@height),
                                    'LegendURL' : string(LegendURL/OnlineResource/@xlink:href)
                                }
                            }
                        }`,
    };
  },
  methods: {
    async addLayerEvent(layer) {
      if (!this.added.includes(layer.Name) && layer.isLeaf) {
        var layerData = null;
        let this_ = this;
        const api = axios.create({
          baseURL: "https://geo.weather.gc.ca/geomet",
          params: {
            service: "WMS",
            version: "1.3.0",
            request: "GetCapabilities",
            LANG: this_.$i18n.locale,
            LAYER: layer.Name,
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
        layer.Title = layerData.Title;
        layer.Style = layerData.Style;
        layer.currentStyle = layer.Style[0].Name;
        layer.Opacity = 0.75;
        layer.Visible = true;
        layer.ZIndex = null;
        layer.isTemporal =
          layer.isTemporal &&
          layerData.Dimension.Dimension_time.split("/")[2] !== "PT0H";
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
        if (!this.getLayerList.find((l) => l.Name === layer.Name)) {
          if (layer.isTemporal && this.getMapTimeSettings.Step === null) {
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
      } else if (this.added.includes(layer.Name)) {
        this.$root.$emit(
          "removeLayerControls",
          layer,
          this.getOrderedLayers.indexOf(layer.Name)
        );
      }
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
    filterCallbackFunction(array, fn) {
      return array.reduce((r, o) => {
        var children = this.filterCallbackFunction(o.children || [], fn);
        if (fn(o) || children.length)
          r.push(Object.assign({}, o, children.length && { children }));
        return r;
      }, []);
    },
    filterOnInput() {
      if (this.searchGeoMet !== null) {
        if (this.searchGeoMet.length >= 3 && this.searchGeoMet !== "") {
          this.filteredTreeNodes = this.filterCallbackFunction(
            this.getGeoMetTreeItems,
            (item) =>
              item["Title"]
                .toLowerCase()
                .indexOf(this.searchGeoMet.toLowerCase()) > -1 ||
              item["Name"]
                .toLowerCase()
                .indexOf(this.searchGeoMet.toLowerCase()) > -1
          );
          this.$refs.tree.updateAll(true);
        } else {
          this.filteredTreeNodes = this.getGeoMetTreeItems;
          this.$refs.tree.updateAll(false);
        }
      } else {
        this.filteredTreeNodes = this.getGeoMetTreeItems;
        this.$refs.tree.updateAll(false);
      }
    },
    resetSearchAndTree() {
      this.searchGeoMet = null;
      this.filterOnInput();
    },
  },
  computed: {
    ...mapState("Layers", ["isAnimating"]),
    ...mapGetters("Layers", [
      "getGeoMetTreeItems",
      "getLayerList",
      "getMapTimeSettings",
      "getOrderedLayers",
      "getTimestepsList",
    ]),
    filter() {
      return (item, search) =>
        item["Title"].toLowerCase().indexOf(search.toLowerCase()) > -1 ||
        item["Name"].toLowerCase().indexOf(search.toLowerCase()) > -1;
    },
    added() {
      return this.getLayerList.map((o) => o.Name);
    },
  },
};
</script>
