<template>
  <v-card>
    <v-tabs fixed-tabs v-model="tab">
      <v-tab
        v-for="(wmsSource, index) in Object.keys(getGeoMetWmsSources)"
        :key="index"
      >
        {{ $t(wmsSource) }}
        <v-tooltip top>
          <template v-slot:activator="{ on, attrs }">
            <v-chip
              v-if="isNightly == 1"
              x-small
              color="info"
              class="ml-1"
              v-on="on"
              v-bind="attrs"
              >Nightly</v-chip
            >
          </template>
          <span>{{ getGeoMetWmsSources[wmsSource].url }}</span>
        </v-tooltip>
      </v-tab>
      <v-tab>{{ $t("Overlays") }}</v-tab>

      <v-tab-item
        v-for="(_, wmsSource, index) in getGeoMetWmsSources"
        :key="index"
        eager
      >
        <v-card flat>
          <v-card-title class="pt-2 pb-0 pl-3 pr-2">
            {{ $t("GeoMetWms").replace("{wmsSource}", $t(wmsSource)) }}
          </v-card-title>
          <v-card-text class="pt-2 pb-2 pl-3 pr-2">
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
              class="treeview pr-0"
              :disabled="!getAvailableCRS[index].includes(getCurrentCRS)"
            >
              <template v-slot:prepend="{ item }">
                <v-btn
                  v-if="!item.children"
                  icon
                  :disabled="
                    (isAnimating && playState !== 'play') ||
                    !getAvailableCRS[index].includes(getCurrentCRS)
                  "
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
                  @click="
                    isAnimating ||
                    !getAvailableCRS[index].includes(getCurrentCRS)
                      ? null
                      : requestLayerData(item)
                  "
                  class="ma-0 pa-0 tree-item"
                >
                  <span :title="item.Title">{{ item.Title }}<br /></span>
                  <span
                    v-if="item.isLeaf"
                    class="grey--text tree-item-layername"
                    >{{ item.Name }}</span
                  >
                </v-container>
              </template>
            </v-treeview>
          </v-card-text>
        </v-card>
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
            class="pl-12"
            @change="$root.$emit('overlayToggle', values, overlay)"
          >
            <template v-slot:label>
              <span
                :class="{
                  'white--text': $vuetify.theme.dark,
                  'black--text': !$vuetify.theme.dark,
                }"
                >{{ $t(overlay) }}</span
              >
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
  created() {
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
      isNightly: process.env.VUE_APP_IS_NIGHTLY,
      addedLayers: [],
      filteredTreeNodes: [],
      openedLevels: [],
      searchGeoMet: [],
      tab: null,
      xsltFull: `parse-xml($xml)//Layer[not(.//Layer) and Name = 'REPLACE_WITH_LAYERNAME']!map
                        {
                            'Name' : string(Name),
                            'Title' : string(Title),
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
  methods: {
    async requestLayerData(layer) {
      if (this.playState === "play") {
        this.$root.$emit("stopAnimation");
      }
      if (layer.isLeaf && !this.addedLayers.includes(layer.Name)) {
        let source = Object.hasOwn(layer, "wmsSource")
          ? layer.wmsSource
          : this.getCurrentWmsSource;
        layer.wmsIndex = Object.keys(this.getGeoMetWmsSources).findIndex(
          (key) => this.getGeoMetWmsSources[key]["url"] === source
        );
        this.addedLayers.push(layer.Name);
        let layerData = null;
        const api = axios.create({
          baseURL: source,
          params: {
            SERVICE: "WMS",
            VERSION: "1.3.0",
            REQUEST: "GetCapabilities",
            LAYERS: layer.Name,
            t: new Date().getTime(),
          },
        });
        await api.get().then((response) => {
          layerData = SaxonJS.XPath.evaluate(
            this.xsltFull.replace("REPLACE_WITH_LAYERNAME", layer.Name),
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
        layerData = { ...layerData, ...layer };
        layerData.isTemporal = layerData.Dimension.Dimension_time !== "";
        this.$root.$emit("buildLayer", layerData, source);
      } else if (
        this.$mapLayers.arr.some((l) => l.get("layerName") === layer.Name)
      ) {
        this.$root.$emit(
          "removeLayer",
          this.$mapLayers.arr.find((l) => l.get("layerName") === layer.Name)
        );
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
    ...mapState("Layers", ["isAnimating", "playState"]),
    ...mapGetters("Layers", [
      "getCurrentCRS",
      "getCurrentWmsSource",
      "getGeoMetTreeItems",
      "getGeoMetWmsSources",
      "getPossibleOverlays",
      "getAvailableCRS",
    ]),
  },
};
</script>

<style scoped>
.tree-item {
  line-height: 1.2;
}
.tree-item-layername {
  font-size: 0.8em;
}
.treeview {
  font-size: 1.1em;
  max-height: calc(100vh - (34px + 0.5em * 2) - 138px - 190px);
  overflow-y: auto;
}
.treeview::v-deep .v-treeview-node__root {
  min-height: 32px;
  max-height: 42px;
}
.treeview::v-deep .v-treeview-node__level {
  width: 16px;
}
.treeview::v-deep .v-treeview-node__content {
  margin-left: -20px;
}
.treeview::v-deep .v-treeview-node__prepend {
  margin-right: 0;
}
@media (max-width: 1265px) {
  .treeview {
    max-height: calc(100vh - (34px + 0.5em * 2) - 138px - 190px - 42px);
  }
}
@media (max-width: 1120px) {
  .treeview {
    max-height: calc(100vh - (34px + 0.5em * 2) - 138px - 190px - 42px + 24px);
  }
}
@media (max-width: 565px) {
  .treeview {
    max-height: calc(100vh - (34px + 0.5em * 2) - 158px - 190px - 42px - 10px);
  }
}
.v-tabs:not(.v-tabs--vertical):not(.v-tabs--right)
  >>> .v-slide-group--is-overflowing.v-tabs-bar--is-mobile:not(
    .v-slide-group--has-affixes
  )
  .v-slide-group__prev {
  display: none !important;
}
</style>
