<template>
  <v-card>
    <v-tabs fixed-tabs v-model="tab">
      <v-tab
        v-for="(wmsSource, index) in Object.keys(getGeoMetWmsSources)"
        :key="index"
        >{{ $t(wmsSource) }}</v-tab
      >
      <v-tab>{{ $t("Overlays") }}</v-tab>

      <v-tab-item
        v-for="(_, wmsSource, index) in getGeoMetWmsSources"
        :key="index"
        eager
      >
        <v-expansion-panels v-model="expandTreePanel">
          <v-expansion-panel v-model="expandTreePanel">
            <v-expansion-panel-header>
              {{ $t("GeoMetWms").replace("{wmsSource}", $t(wmsSource)) }}
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <v-text-field
                autofocus
                v-model="searchGeoMet[index]"
                :label="
                  $t('GeoMetSearchLabel').replace('{wmsSource}', $t(wmsSource))
                "
                clearable
                dense
                hide-details
                @input="filterOnInput(index)"
              >
              </v-text-field>
              <v-treeview
                :items="filteredTreeNodes[index]"
                item-key="Name"
                dense
                open-on-click
                activatable
                hoverable
                :ref="wmsSource"
              >
                <template v-slot:prepend="{ item }">
                  <v-btn
                    v-if="!item.children"
                    x-large
                    color="white"
                    icon
                    :disabled="isAnimating"
                    @click="requestLayerData(item)"
                  >
                    <v-icon color="primary">
                      {{
                        $mapLayers.arr.some(
                          (l) => l.get("layerName") === item.Name
                        )
                          ? "mdi-minus"
                          : "mdi-plus"
                      }}
                    </v-icon>
                  </v-btn>
                </template>
                <template v-slot:label="{ item }">
                  <v-container
                    @click="isAnimating ? null : requestLayerData(item)"
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
                  </v-tooltip>
                </template>
              </v-treeview>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-tab-item>
      <v-tab-item eager>
        <v-card class="pb-3">
          <v-card-subtitle>
            {{ $t("OverlaysTip") }}
          </v-card-subtitle>
          <v-checkbox
            v-for="(values, overlay, index) in getPossibleOverlays"
            :key="index"
            :disabled="isAnimating"
            hide-details
            class="pl-12 font-weight-medium"
            @change="$root.$emit('overlayToggle', values, overlay)"
          >
            <template v-slot:label>
              <span class="black--text">{{ $t(overlay) }}</span>
            </template>
          </v-checkbox>
        </v-card>
      </v-tab-item>
    </v-tabs>
  </v-card>
</template>

<script>
import axios from "axios";
import SaxonJS from "saxon-js";
import { mapGetters, mapState } from "vuex";

export default {
  mounted() {
    this.filteredTreeNodes.push(...this.getGeoMetTreeItems);
    this.searchGeoMet = new Array(
      Object.keys(this.getGeoMetWmsSources).length
    ).fill(null);
    this.$root.$on("layerRemoved", (layerName) => {
      this.addedLayers = this.addedLayers.filter(
        (added) => added !== layerName
      );
    });
    this.$root.$on("localeChange", this.resetSearchAndTree);
    this.$root.$on("permaLinkLayer", this.requestLayerData);
    this.$root.$on("collapseLayerTree", () => {
      this.expandTreePanel = 1;
    });
  },
  watch: {
    tab(newTab, oldTab) {
      if (newTab !== Object.keys(this.getGeoMetWmsSources).length) {
        this.$store.dispatch(
          "Layers/setWmsSourceURL",
          this.getGeoMetWmsSources[
            Object.keys(this.getGeoMetWmsSources)[newTab]
          ]["url"]
        );
        if (oldTab !== null) {
          this.resetSearchAndTree();
        }
      }
    },
  },
  data() {
    return {
      addedLayers: [],
      expandTreePanel: 0,
      filteredTreeNodes: [],
      openedLevels: [],
      searchGeoMet: [],
      tab: null,
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
    async requestLayerData(layer) {
      if (layer.isLeaf && !this.addedLayers.includes(layer.Name)) {
        let source = Object.hasOwn(layer, "wmsSource")
          ? layer.wmsSource
          : this.getCurrentWmsSource;
        this.addedLayers.push(layer.Name);
        let layerData = null;
        const api = axios.create({
          baseURL: source,
          params: {
            service: "WMS",
            version: "1.3.0",
            request: "GetCapabilities",
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
        layerData = { ...layerData, ...layer };
        layerData.isTemporal = layerData.Dimension.Dimension_time !== "";
        this.$root.$emit("buildLayer", layerData, source);
      } else if (
        this.$mapLayers.arr.some((l) => l.get("layerName") === layer.Name)
      ) {
        this.$root.$emit("removeLayer", layer.Name);
      }
    },
    filterCallbackFunction(array, fn) {
      return array.reduce((r, o) => {
        let children = this.filterCallbackFunction(o.children || [], fn);
        if (fn(o) || children.length)
          r.push(Object.assign({}, o, children.length && { children }));
        return r;
      }, []);
    },
    filterOnInput(index) {
      if (this.searchGeoMet[index] !== null) {
        if (
          this.searchGeoMet[index].length >= 3 &&
          this.searchGeoMet[index] !== ""
        ) {
          this.filteredTreeNodes[index] = this.filterCallbackFunction(
            this.getGeoMetTreeItems[index],
            (item) =>
              item["Title"]
                .toLowerCase()
                .indexOf(this.searchGeoMet[index].toLowerCase()) > -1 ||
              item["Name"]
                .toLowerCase()
                .indexOf(this.searchGeoMet[index].toLowerCase()) > -1
          );
          this.$refs[Object.keys(this.getGeoMetWmsSources)[index]][0].updateAll(
            true
          );
        } else {
          this.filteredTreeNodes[index] = this.getGeoMetTreeItems[index];
          this.$refs[Object.keys(this.getGeoMetWmsSources)[index]][0].updateAll(
            false
          );
        }
      } else {
        this.filteredTreeNodes[index] = this.getGeoMetTreeItems[index];
        this.$refs[Object.keys(this.getGeoMetWmsSources)[index]][0].updateAll(
          false
        );
      }
    },
    resetSearchAndTree() {
      this.searchGeoMet.fill(null);
      for (let i = 0; i < Object.keys(this.$refs).length; i++) {
        this.filterOnInput(i);
      }
    },
  },
  computed: {
    ...mapState("Layers", ["isAnimating"]),
    ...mapGetters("Layers", [
      "getCurrentWmsSource",
      "getGeoMetTreeItems",
      "getGeoMetWmsSources",
      "getPossibleOverlays",
    ]),
  },
};
</script>
