<template>
  <div
    id="popupGFI"
    ref="popupGFI"
    class="ol-popup bg-surface"
    :class="{ 'popup-flip': openDownward }"
    v-show="items.length !== 0"
  >
    <v-card flat class="tree-container">
      <div class="gfi-header">
        <button
          type="button"
          class="gfi-coordinates"
          :title="t('CopyCoordinates')"
          @click="copyText(coordinatesRepresentation)"
        >
          {{ coordinatesRepresentation }}
        </button>
        <v-menu
          v-model="formatOpen"
          location="bottom end"
          content-class="gfi-format-menu"
        >
          <template v-slot:activator="{ props }">
            <button
              v-bind="props"
              type="button"
              class="gfi-format-trigger"
              :title="t('CoordinateFormat')"
              :aria-label="`${t('CoordinateFormat')}${t('Colon')} ${t(
                coordinateOptions[coordinatesSelection].label,
              )}`"
            >
              <span>{{ coordinatesSelection }}</span>
              <v-icon size="16">mdi-menu-down</v-icon>
            </button>
          </template>
          <v-list density="compact">
            <v-list-item
              v-for="(option, key) in coordinateOptions"
              :key="key"
              :active="coordinatesSelection === key"
              @click="selectRepresentation(key)"
            >
              <v-list-item-title>{{ t(option.label) }}</v-list-item-title>
              <v-list-item-subtitle>{{
                formatCoordinates(key)
              }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-menu>
        <button
          type="button"
          class="gfi-icon-button"
          :title="t('Close')"
          :aria-label="t('Close')"
          @click="closePopup"
        >
          <v-icon size="16">mdi-close</v-icon>
        </button>
      </div>
      <div class="gfi-rule"></div>
      <div id="treeviewGFI">
        <tree-node
          v-for="node in items"
          :key="`${node.name}`"
          :node="node"
          leaf-action="copy"
          @node-toggled="popupFocus"
          @leaf-copy="copyNode"
        >
          <template #title-slot="{ node }">
            <v-tooltip
              location="bottom"
              open-delay="500"
              content-class="custom-tooltip"
            >
              <template v-slot:activator="{ props }">
                <span v-bind="props" class="gfi-node-title">
                  <template v-if="!node.children && splitLeaf(node.name)">
                    <span class="gfi-leaf-label">{{
                      splitLeaf(node.name).label
                    }}</span>
                    <span class="gfi-leaf-value">{{
                      splitLeaf(node.name).value
                    }}</span>
                  </template>
                  <template v-else>{{
                    node.children ? node.name.split('/')[0] : node.name
                  }}</template>
                </span>
              </template>
              <span class="dont-break-out">{{ node.name }}</span>
            </v-tooltip>
          </template>
        </tree-node>
      </div>
      <div class="gfi-rule"></div>
      <button type="button" class="gfi-copy-all" @click="copyAll">
        <v-icon size="15">mdi-content-copy</v-icon>
        <span>{{ t('CopyAll') }}</span>
      </button>
    </v-card>
  </div>
  <v-snackbar v-model="snackbar" :timeout="1400" location="bottom">{{
    snackbarText
  }}</v-snackbar>
</template>

<script>
import { useI18n } from 'vue-i18n'

import { transform } from 'ol/proj.js'

export default {
  inject: ['store'],
  data() {
    return {
      coordinateOptions: {
        DD: {
          label: 'CoordFormatDD',
          method: (lon, lat) => {
            return `lat: ${lat.toFixed(2)}°, lon: ${lon.toFixed(2)}°`
          },
        },
        DDM: {
          label: 'CoordFormatDDM',
          method: (lon, lat) => {
            const formattedLon = this.decimalToDMS(lon, false)
            const formattedLat = this.decimalToDMS(lat, true)
            return `${formattedLat.degrees}°${formattedLat.minutes}'${formattedLat.direction}, ${formattedLon.degrees}°${formattedLon.minutes}'${formattedLon.direction}`
          },
        },
        DMS: {
          label: 'CoordFormatDMS',
          method: (lon, lat) => {
            const formattedLon = this.decimalToDMS(lon, false)
            const formattedLat = this.decimalToDMS(lat, true)
            return `${formattedLat.degrees}°${formattedLat.minutes}'${formattedLat.seconds}"${formattedLat.direction}, ${formattedLon.degrees}°${formattedLon.minutes}'${formattedLon.seconds}"${formattedLon.direction}`
          },
        },
        SD: {
          label: 'CoordFormatSD',
          method: (lon, lat) => {
            const latDirection = lat >= 0 ? 'N' : 'S'
            const lonDirection = lon >= 0 ? 'E' : 'W'
            return `${Math.abs(lat.toFixed(2))}°${latDirection}, ${Math.abs(lon.toFixed(2))}°${lonDirection}`
          },
        },
      },
      coordinatesSelection: 'SD',
      currentCoordinates: null,
      eventGFI: null,
      formatOpen: false,
      items: [],
      locked: false,
      overlay: null,
      openDownward: false,
      snackbar: false,
      snackbarText: '',
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
  },
  watch: {
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
    selectRepresentation(representation) {
      this.coordinatesSelection = representation
      this.setCoordinatesPreference(representation)
    },
    formatCoordinates(representation) {
      if (this.currentCoordinates === null) return ''
      let formatted = this.coordinateOptions[representation].method(
        this.currentCoordinates[0],
        this.currentCoordinates[1],
      )
      if (this.$i18n.locale === 'fr') {
        formatted = formatted.replace('W', 'O')
      }
      return formatted
    },
    splitLeaf(name) {
      const separator = name.indexOf(':')
      if (separator === -1) return null
      const label = name.slice(0, separator).trim()
      const value = name.slice(separator + 1).trim()
      if (label === '' || value === '') return null
      return { label: label, value: value }
    },
    copyNode(node) {
      const parts = this.splitLeaf(node.name)
      this.copyText(
        parts !== null && (node.type === 'value' || node.type === 'source')
          ? parts.value
          : node.name,
      )
    },
    copyAll() {
      const lines = [this.coordinatesRepresentation]
      const walk = (nodes, depth) => {
        nodes.forEach((node) => {
          lines.push(`${'  '.repeat(depth)}${node.name}`)
          if (node.children) walk(node.children, depth + 1)
        })
      }
      walk(this.items, 1)
      this.copyText(lines.join('\n'))
    },
    async copyText(text) {
      if (!text) return
      let copied = false
      try {
        // navigator.clipboard is undefined on non-secure origins
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text)
          copied = true
        }
      } catch {
        copied = false
      }
      if (!copied) copied = this.copyTextFallback(text)
      this.snackbarText = copied
        ? this.t('CopiedToClipboard')
        : this.t('CopyFailed')
      this.snackbar = true
    },
    copyTextFallback(text) {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.setAttribute('readonly', '')
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      let copied = false
      try {
        copied = document.execCommand('copy')
      } catch {
        copied = false
      }
      document.body.removeChild(textArea)
      return copied
    },
    changeGFILang() {
      const walk = (nodes) => {
        nodes.forEach((node) => {
          if (node.children && node.children.length > 0) {
            walk(node.children)
          }
          if (node.type === 'value') {
            const parts = node.name.split(':')
            const value = parts.slice(1).join(':').trim()
            node.name = `${this.t('Value')}${this.t('Colon')}${value}`
          } else if (node.type === 'source') {
            const parts = node.name.split(':')
            const value = parts.slice(1).join(':').trim()
            node.name = `Source${this.t('Colon')}${value}`
          } else if (node.type === 'other') {
            node.name = this.t('OtherProperties')
          } else if (node.type === 'feature') {
            const num = node.name.split(' ')[1]
            node.name = `${this.t('Feature')} ${num}`
          }
        })
      }
      walk(this.items)
    },
    closeMenu(event) {
      if (
        event.key === 'Escape' &&
        this.overlay !== null &&
        !event.defaultPrevented
      ) {
        if (this.formatOpen) {
          this.formatOpen = false
        } else {
          this.closePopup()
        }
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
        if (
          this.$mapLayers.arr.length > 0 &&
          this.menusOpen === 0 &&
          this.textBoxFocused === false
        ) {
          this.eventGFI = eventGFI
          const { event: evt, overlay } = eventGFI
          let itemsGFI = []
          let urls = {}
          this.$mapLayers.arr.toReversed().forEach((layer) => {
            if (layer.get('visible')) {
              const source = layer.getSource()
              if (source && typeof source.getFeatureInfoUrl === 'function') {
                let count = layer.get('layerGfiFeatureCount')
                if (!Number.isInteger(count)) {
                  count = 1
                }
                urls[layer.get('layerName')] = source.getFeatureInfoUrl(
                  evt.coordinate,
                  evt.map.getView().getResolution(),
                  evt.map.getView().getProjection().getCode(),
                  { INFO_FORMAT: 'application/json', FEATURE_COUNT: count },
                )
              }
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
                    const layerNode = {
                      id: index++,
                      name: name,
                      children: [],
                      isOpen: true,
                    }

                    const buildFeatureChildren = (feat) => {
                      const props = { ...feat.properties }
                      const featureChildren = []

                      if (Object.hasOwn(props, 'value')) {
                        featureChildren.push({
                          id: index++,
                          name: `${this.t('Value')}${this.t('Colon')} ${
                            props.value
                          }`,
                          type: 'value',
                        })
                        delete props.value
                      }

                      if (Object.keys(props).length > 0) {
                        featureChildren.push({
                          id: index++,
                          name: this.t('OtherProperties'),
                          children: Object.entries(props).map(
                            ([key, value], childIndex) => ({
                              id: `${index}-${childIndex}`,
                              name: `${key}: ${value}`,
                            }),
                          ),
                          type: 'other',
                        })
                      }

                      return featureChildren
                    }

                    // add source at layer level if applicable
                    if (name.includes('/')) {
                      layerNode.children.push({
                        id: index++,
                        name: `Source${this.t('Colon')} ${name.split('/')[1]}`,
                        type: 'source',
                      })
                    }

                    if (json.features.length === 1) {
                      const single = json.features[0]
                      if (single && single.properties) {
                        const children = buildFeatureChildren(single)
                        layerNode.children.push(...children)
                      }
                    } else {
                      json.features.forEach((feat, featIdx) => {
                        if (feat && feat.properties) {
                          const children = buildFeatureChildren(feat)
                          layerNode.children.push({
                            id: index++,
                            name: `${this.t('Feature')} ${featIdx + 1}`,
                            children: children,
                            isOpen: false,
                            type: 'feature',
                          })
                        }
                      })
                    }

                    if (layerNode.children.length > 0) {
                      itemsGFI.push(layerNode)
                    }
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
            await this.applyOrientation(evt)
            overlay.setPosition(evt.coordinate)
            this.setMapCoordinates(evt.coordinate)
            this.adjustPopupPosition()
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
    async applyOrientation(evt) {
      await this.$nextTick()

      const rect = this.$refs.popupGFI.getBoundingClientRect()
      let clickY = rect.top + rect.height
      if (evt && evt.map && evt.coordinate) {
        const pixel = evt.map.getPixelFromCoordinate(evt.coordinate)
        const mapRect = evt.map.getTargetElement().getBoundingClientRect()
        if (pixel) {
          clickY = mapRect.top + pixel[1]
        }
      }
      const arrowAndGap = 22
      const wouldBeTopIfNormal = clickY - rect.height - arrowAndGap
      const shouldFlip = wouldBeTopIfNormal - 50 < 0

      if (shouldFlip !== this.openDownward) {
        this.openDownward = shouldFlip
        await this.$nextTick()
      }
    },
    popupFocus() {
      this.$nextTick(async () => {
        if (this.overlay !== null) {
          if (this.eventGFI) {
            await this.applyOrientation(this.eventGFI.event)
          }
          this.adjustPopupPosition()
        }
      })
    },
    adjustPopupPosition() {
      const overlayRect = this.$refs.popupGFI.getBoundingClientRect()
      const isOffScreen =
        overlayRect.right + 64 > window.innerWidth ||
        (!this.openDownward && overlayRect.top - 50 < 0) ||
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
            bottomPixel[1] + (overlayRect.bottom + 144 - window.innerHeight),
          ])[1]
        }
        if (!this.openDownward && overlayRect.top - 50 < 0) {
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
      this.eventGFI = null
      this.formatOpen = false
      this.locked = false
      this.items = []
      this.openDownward = false
      return false
    },
  },
}
</script>

<style scoped>
.tree-container {
  border-radius: 12px;
  max-height: calc(90vh - (34px + 0.5em * 2) - 0.5em - 128px);
  max-width: 550px;
  min-width: 272px;
  overflow-y: auto;
  padding: 0;
  transition: none;
}
.gfi-header {
  align-items: center;
  display: flex;
  gap: 2px;
  padding: 6px 6px 6px 12px;
}
.gfi-coordinates {
  background: none;
  border: 0;
  border-radius: 6px;
  color: inherit;
  cursor: pointer;
  flex-grow: 1;
  font: inherit;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  padding: 4px 6px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gfi-icon-button {
  align-items: center;
  background: none;
  border: 0;
  border-radius: 50%;
  color: rgba(var(--v-theme-on-surface), 0.7);
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  height: 28px;
  justify-content: center;
  width: 28px;
}
.gfi-coordinates:hover,
.gfi-icon-button:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.08);
}
.gfi-coordinates:focus-visible,
.gfi-icon-button:focus-visible,
.gfi-copy-all:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}
.gfi-rule {
  background-color: rgba(var(--v-theme-on-surface), 0.12);
  height: 1px;
}
.gfi-format-trigger {
  align-items: center;
  background: none;
  border: 0;
  border-radius: 6px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  gap: 1px;
  height: 28px;
  letter-spacing: 0.04em;
  padding: 0 2px 0 6px;
}
.gfi-format-trigger:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.08);
}
.gfi-format-trigger:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}
.gfi-copy-all {
  align-items: center;
  background: none;
  border: 0;
  border-radius: 6px;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  display: flex;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  gap: 7px;
  margin: 5px;
  padding: 5px 9px;
}
.gfi-copy-all:hover {
  background-color: rgba(var(--v-theme-primary), 0.12);
}
.gfi-node-title {
  align-items: center;
  display: flex;
  gap: 10px;
  overflow: hidden;
}
.gfi-leaf-label {
  color: rgba(var(--v-theme-on-surface), 0.65);
  flex-shrink: 0;
}
.gfi-leaf-value {
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
}
.custom-tooltip {
  background-color: #333;
  max-width: 500px;
  opacity: 0.95;
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
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
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
  border-top-color: rgb(var(--v-theme-surface));
  border-width: 10px;
  left: 48px;
  margin-left: -10px;
}
.ol-popup:before {
  border-top-color: rgba(var(--v-theme-on-surface), 0.14);
  border-width: 11px;
  left: 48px;
  margin-left: -11px;
  margin-top: 1px;
}
.ol-popup.popup-flip {
  bottom: auto;
  top: 12px;
}
.ol-popup.popup-flip:after,
.ol-popup.popup-flip:before {
  top: auto;
  bottom: 100%;
}
.ol-popup.popup-flip:after {
  border-top-color: transparent;
  border-bottom-color: rgb(var(--v-theme-surface));
}
.ol-popup.popup-flip:before {
  border-top-color: transparent;
  border-bottom-color: rgba(var(--v-theme-on-surface), 0.14);
  margin-top: 0;
  margin-bottom: 1px;
}
#treeviewGFI {
  font-size: 12.5px;
  padding: 4px 6px;
}
#treeviewGFI :deep(.tree-node) {
  line-height: 1.4;
}
#treeviewGFI :deep(.content-wrapper) {
  max-height: 26px;
  min-height: 26px;
}
#treeviewGFI :deep(.node-content) {
  border-radius: 6px;
  padding-right: 6px;
}
#treeviewGFI :deep(.node-content:hover) {
  background-color: rgba(var(--v-theme-on-surface), 0.08);
}
#treeviewGFI :deep(.children) {
  padding-left: 16px;
}
</style>

<style>
.gfi-format-menu .v-list-item-title {
  font-size: 12.5px;
}
.gfi-format-menu .v-list-item-subtitle {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
</style>
