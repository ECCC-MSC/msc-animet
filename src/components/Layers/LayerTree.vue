<template>
  <v-card class="radius" max-width="100%">
    <v-tabs :show-arrows="displayTabArrows" v-model="tab">
      <v-tab
        v-for="(wmsSource, index) in Object.keys(geometWmsSources)"
        :key="index"
        class="source-tabs"
        color="primary"
        density="compact"
      >
        {{ $t(wmsSource) }}
        <v-tooltip location="top">
          <template v-slot:activator="{ props }">
            <v-chip
              v-if="isNightly == 1"
              class="nightly-chip"
              color="info"
              density="compact"
              size="small"
              v-bind="props"
            >
              Nightly
            </v-chip>
          </template>
          <span>{{ geometWmsSources[wmsSource].url }}</span>
        </v-tooltip>
      </v-tab>
      <v-tab class="source-tabs" color="primary">{{ $t('Overlays') }}</v-tab>
    </v-tabs>
    <v-tabs-window v-model="tab">
      <v-tabs-window-item
        v-for="(_, wmsSource, index) in geometWmsSources"
        :key="index"
        eager
      >
        <v-card flat>
          <v-card-title class="pt-2 pb-0 pl-3 pr-2">
            {{ $t('GeoMetWms', { wmsSource: $t(wmsSource) }) }}
          </v-card-title>
          <v-card-text class="pt-2 pb-2 pl-3 pr-2">
            <v-text-field
              autofocus
              v-model="searchGeoMet[index]"
              :label="$t('GeoMetSearchLabel', { wmsSource: $t(wmsSource) })"
              clearable
              hide-details
              color="primary"
              density="compact"
              variant="underlined"
              @keydown.left.right.space.stop
              @input="filterOnInput(index)"
              @click:clear="filterOnInput(index)"
            >
            </v-text-field>
            <div :ref="wmsSource" class="treeview pr-0">
              <tree-node
                v-for="node in filteredTreeNodes[index]"
                :key="`${node.Name}`"
                :node="node"
                key-prop="Name"
                title-prop="Title"
                @node-toggled="handleNodeToggle"
                @request="requestLayerData"
              >
                <template #node-icon="{ node }">
                  <v-btn
                    icon
                    class="icon-only-btn"
                    density="comfortable"
                    variant="text"
                    :disabled="isAnimating && playState !== 'play'"
                  >
                    <v-icon
                      color="primary"
                      :disabled="isAnimating && playState !== 'play'"
                    >
                      {{
                        $mapLayers.arr.some(
                          (l) => l.get('layerName') === node.Name,
                        )
                          ? 'mdi-minus'
                          : 'mdi-plus'
                      }}
                    </v-icon>
                  </v-btn>
                </template>

                <template #title-slot="{ node }">
                  <v-tooltip
                    :text="node.Title"
                    location="bottom"
                    open-delay="750"
                  >
                    <template v-slot:activator="{ props }">
                      <span
                        class="title"
                        v-bind="props"
                        :class="{
                          'title-leaf': node.isLeaf,
                          'text-primary': $mapLayers.arr.some(
                            (l) => l.get('layerName') === node.Name,
                          ),
                        }"
                      >
                        {{ node.Title }}
                        <template v-if="node.isLeaf">
                          <br />
                          <span class="subtitle">{{ node.Name }}</span>
                        </template>
                      </span>
                    </template>
                  </v-tooltip>
                </template>
              </tree-node>
            </div>
          </v-card-text>
        </v-card>
      </v-tabs-window-item>
      <v-tabs-window-item eager>
        <v-card class="pb-3">
          <v-card-subtitle>
            {{ $t('OverlaysTip') }}
          </v-card-subtitle>
          <v-checkbox
            v-for="(values, overlay, index) in possibleOverlays"
            :key="index"
            :disabled="isAnimating"
            hide-details
            class="pl-12 overlay-cb"
            @change="emitter.emit('overlayToggle', { values, overlay })"
          >
            <template v-slot:label>
              <span
                :class="{
                  'text-white': this.theme.global.current.value.dark,
                  'text-black': !this.theme.global.current.value.dark,
                }"
                >{{ $t(overlay) }}</span
              >
            </template>
          </v-checkbox>
        </v-card>
      </v-tabs-window-item>
    </v-tabs-window>
  </v-card>
</template>

<script>
import axios from '../../utils/AxiosConfig.js'
import { useDisplay } from 'vuetify'
import { useTheme } from 'vuetify'

export default {
  inject: ['store'],
  setup() {
    const theme = useTheme()
    return { theme }
  },
  created() {
    const { smAndDown } = useDisplay()
    this.$watch(
      () => smAndDown.value,
      (newValue) => {
        this.smAndDown = newValue
      },
      { immediate: true },
    )

    this.filteredTreeNodes.push(...this.geometTreeItems)
    this.searchGeoMet = new Array(
      Object.keys(this.geometWmsSources).length,
    ).fill(null)
    this.emitter.on('layerRemoved', (layerName) => {
      this.addedLayers = this.addedLayers.filter((added) => added !== layerName)
    })
    this.emitter.on('localeChange', this.resetSearchAndTree)
    this.emitter.on('permaLinkLayer', this.requestLayerData)
  },
  watch: {
    tab(newTab, oldTab) {
      if (newTab !== Object.keys(this.geometWmsSources).length) {
        this.store.setWmsSourceURL(
          this.geometWmsSources[Object.keys(this.geometWmsSources)[newTab]][
            'url'
          ],
        )
        if (oldTab !== null) {
          this.resetSearchAndTree()
        }
      }
    },
  },
  data() {
    return {
      isNightly: import.meta.env.VITE_APP_IS_NIGHTLY,
      activateNodeCheck: false,
      addedLayers: [],
      closedNodes: new Set(),
      filteredTreeNodes: [],
      openedLevels: [],
      searchGeoMet: [],
      tab: null,
      smAndDown: false,
    }
  },
  methods: {
    async requestLayerData(layer) {
      if (this.playState === 'play') {
        this.emitter.emit('stopAnimation')
      }
      if (layer.isLeaf && !this.addedLayers.includes(layer.Name)) {
        let source = Object.hasOwn(layer, 'wmsSource')
          ? layer.wmsSource
          : this.currentWmsSource
        const sources = Object.keys(this.geometWmsSources)
        layer.wmsIndex = sources.findIndex(
          (key) => this.geometWmsSources[key]['url'] === source,
        )
        if (
          Object.hasOwn(
            this.geometWmsSources[sources[layer.wmsIndex]],
            'query_pattern',
          )
        ) {
          let pattern =
            this.geometWmsSources[sources[layer.wmsIndex]]['query_pattern']
          const querySplits = layer.Name.split(':')
          let layerPattern = ''
          for (let i = 0; i < querySplits.length; i++) {
            layerPattern += `/${querySplits[i]}`
          }
          source = pattern.replace('{LAYER}', layerPattern)
          layer.xmlName = querySplits[querySplits.length - 1]
        } else {
          layer.xmlName = layer.Name
        }
        this.addedLayers.push(layer.Name)
        let layerData = null
        const api = axios.create({
          baseURL: source,
          params: {
            SERVICE: 'WMS',
            VERSION: '1.3.0',
            REQUEST: 'GetCapabilities',
            LAYERS: layer.Name,
            t: new Date().getTime(),
          },
        })
        await api.get().then((response) => {
          const xmlDoc = new DOMParser().parseFromString(
            response.data,
            'text/xml',
          )
          const layerName = layer.xmlName
          const xpathExpression = `//wms:Layer[not(.//wms:Layer) and wms:Name='${layerName}']`
          function nsResolver(prefix) {
            const ns = {
              wms: 'http://www.opengis.net/wms',
              xlink: 'http://www.w3.org/1999/xlink',
            }
            return ns[prefix] || null
          }
          const xpathResult = xmlDoc.evaluate(
            xpathExpression,
            xmlDoc,
            nsResolver,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null,
          )
          layerData = {}
          if (xpathResult.snapshotLength > 0) {
            const node = xpathResult.snapshotItem(0)
            layerData.Name = node.getElementsByTagName('Name')[0].textContent
            layerData.Title = node.getElementsByTagName('Title')[0].textContent

            const dimension = {
              Dimension_time: '',
              Dimension_time_default: '',
              Dimension_ref_time: '',
            }
            const timeDimension = node.getElementsByTagName('Dimension')
            for (let i = 0; i < timeDimension.length; i++) {
              const dim = timeDimension[i]
              if (dim.getAttribute('name') === 'time') {
                dimension.Dimension_time = dim.textContent
                dimension.Dimension_time_default = dim.getAttribute('default')
              } else if (dim.getAttribute('name') === 'reference_time') {
                dimension.Dimension_ref_time = dim.textContent
              }
            }
            layerData.Dimension = dimension

            layerData.Style = []
            const styles = node.getElementsByTagName('Style')
            for (let i = 0; i < styles.length; i++) {
              const style = styles[i]
              layerData.Style.push({
                Name: style.getElementsByTagName('Name')[0].textContent,
                Title: style.getElementsByTagName('Title')[0].textContent,
                LegendURL: style
                  .getElementsByTagName('LegendURL')[0]
                  .getElementsByTagName('OnlineResource')[0]
                  .getAttributeNS('http://www.w3.org/1999/xlink', 'href'),
              })
            }
          }
        })
        layerData = { ...layerData, ...layer }
        layerData.isTemporal = layerData.Dimension.Dimension_time !== ''
        this.emitter.emit('buildLayer', { layerData, source })
      } else if (
        this.$mapLayers.arr.some((l) => l.get('layerName') === layer.Name)
      ) {
        this.emitter.emit(
          'removeLayer',
          this.$mapLayers.arr.find((l) => l.get('layerName') === layer.Name),
        )
      }
    },
    filterCallbackFunction(array, fn) {
      return array.reduce((r, o) => {
        let children = this.filterCallbackFunction(o.children || [], fn)
        if (fn(o) || children.length) {
          r.push(
            Object.assign({}, o, children.length && { children }, {
              isOpen: !this.closedNodes.has(o.Name),
            }),
          )
        }
        if (this.closedNodes.has(o.Name)) {
          // delete o.isOpen;
        }
        return r
      }, [])
    },
    filterOnInput(index) {
      if (this.searchGeoMet[index] !== null) {
        if (this.searchGeoMet[index].trim().length >= 2) {
          this.activateNodeCheck = true
          this.filteredTreeNodes[index] = this.filterCallbackFunction(
            this.geometTreeItems[index],
            (item) => {
              const searchTerms = this.searchGeoMet[index]
                .toLowerCase()
                .split(' ')
              const itemText = `${item['Title']} ${item['Name']}`.toLowerCase()
              return searchTerms.every((term) => itemText.includes(term))
            },
          )
        } else {
          this.activateNodeCheck = false
          this.filteredTreeNodes[index] = this.geometTreeItems[index]
        }
      } else {
        this.activateNodeCheck = false
        this.filteredTreeNodes[index] = this.geometTreeItems[index]
      }
    },
    handleNodeToggle(nodeName, isOpen) {
      if (this.activateNodeCheck) {
        if (!isOpen) {
          this.closedNodes.add(nodeName)
        } else {
          this.closedNodes.delete(nodeName)
        }
      } else {
        // this.closedNodes.clear();
      }
    },
    resetSearchAndTree() {
      this.searchGeoMet.fill(null)
      for (let i = 0; i < Object.keys(this.$refs).length; i++) {
        this.filterOnInput(i)
      }
    },
  },
  computed: {
    availableCRS() {
      return this.store.getAvailableCRS
    },
    currentCRS() {
      return this.store.getCurrentCRS
    },
    currentWmsSource() {
      return this.store.getCurrentWmsSource
    },
    geometTreeItems() {
      return this.store.getGeoMetTreeItems
    },
    geometWmsSources() {
      return this.store.getGeoMetWmsSources
    },
    isAnimating() {
      return this.store.getIsAnimating
    },
    playState() {
      return this.store.getPlayState
    },
    possibleOverlays() {
      return this.store.getPossibleOverlays
    },
    displayTabArrows() {
      return Boolean(
        this.smAndDown &&
          (this.isNightly || Object.keys(this.geometWmsSources).length > 2),
      )
    },
  },
}
</script>

<style scoped>
.icon-only-btn {
  background-color: transparent;
  border: none;
  box-shadow: none;
}
.icon-only-btn:hover {
  background-color: rgba(211, 211, 211, 0.2);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.overlay-cb:deep(.v-selection-control__input > .v-icon) {
  opacity: 1;
}
.overlay-cb:deep(.v-label) {
  opacity: 1;
  font-size: 1.08rem;
}
.radius {
  border-radius: 0px;
}
.source-tabs {
  flex: 1;
  padding: 0 4px;
}
.source-tabs:deep(.v-btn__content) {
  white-space: normal;
}
.subtitle {
  color: grey;
  display: block;
  font-size: 0.8em;
  margin-top: -4px;
}
.title-leaf {
  display: block;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
}
.treeview {
  font-size: 1.11em;
  max-height: calc(100vh - (34px + 0.5em * 2) - 138px - 190px);
  overflow-y: auto;
}
.v-tabs:deep(.v-slide-group__next),
.v-tabs:deep(.v-slide-group__prev) {
  flex: 0 1;
  min-width: 30px;
}
@media (max-width: 1120px) {
  .treeview {
    max-height: calc(100vh - (34px + 0.5em * 2) - 138px - 190px + 24px);
  }
}
@media (max-width: 959px) {
  .treeview {
    max-height: calc(100vh - (34px + 0.5em * 2) - 138px - 190px - 42px + 24px);
  }
}
@media (max-width: 565px) {
  .nightly-chip {
    padding-left: 4px;
    padding-right: 14px;
    transform: translateX(-10px);
  }
  .treeview {
    max-height: calc(100vh - (34px + 0.5em * 2) - 158px - 190px - 42px - 10px);
  }
}
</style>
