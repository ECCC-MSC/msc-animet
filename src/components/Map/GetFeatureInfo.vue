<template>
  <div
    id="popupGFI"
    ref="popupGFI"
    class="ol-popup bg-surface"
    :style="popupStyle"
    v-show="items.length !== 0"
  >
    <a href="#" id="popupGFI-closer" class="ol-popup-closer"></a>
    <v-card flat class="tree-container">
      <span
        id="coordinates"
        class="coordinates"
        @click="changeRepresentation"
        >{{ coordinatesRepresentation }}</span
      >
      <div class="divider-container">
        <v-divider class="divider"></v-divider>
      </div>
      <div id="treeviewGFI">
        <tree-node
          v-for="node in items"
          :key="`${node.name}`"
          :node="node"
          @node-toggled="popupFocus"
        >
          <template #title-slot="{ node }">
            <v-tooltip
              location="bottom"
              open-delay="500"
              content-class="custom-tooltip"
            >
              <template v-slot:activator="{ props }">
                <span v-bind="props">{{
                  node.children ? node.name.split('/')[0] : node.name
                }}</span>
              </template>
              <span class="dont-break-out">{{ node.name }}</span>
            </v-tooltip>
          </template>
        </tree-node>
      </div>
    </v-card>
  </div>
</template>

<script>
import { isDarkTheme } from '@/components/Composables/isDarkTheme'
import { useI18n } from 'vue-i18n'

import { transform } from 'ol/proj.js'

export default {
  inject: ['store'],
  setup() {
    const { isDark } = isDarkTheme()
    return { isDark }
  },
  data() {
    return {
      closer: null,
      coordinateOptions: {
        DD: {
          name: 'Decimal degrees',
          method: (lon, lat) => {
            return `lat: ${lat.toFixed(2)}°, lon: ${lon.toFixed(2)}°`
          },
        },
        DDM: {
          name: 'Degrees and decimal minutes',
          method: (lon, lat) => {
            const formattedLon = this.decimalToDMS(lon, false)
            const formattedLat = this.decimalToDMS(lat, true)
            return `${formattedLat.degrees}°${formattedLat.minutes}'${formattedLat.direction}, ${formattedLon.degrees}°${formattedLon.minutes}'${formattedLon.direction}`
          },
        },
        DMS: {
          name: 'Degrees, Minutes, Seconds',
          method: (lon, lat) => {
            const formattedLon = this.decimalToDMS(lon, false)
            const formattedLat = this.decimalToDMS(lat, true)
            return `${formattedLat.degrees}°${formattedLat.minutes}'${formattedLat.seconds}"${formattedLat.direction}, ${formattedLon.degrees}°${formattedLon.minutes}'${formattedLon.seconds}"${formattedLon.direction}`
          },
        },
        SD: {
          name: 'Signed degrees',
          method: (lon, lat) => {
            const latDirection = lat >= 0 ? 'N' : 'S'
            const lonDirection = lon >= 0 ? 'E' : 'W'
            return `${Math.abs(lat.toFixed(2))}°${latDirection}, ${Math.abs(lon.toFixed(2))}°${lonDirection}`
          },
        },
      },
      coordinatesSelection: 'SD',
      currentCoordinates: null,
      dividerWidth: 0,
      eventGFI: null,
      items: [],
      locked: false,
      overlay: null,
      t: useI18n().t,
    }
  },
  mounted() {
    const coordinatesPreference = this.getCoordinatesPreference()
    if (coordinatesPreference !== null) {
      this.coordinatesSelection = coordinatesPreference
    }
    window.addEventListener('keydown', this.closeMenu)
    this.emitter.on('localeChange', this.changeGFILang)
    this.emitter.on('modelRunChanged', this.onModelRunChange)
    this.emitter.on('onMapClicked', this.onSingleClick)

    this.closer = document.getElementById('popupGFI-closer')
    this.closer.onclick = this.closePopup
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.closeMenu)
    this.emitter.off('localeChange', this.changeGFILang)
    this.emitter.off('modelRunChanged', this.onModelRunChange)
    this.emitter.off('onMapClicked', this.onSingleClick)
  },
  computed: {
    isAnimating() {
      return this.store.getIsAnimating
    },
    mapTimeSettings() {
      return this.store.getMapTimeSettings
    },
    menusOpen() {
      return this.store.getMenusOpen
    },
    textBoxFocused() {
      return this.store.getTextBoxFocused
    },
    coordinatesRepresentation() {
      let rep =
        this.currentCoordinates !== null
          ? this.coordinateOptions[this.coordinatesSelection].method(
              this.currentCoordinates[0],
              this.currentCoordinates[1],
            )
          : ''
      if (this.$i18n.locale === 'fr') {
        rep = rep.replace('W', 'O')
      }
      return rep
    },
    maplayersLength() {
      return this.$mapLayers.arr.length
    },
    mapLayersProperties() {
      return this.$mapLayers.arr.map((layer) => {
        const properties = layer.getProperties()
        return { ...properties }
      })
    },
    popupStyle() {
      return {
        '--popup-gfi-arrow-color': this.isDark ? '#212121' : 'white',
      }
    },
  },
  watch: {
    coordinatesRepresentation(text) {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      context.font = window.getComputedStyle(
        document.getElementById('coordinates'),
      ).fontSize
      this.dividerWidth = `${context.measureText(text).width + 20}px`
    },
    mapLayersProperties() {
      if (this.overlay !== null && this.eventGFI !== null)
        this.onSingleClick(this.eventGFI, false)
    },
    mapTimeSettings: {
      deep: true,
      handler() {
        if (this.overlay !== null && this.eventGFI !== null)
          this.onSingleClick(this.eventGFI, false)
      },
    },
    maplayersLength(newVal, oldVal) {
      if (oldVal !== null && newVal === 0 && this.overlay) {
        this.closePopup()
      }
    },
  },
  methods: {
    changeRepresentation() {
      const representations = Object.keys(this.coordinateOptions)
      const currentIndex = representations.indexOf(this.coordinatesSelection)
      const nextIndex = (currentIndex + 1) % representations.length
      this.coordinatesSelection = representations[nextIndex]
      this.setCoordinatesPreference(this.coordinatesSelection)
    },
    changeGFILang() {
      this.items.forEach((item) => {
        if (item.children[0].name.includes(':')) {
          const value = item.children[0].name.split(':')[1]
          item.children[0].name = `${this.t('Value')}${this.t('Colon')}${value}`
          if (item.name.includes('/')) {
            item.children[1].name = `Source${this.t('Colon')} ${item.name.split('/')[1]}`

            if (item.children[2]) {
              item.children[2].name = this.t('OtherProperties')
            }
          } else if (item.children[1]) {
            item.children[1].name = this.t('OtherProperties')
          }
        } else {
          item.children[0].name = this.t('OtherProperties')
        }
      })
    },
    closeMenu(event) {
      if (
        event.key === 'Escape' &&
        this.overlay !== null &&
        !event.defaultPrevented
      ) {
        this.closePopup()
      }
    },
    decimalToDMS(decimal, isLatitude) {
      const absDecimal = Math.abs(decimal)
      const degrees = Math.floor(absDecimal)
      const minutesDecimal = (absDecimal - degrees) * 60
      const minutes = Math.floor(minutesDecimal)
      const seconds = ((minutesDecimal - minutes) * 60).toFixed(2)

      return {
        degrees: degrees,
        minutes: minutes,
        seconds: parseFloat(seconds),
        direction: isLatitude
          ? decimal >= 0
            ? 'N'
            : 'S'
          : decimal >= 0
            ? 'E'
            : 'W',
      }
    },
    getCoordinatesPreference() {
      return localStorage.getItem('coordinates-preference')
    },
    onModelRunChange() {
      if (this.overlay !== null && this.eventGFI !== null)
        this.onSingleClick(this.eventGFI, false)
    },
    async onSingleClick(eventGFI, pan = true) {
      if (!this.locked) {
        this.locked = true
        this.eventGFI = eventGFI
        const { event: evt, overlay } = eventGFI
        let itemsGFI = []
        if (
          this.$mapLayers.arr.length > 0 &&
          this.menusOpen === 0 &&
          this.textBoxFocused === false
        ) {
          let urls = {}
          this.$mapLayers.arr.toReversed().forEach((layer) => {
            if (layer.get('visible')) {
              urls[layer.get('layerName')] = layer
                .getSource()
                .getFeatureInfoUrl(
                  evt.coordinate,
                  evt.map.getView().getResolution(),
                  evt.map.getView().getProjection().getCode(),
                  { INFO_FORMAT: 'application/json', FEATURE_COUNT: 1 },
                )
            }
          })
          this.overlay = overlay
          let index = 0
          for (const [name, url] of Object.entries(urls)) {
            try {
              await fetch(url)
                .then((response) => response.json())
                .then((json) => {
                  if (
                    Object.keys(json).length > 0 &&
                    json.features.length !== 0
                  ) {
                    let feature = []
                    if (Object.hasOwn(json.features[0].properties, 'value')) {
                      feature.push({
                        id: index,
                        name: `${this.t('Value')}${this.t('Colon')} ${
                          json.features[0].properties.value
                        }`,
                      })
                      delete json.features[0].properties.value
                      index++
                    }
                    if (name.includes('/')) {
                      feature.push({
                        id: index,
                        name: `Source${this.t('Colon')} ${name.split('/')[1]}`,
                      })
                      index++
                    }
                    if (Object.keys(json.features[0].properties).length > 0) {
                      feature.push({
                        id: index,
                        name: this.t('OtherProperties'),
                        children: Object.entries(
                          json.features[0].properties,
                        ).map(([key, value], childIndex) => {
                          return {
                            id: `${index}-${childIndex}`,
                            name: `${key}: ${value}`,
                          }
                        }),
                      })
                    }
                    index++

                    const item = {
                      id: index,
                      name: name,
                      children: feature,
                      isOpen: true,
                    }
                    itemsGFI.push(item)
                    index++
                  }
                })
            } catch {
              // Just continue execution if somehow the request errors out
            }
          }
          // Match isOpen states to keep nodes opened/closed during updates
          if (this.items.length !== 0) {
            for (const item of this.items) {
              if ('isOpen' in item) {
                const indexGFI = itemsGFI.findIndex(
                  (obj) => obj.name === item.name,
                )
                if (indexGFI !== -1) {
                  itemsGFI[indexGFI].isOpen = item.isOpen
                  for (const feature of item.children) {
                    if ('isOpen' in feature) {
                      const indexFeat = itemsGFI[indexGFI].children.findIndex(
                        (feat) => feat.name === feature.name,
                      )
                      if (indexFeat !== -1) {
                        itemsGFI[indexGFI].children[indexFeat].isOpen =
                          feature.isOpen
                      }
                    }
                  }
                }
              }
            }
          }
          this.items = itemsGFI
          if (this.items.length !== 0 && pan) {
            this.popupFocus()
            overlay.setPosition(evt.coordinate)
            this.setMapCoordinates(evt.coordinate)
          } else if (this.items.length === 0 && !pan) {
            this.closePopup()
          } else {
            overlay.setPosition(evt.coordinate)
            this.setMapCoordinates(evt.coordinate)
          }
          this.locked = false
        } else {
          this.locked = false
        }
      }
    },
    popupFocus() {
      this.$nextTick(() => {
        if (this.overlay !== null) {
          const overlayRect = this.$refs.popupGFI.getBoundingClientRect()
          const isOffScreen =
            overlayRect.right + 64 > window.innerWidth ||
            overlayRect.top - 50 < 0 ||
            overlayRect.bottom + 144 > window.innerHeight
          if (isOffScreen) {
            const currentCenter = this.$mapCanvas.mapObj.getView().getCenter()
            let newCenter = currentCenter
            if (overlayRect.right + 64 > window.innerWidth) {
              const rightPixel =
                this.$mapCanvas.mapObj.getPixelFromCoordinate(currentCenter)
              newCenter[0] = this.$mapCanvas.mapObj.getCoordinateFromPixel([
                rightPixel[0] + (overlayRect.right - window.innerWidth) + 64,
                rightPixel[1],
              ])[0]
            }
            if (overlayRect.bottom + 144 > window.innerHeight) {
              const bottomPixel =
                this.$mapCanvas.mapObj.getPixelFromCoordinate(currentCenter)
              newCenter[1] = this.$mapCanvas.mapObj.getCoordinateFromPixel([
                bottomPixel[0],
                bottomPixel[1] +
                  (overlayRect.bottom + 144 - window.innerHeight),
              ])[1]
            }
            if (overlayRect.top - 50 < 0) {
              const topPixel =
                this.$mapCanvas.mapObj.getPixelFromCoordinate(currentCenter)
              newCenter[1] = this.$mapCanvas.mapObj.getCoordinateFromPixel([
                topPixel[0],
                topPixel[1] - Math.abs(overlayRect.top) - 50,
              ])[1]
            }
            const view = this.$mapCanvas.mapObj.getView()
            view.animate({
              center: newCenter,
              duration: 250,
            })
          }
        }
      })
    },
    setCoordinatesPreference(newSelection) {
      localStorage.setItem('coordinates-preference', newSelection)
    },
    setMapCoordinates(eventCoordinates) {
      const mapProjection = this.$mapCanvas.mapObj.getView().getProjection()
      this.currentCoordinates = transform(
        eventCoordinates,
        mapProjection,
        'EPSG:4326',
      )
    },
    closePopup() {
      this.overlay.setPosition(undefined)
      this.closer.blur()
      this.eventGFI = null
      this.locked = false
      this.items = []
      return false
    },
  },
}
</script>

<style scoped>
.coordinates {
  align-items: center;
  cursor: pointer;
  display: flex;
  font-size: 0.7em;
  justify-content: center;
  margin-left: 20px;
  padding-right: 20px;
  white-space: nowrap;
  width: 100%;
}
.custom-dark {
  background-color: #212121;
  border-color: #212121;
}
.custom-tooltip {
  background-color: #333;
  max-width: 500px;
  opacity: 0.95;
}
.divider {
  margin-left: auto;
  margin-right: auto;
  width: v-bind(dividerWidth);
  opacity: 0.3;
}
.divider-container {
  padding-left: 20px;
}
.dont-break-out {
  overflow-wrap: break-word;
  word-wrap: break-word;

  -ms-word-break: break-all;
  word-break: break-all;
  word-break: break-word;

  -ms-hyphens: auto;
  -moz-hyphens: auto;
  -webkit-hyphens: auto;
  hyphens: auto;
}
.ol-popup {
  position: absolute;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  padding-right: 20px;
  border-radius: 20px;
  border: 1px solid #cccccc;
  bottom: 12px;
  left: -50px;
}
.ol-popup:after,
.ol-popup:before {
  top: 100%;
  border: solid transparent;
  content: ' ';
  height: 0;
  width: 0;
  position: absolute;
  pointer-events: none;
}
.ol-popup:after {
  border-top-color: var(--popup-gfi-arrow-color);
  border-width: 10px;
  left: 48px;
  margin-left: -10px;
}
.ol-popup:before {
  border-top-color: #cccccc;
  border-width: 11px;
  left: 48px;
  margin-left: -11px;
  margin-top: 1px;
}
.ol-popup-closer {
  text-decoration: none;
  position: absolute;
  top: 2px;
  right: 8px;
}
.ol-popup-closer:after {
  content: '✖';
}
.tree-container {
  border-radius: 20px;
  max-width: 550px;
  max-height: calc(90vh - (34px + 0.5em * 2) - 0.5em - 128px);
  overflow-y: auto;
  padding: 4px 0px;
  transition: none;
}
#treeviewGFI {
  font-size: 0.9em;
  margin-right: 6px;
}
</style>
