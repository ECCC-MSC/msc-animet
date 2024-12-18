<template>
  <v-card class="radius" max-width="100%">
    <tabs :tabs="geometWmsSources" @tab-change="setCurrentWMSSource">
      <template v-slot:tab-content>
        <v-card flat>
          <v-card-title class="pt-2 pb-0 pl-3 pr-2">
            {{
              $t('GeoMetWms', {
                wmsSource: sourceParameters.no_translations
                  ? wmsSource
                  : $t(wmsSource),
              })
            }}
          </v-card-title>
          <v-card-text class="pt-2 pb-2 pl-3 pr-2">
            <v-text-field
              autofocus
              v-model="searchGeoMet[this.tab]"
              :label="
                $t('GeoMetSearchLabel', {
                  wmsSource: sourceParameters.no_translations
                    ? wmsSource
                    : $t(wmsSource),
                })
              "
              clearable
              hide-details
              color="primary"
              density="compact"
              variant="underlined"
              @keydown.left.right.space.enter.stop
              @input="debouncedFilterOnInput(this.tab)"
              @click:clear="filterOnInput(this.tab)"
            >
            </v-text-field>
            <div :ref="wmsSource" class="treeview pr-0">
              <tree-node
                v-for="node in filteredTreeNodes[this.tab]"
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
      </template>
    </tabs>
  </v-card>
</template>

<script>
import axios from '../../utils/AxiosConfig.js'

import { debounce } from 'lodash'

import { useDisplay } from 'vuetify'
import { useTheme } from 'vuetify'

export default {
  inject: ['store'],
  setup() {
    const theme = useTheme()
    const isDark = computed(() => theme.global.current.value.dark)
    return { isDark }
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

    this.debouncedFilterOnInput = debounce(this.filterOnInput, 500)

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
  data() {
    return {
      activateNodeCheck: false,
      addedLayers: [],
      closedNodes: new Set(),
      debouncedFilterOnInput: null,
      filteredTreeNodes: [],
      isNightly: import.meta.env.APP_IS_NIGHTLY,
      openedLevels: [],
      searchGeoMet: [],
      smAndDown: false,
      tab: 0,
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
          } else {
            this.addedLayers = this.addedLayers.filter(
              (added) => added !== layer.Name,
            )
            this.emitter.emit('LayerQueryFailure')
            throw new Error(`Query for ${layer.Name} failed`)
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
    filterCallbackFunction(array, fn, searchLength) {
      return array.reduce((r, o) => {
        let children
        if (searchLength === 2 && fn(o)) {
          children = o.children || []
        } else {
          children = this.filterCallbackFunction(
            o.children || [],
            fn,
            searchLength,
          )
        }
        if (fn(o) || children.length) {
          const newNode = {
            ...o,
            isOpen: !this.closedNodes.has(o.Name),
          }
          if (children.length > 0) {
            newNode.children = children
          }
          r.push(newNode)
        }
        return r
      }, [])
    },
    filterOnInput(index) {
      if (this.searchGeoMet[index] !== null) {
        const searchLength = this.searchGeoMet[index].trim().length
        if (searchLength >= 2) {
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
            searchLength,
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
    setCurrentWMSSource(newTab, oldTab) {
      if (newTab !== Object.keys(this.geometWmsSources).length) {
        this.tab = newTab
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
    displayTabArrows() {
      return Boolean(
        this.smAndDown &&
          (this.isNightly || Object.keys(this.geometWmsSources).length > 2),
      )
    },
    sourceParameters() {
      return this.geometWmsSources[this.wmsSource]
    },
    wmsSource() {
      return Object.keys(this.geometWmsSources)[this.tab]
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
.radius {
  border-radius: 0px;
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
  .treeview {
    max-height: calc(100vh - (34px + 0.5em * 2) - 158px - 190px - 42px - 10px);
  }
}
</style>
