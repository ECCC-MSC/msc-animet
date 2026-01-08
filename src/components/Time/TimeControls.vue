<template>
  <v-card
    id="time-controls"
    :class="{
      'time-controls-collapsed': collapsedControls,
      'time-controls': !collapsedControls || screenWidth < 565,
    }"
  >
    <div
      :class="
        collapsedControls
          ? 'controller-padding-collapsed'
          : 'controller-padding'
      "
      v-show="mapTimeSettings.Step !== null"
    >
      <div v-if="mapTimeSettings.Step !== null">
        <div v-if="screenWidth >= 565">
          <v-row
            class="mr-1 ml-1 pt-2 pb-1 px-0"
            :class="collapsedControls ? 'hide-controls' : ''"
          >
            <time-slider :hide="collapsedControls" class="enable-events" />
            <interval-locale-selector class="enable-events" />
          </v-row>
          <div>
            <play-pause-controls
              v-if="collapsedControls"
              :hide="collapsedControls"
              class="collapsed-play-pause"
            ></play-pause-controls>
            <v-btn
              id="collapse-button"
              class="enable-events pa-0"
              :class="collapsedControls ? 'collapsed' : 'extended'"
              @click="store.setCollapsedControls(!collapsedControls)"
            >
              <v-icon v-if="!collapsedControls" class="icon-nudge" size="36">
                mdi-chevron-down
              </v-icon>
              <div
                v-else-if="
                  mapTimeSettings.Step === 'P1M' ||
                  mapTimeSettings.Step === 'P1Y'
                "
              >
                <span class="collapsed-date-M-Y">{{
                  this.localeDateFormat(
                    mapTimeSettings.Extent[mapTimeSettings.DateIndex],
                    mapTimeSettings.Step,
                  )
                }}</span>
              </div>
              <div v-else>
                <span class="collapsed-date">{{
                  getCollapsedDateFormat()[0]
                }}</span>
                <span class="collapsed-time">{{
                  getCollapsedDateFormat()[1]
                }}</span>
              </div>
            </v-btn>
          </div>
        </div>
        <div v-else>
          <play-pause-controls
            v-if="collapsedControls"
            :hide="collapsedControls"
            class="collapsed-play-pause-small"
          ></play-pause-controls>
          <v-col
            class="mr-1 pb-1 pt-2 pa-0"
            :class="{ 'column-padding': collapsedControls }"
          >
            <time-slider
              class="enable-events slider"
              :class="collapsedControls ? 'hide-controls' : ''"
              :hide="collapsedControls"
            />
            <interval-locale-selector
              class="enable-events"
              :class="collapsedControls ? 'hide-controls' : ''"
            />
            <v-btn
              class="enable-events pa-0"
              :class="collapsedControls ? 'collapsed' : 'extended'"
              @click="store.setCollapsedControls(!collapsedControls)"
            >
              <v-icon v-if="!collapsedControls" size="36">
                mdi-chevron-down
              </v-icon>
              <div
                v-else-if="
                  mapTimeSettings.Step === 'P1M' ||
                  mapTimeSettings.Step === 'P1Y'
                "
              >
                <span class="collapsed-date-M-Y">{{
                  this.localeDateFormat(
                    mapTimeSettings.Extent[mapTimeSettings.DateIndex],
                    mapTimeSettings.Step,
                  )
                }}</span>
              </div>
              <div v-else>
                <span class="collapsed-date">{{
                  getCollapsedDateFormat()[0]
                }}</span>
                <span class="collapsed-time">{{
                  getCollapsedDateFormat()[1]
                }}</span>
              </div>
            </v-btn>
          </v-col>
        </div>
      </div>
    </div>
    <error-manager />
  </v-card>
</template>

<script>
import { DateTime } from 'luxon'
import OLImage from 'ol/layer/Image'

import datetimeManipulations from '../../mixins/datetimeManipulations'
import WMSTileCache from '@/utils/WMSTileCache'

export default {
  inject: ['store'],
  mixins: [datetimeManipulations],
  data() {
    return {
      screenWidth: window.innerWidth,
      stopPrefetch: false,
      tileCache: new WMSTileCache(),
      currentExtent: null,
    }
  },
  mounted() {
    this.emitter.on('addTemporalLayer', this.layerTimeManager)
    this.emitter.on('clearLayerCache', this.clearLayerCache)
    this.emitter.on('fixLayerTimes', this.mapControls)
    this.emitter.on('playheadDrag', this.toggleDrag)
    this.emitter.on('timeLayerRemoved', this.removedTimeLayerManager)
    window.addEventListener('resize', this.updateScreenSize)
  },
  beforeUnmount() {
    this.emitter.off('addTemporalLayer', this.layerTimeManager)
    this.emitter.off('clearLayerCache', this.clearLayerCache)
    this.emitter.off('fixLayerTimes', this.mapControls)
    this.emitter.off('playheadDrag', this.toggleDrag)
    this.emitter.off('timeLayerRemoved', this.removedTimeLayerManager)
    window.removeEventListener('resize', this.updateScreenSize)
  },
  methods: {
    delay(time) {
      return new Promise((resolve) => setTimeout(resolve, time))
    },
    getCollapsedDateFormat() {
      return this.localeDateFormatAnimation(
        this.mapTimeSettings.Extent[this.mapTimeSettings.DateIndex],
      )
    },
    async layerTimeManager(eventData) {
      const { imageLayer, layerData, autoPlay, rangeValues } = eventData
      const referenceTime =
        layerData.Dimension.Dimension_ref_time === ''
          ? null
          : this.findFormat(layerData.Dimension.Dimension_ref_time)[0][0]
      const config = this.createTimeLayerConfig(
        layerData.Dimension.Dimension_time,
      )
      let layerDefaultTime = new Date(
        layerData.Dimension.Dimension_time_default,
      )
      let layerCurrentMR =
        referenceTime === null ? null : referenceTime[referenceTime.length - 1]

      let layerStartTime = new Date(config.layerStartTime)
      let layerEndTime = new Date(config.layerEndTime)
      if (layerData.currentMR) {
        const mrInt = parseInt(layerData.currentMR)
        if (referenceTime.some((date) => date.getTime() === mrInt)) {
          if (mrInt !== layerCurrentMR.getTime()) {
            const newModelRun = DateTime.fromMillis(mrInt, { zone: 'utc' })
            const oldModelRun = DateTime.fromJSDate(layerCurrentMR, {
              zone: 'utc',
            })

            const diff = newModelRun.diff(oldModelRun, [
              'years',
              'months',
              'days',
              'hours',
              'minutes',
              'seconds',
            ])

            const newDateArray = config.layerDateArray.map((date) =>
              DateTime.fromJSDate(date, { zone: 'utc' }).plus(diff).toJSDate(),
            )

            layerCurrentMR = newModelRun.toJSDate()

            imageLayer.getSource().updateParams({
              DIM_REFERENCE_TIME: this.getProperDateString(
                layerCurrentMR,
                config.layerDateFormat,
              ),
            })
            config.layerDateArray = newDateArray
            if (layerDefaultTime > newDateArray[newDateArray.length - 1]) {
              layerDefaultTime = newDateArray[newDateArray.length - 1]
            } else if (layerDefaultTime < newDateArray[0]) {
              layerDefaultTime = newDateArray[0]
            }
            layerStartTime = newDateArray[0]
            layerEndTime = newDateArray[newDateArray.length - 1]
          }
        }
      }
      if (config === null) {
        this.emitter.emit('notifyWrongFormat')
        this.emitter.emit('removeLayer', imageLayer)
        return
      }
      imageLayer.setProperties({
        layerDateArray: config.layerDateArray,
        layerDateFormat: config.layerDateFormat,
        layerDateIndex: 0,
        layerDefaultTime: layerDefaultTime,
        layerDimensionRefTime: layerData.Dimension.Dimension_ref_time,
        layerDimensionTime: layerData.Dimension.Dimension_time,
        layerIndexOOB: false,
        layerModelRuns: referenceTime,
        layerCurrentMR: layerCurrentMR,
        layerStartTime: layerStartTime,
        layerEndTime: layerEndTime,
        layerTimeStep: config.layerTimeStep,
        layerTrueTimeStep: config.layerTrueTimeStep,
      })
      this.store.addTimestep(imageLayer.get('layerTimeStep'))
      if (layerData.isSnapped) {
        this.changeMapTime(imageLayer.get('layerTimeStep'), imageLayer)
      } else if (this.mapTimeSettings.Step === null) {
        this.changeMapTime(imageLayer.get('layerTimeStep'))
        this.store.setDatetimeRangeSlider([
          0,
          this.mapTimeSettings.Extent.length - 1,
        ])
      } else {
        const layerDateIndex = this.findLayerIndex(
          this.mapTimeSettings.Extent[this.mapTimeSettings.DateIndex],
          imageLayer.get('layerDateArray'),
          imageLayer.get('layerTimeStep'),
        )
        imageLayer.setProperties({
          layerDateIndex: layerDateIndex,
        })
        if (this.mapTimeSettings.Step === imageLayer.get('layerTimeStep')) {
          this.changeMapTime(imageLayer.get('layerTimeStep'))
        } else if (layerDateIndex < 0) {
          imageLayer.setVisible(false)
        }
      }
      const layerDateIndex = imageLayer.get('layerDateIndex')
      if (layerDateIndex < 0) {
        this.setDateTime(imageLayer, imageLayer.get('layerDefaultTime'))
      } else {
        this.setDateTime(
          imageLayer,
          imageLayer.get('layerDateArray')[imageLayer.get('layerDateIndex')],
        )
      }

      this.emitter.emit('timeLayerAdded', imageLayer.get('layerName'))
      this.$mapCanvas.mapObj.addLayer(imageLayer)

      imageLayer
        .getSource()
        .setImageLoadFunction(
          this.createImageLoaderWithCache(
            this.tileCache,
            imageLayer.get('layerName'),
          ),
        )

      if (autoPlay || rangeValues) {
        await new Promise((resolve) =>
          this.$mapCanvas.mapObj.once('rendercomplete', resolve),
        )
        if (autoPlay) {
          this.emitter.emit('toggleAnimation')
          this.store.setCollapsedControls(true)
        }
        if (rangeValues) {
          let [range, current, last, step] = rangeValues
          if (this.uniqueTimestepsList.includes(step)) {
            this.changeMapTime(step)
            const extentLength = this.mapTimeSettings.Extent.length - 1
            if (last === 'l' || last > extentLength) {
              last = extentLength
            }
            let first = last - range
            if (first < 0) {
              first = 0
              last = range
              if (last > extentLength) {
                last = extentLength
              }
            }
            this.$nextTick(() => {
              this.store.setDatetimeRangeSlider([first, last])
              this.emitter.emit('updatePermalink')
            })
            if (current === 'l' || current > extentLength) {
              current = extentLength
            } else if (current < first) {
              current = first
            }
            this.store.setMapTimeIndex(current)
          }
        }
      }
    },
    async mapControls() {
      // Prevents a bug that triggers play twice
      const playStateBuffer = this.playState
      this.$nextTick(() => {
        this.togglePrefetch()
      })

      let numLayers = this.$mapLayers.arr.length

      let mapTime
      if (this.mapTimeSettings.Extent !== null) {
        mapTime = this.mapTimeSettings.Extent[this.mapTimeSettings.DateIndex]
      } else {
        numLayers = 0
      }

      let noChange = true
      for (let i = 0; i < numLayers; i++) {
        const layer = this.$mapLayers.arr[i]
        if (layer.get('layerVisibilityOn') && layer.get('layerIsTemporal')) {
          const dateArray = layer.get('layerDateArray')
          const layerDateIndex = this.findLayerIndex(
            mapTime,
            dateArray,
            layer.get('layerTimeStep'),
          )
          layer.setProperties({
            layerDateIndex: layerDateIndex,
          })
          const isVisible = layer.get('visible')
          if (layerDateIndex >= 0) {
            this.setDateTime(layer, dateArray[layerDateIndex])
            noChange = false
            if (!isVisible) {
              const originalOpacity = layer.getOpacity()
              const source = layer.getSource()

              let restored = false
              const restoreOpacity = () => {
                if (!restored) {
                  restored = true
                  layer.setOpacity(originalOpacity)
                  source.un('imageloadend', restoreOpacity)
                  source.un('imageloaderror', restoreOpacity)
                }
              }

              source.once('imageloadend', restoreOpacity)
              source.once('imageloaderror', restoreOpacity)
              layer.setOpacity(0)
              layer.setVisible(true)
            }
          } else if (isVisible) {
            layer.setVisible(false)
          }
        }
      }
      if (noChange) {
        await this.delay(100)
        this.$mapCanvas.mapObj.updateSize()
        if (this.isAnimating && playStateBuffer !== 'play') {
          // Trigger manually because animation creation waits for
          // render events, but noChange means no layers are shown
          // so nothing ever changes or renders.
          this.emitter.emit('noChange')
        }
        return
      }
    },
    onExtentChanged(newExtent, newStep, oldExtent, oldStep, layerDiff = 0) {
      if (this.mapTimeSettings.SnappedLayer !== null && newStep !== oldStep) {
        return
      } else if (newStep !== oldStep) {
        this.store.setDatetimeRangeSlider([0, newExtent.length - 1])
      } else {
        if (this.mapTimeSettings.SnappedLayer === null) {
          let first
          let last
          if (this.datetimeRangeSlider[0] === 0) {
            first = 0
          }
          if (this.datetimeRangeSlider[1] === oldExtent.length - 1) {
            last = newExtent.length - 1
          }
          if (first === undefined && last === undefined) {
            const firstDate = oldExtent[this.datetimeRangeSlider[0]]
            first = this.findLayerIndex(firstDate, newExtent, newStep)
            first = first >= 0 ? first : 0

            const lastDate = oldExtent[this.datetimeRangeSlider[1]]
            last = this.findLayerIndex(lastDate, newExtent, newStep)
            last = last >= 0 ? last : newExtent.length - 1
          } else if (first === undefined) {
            if (layerDiff !== 0) {
              first = this.findLayerIndex(
                oldExtent[this.datetimeRangeSlider[0]],
                newExtent,
                newStep,
              )
            } else {
              first =
                last -
                (this.datetimeRangeSlider[1] - this.datetimeRangeSlider[0])
            }
            if (first < 0 || first > newExtent.length - 1 || first > last) {
              first = 0
            }
          } else if (last === undefined) {
            if (layerDiff !== 0) {
              last = this.findLayerIndex(
                oldExtent[this.datetimeRangeSlider[1]],
                newExtent,
                newStep,
              )
            } else {
              last =
                this.datetimeRangeSlider[1] -
                this.datetimeRangeSlider[0] +
                first
            }
            if (last < 0 || last > newExtent.length - 1 || first > last) {
              last = newExtent.length - 1
            }
          }
          if (this.mapTimeSettings.DateIndex < first) {
            this.store.setMapTimeIndex(first)
          } else if (this.mapTimeSettings.DateIndex > last) {
            this.store.setMapTimeIndex(last)
          }
          this.store.setDatetimeRangeSlider([first, last])
        } else {
          this.onSnappedLayerChanged(this.mapTimeSettings.SnappedLayer)
        }
      }
      this.emitter.emit('updatePermalink')
    },
    onSnappedLayerChanged(newSnappedLayerName) {
      const newSnappedLayer = this.$mapLayers.arr.find(
        (l) => l.get('layerName') === newSnappedLayerName,
      )
      const first = this.findLayerIndex(
        newSnappedLayer.get('layerStartTime'),
        this.mapTimeSettings.Extent,
        newSnappedLayer.get('layerTimeStep'),
      )
      const last = this.findLayerIndex(
        newSnappedLayer.get('layerEndTime'),
        this.mapTimeSettings.Extent,
        newSnappedLayer.get('layerTimeStep'),
      )
      if (this.mapTimeSettings.DateIndex < first) {
        this.store.setMapTimeIndex(first)
      } else if (this.mapTimeSettings.DateIndex > last) {
        this.store.setMapTimeIndex(last)
      }
      this.store.setDatetimeRangeSlider([first, last])
      this.emitter.emit('updatePermalink')
    },
    removedTimeLayerManager(imageLayer) {
      const timestep = imageLayer.get('layerTimeStep')
      this.store.removeTimestep(timestep)
      if (this.mapTimeSettings.Step === timestep) {
        if (
          this.$mapLayers.arr.filter(
            (layerObject) => layerObject.get('layerTimeStep') === timestep,
          ).length !== 0
        ) {
          this.changeMapTime(timestep)
        } else {
          const firstTimeLayerFound = this.$mapLayers.arr.find((otherLayer) =>
            otherLayer.get('layerIsTemporal'),
          )
          if (firstTimeLayerFound === undefined) {
            const mapTimeSettings = {
              SnappedLayer: null,
              Step: null,
              DateIndex: null,
              Extent: null,
            }
            this.store.setMapTimeSettings(mapTimeSettings)
          } else {
            this.changeMapTime(firstTimeLayerFound.get('layerTimeStep'))
          }
        }
      }
    },
    async setDateTime(layer, date) {
      if (layer.get('layerIsRefTimeOnly')) {
        layer.getSource().updateParams({
          DIM_REFERENCE_TIME: this.getProperDateString(
            date,
            layer.get('layerDateFormat'),
          ),
        })
      } else {
        layer.getSource().updateParams({
          TIME: this.getProperDateString(date, layer.get('layerDateFormat')),
        })
      }
    },
    toggleDrag() {
      this.stopPrefetch = !this.stopPrefetch
      if (!this.stopPrefetch) {
        this.togglePrefetch()
      }
    },
    togglePrefetch() {
      if (!this.stopPrefetch) {
        this.$mapLayers.arr.forEach((layer) => {
          if (
            layer instanceof OLImage &&
            layer.get('layerVisibilityOn') &&
            layer.get('layerIsTemporal')
          ) {
            const view = this.$mapCanvas.mapObj.getView()
            const calculatedExtent = view.calculateExtent()
            const extentKey = calculatedExtent.join(',')

            if (this.currentExtent !== extentKey) {
              this.tileCache.clear()
              this.currentExtent = extentKey
            }

            const dateArray = layer.get('layerDateArray')
            const globalCurrentIndex = this.mapTimeSettings.DateIndex
            const globalStartIndex = this.datetimeRangeSlider[0]
            const globalEndIndex = this.datetimeRangeSlider[1]

            // Build URL params
            const extent = view
              .calculateExtent()
              .map((coord) => Math.round(coord * 1e6) / 1e6)
            const [width, height] = this.$mapCanvas.mapObj.getSize()
            const currentStyle = layer.get('layerCurrentStyle')

            // Destructured like this to keep exact parameter order for caching
            let urlParams = {
              REQUEST: 'GetMap',
              SERVICE: 'WMS',
              VERSION: '1.3.0',
              FORMAT: 'image/png',
            }
            if (currentStyle !== null) {
              urlParams.STYLES = currentStyle
            }
            urlParams.TRANSPARENT = 'true'
            urlParams.LAYERS = layer.get('layerName').split('/')[0]
            if (!layer.get('layerIsRefTimeOnly')) {
              urlParams.TIME = ''
            }
            if (
              layer.getSource().getParams().DIM_REFERENCE_TIME !== undefined
            ) {
              if (layer.get('layerIsRefTimeOnly')) {
                urlParams.DIM_REFERENCE_TIME = ''
              } else {
                urlParams.DIM_REFERENCE_TIME = this.getProperDateString(
                  layer.get('layerCurrentMR'),
                  layer.get('layerDateFormat'),
                )
              }
            }
            urlParams.WIDTH = width
            urlParams.HEIGHT = height
            urlParams.CRS = view.getProjection().getCode()
            urlParams.BBOX = extent.join(',')

            const indicesToCache = []
            if (this.playState === 'play') {
              if (!this.playbackReversed) {
                for (let i = 1; i <= 5; i++) {
                  let globalTargetIndex = globalCurrentIndex + i
                  if (globalTargetIndex > globalEndIndex) {
                    globalTargetIndex =
                      globalStartIndex +
                      (globalTargetIndex - globalEndIndex - 1)
                  }

                  const globalTime =
                    this.mapTimeSettings.Extent[globalTargetIndex]
                  const layerTargetIndex = this.findLayerIndex(
                    globalTime,
                    dateArray,
                    layer.get('layerTimeStep'),
                  )

                  if (layerTargetIndex >= 0) {
                    indicesToCache.push(layerTargetIndex)
                  }
                }
              } else {
                for (let i = 1; i <= 5; i++) {
                  let globalTargetIndex = globalCurrentIndex - i
                  if (globalTargetIndex < globalStartIndex) {
                    globalTargetIndex =
                      globalEndIndex -
                      (globalStartIndex - globalTargetIndex - 1)
                  }

                  const globalTime =
                    this.mapTimeSettings.Extent[globalTargetIndex]
                  const layerTargetIndex = this.findLayerIndex(
                    globalTime,
                    dateArray,
                    layer.get('layerTimeStep'),
                  )

                  if (layerTargetIndex >= 0) {
                    indicesToCache.push(layerTargetIndex)
                  }
                }
              }
            } else {
              // Cache both directions when paused
              for (let i = 1; i <= 5; i++) {
                // Forward
                let globalTargetIndex = globalCurrentIndex + i
                if (globalTargetIndex > globalEndIndex) {
                  globalTargetIndex =
                    globalStartIndex + (globalTargetIndex - globalEndIndex - 1)
                }

                const globalTime =
                  this.mapTimeSettings.Extent[globalTargetIndex]
                const layerTargetIndex = this.findLayerIndex(
                  globalTime,
                  dateArray,
                  layer.get('layerTimeStep'),
                )

                if (layerTargetIndex >= 0) {
                  indicesToCache.push(layerTargetIndex)
                }

                // Backward
                globalTargetIndex = globalCurrentIndex - i
                if (globalTargetIndex < globalStartIndex) {
                  globalTargetIndex =
                    globalEndIndex - (globalStartIndex - globalTargetIndex - 1)
                }

                const globalTimeBackward =
                  this.mapTimeSettings.Extent[globalTargetIndex]
                const layerTargetIndexBackward = this.findLayerIndex(
                  globalTimeBackward,
                  dateArray,
                  layer.get('layerTimeStep'),
                )

                if (layerTargetIndexBackward >= 0) {
                  indicesToCache.push(layerTargetIndexBackward)
                }
              }
            }
            indicesToCache.forEach((targetIndex, i) => {
              this.cacheTimestep(
                layer,
                dateArray[targetIndex],
                urlParams,
                targetIndex,
              )
            })
          }
        })
      }
    },
    async cacheTimestep(layer, date, urlParams) {
      const layerName = layer.get('layerName')

      if (layer.get('layerIsRefTimeOnly')) {
        urlParams['DIM_REFERENCE_TIME'] = this.getProperDateString(
          date,
          layer.get('layerDateFormat'),
        )
      } else {
        urlParams['TIME'] = this.getProperDateString(
          date,
          layer.get('layerDateFormat'),
        )
      }

      const queryString = Object.keys(urlParams)
        .map(
          (key) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(urlParams[key])}`,
        )
        .join('&')

      const wmsUrl = `${layer.getSource().getUrl()}?${queryString}`

      await this.tileCache.preload(layerName, wmsUrl)
    },
    createImageLoaderWithCache(tileCache, layerName) {
      return function (image, src) {
        const normalizedSrc = src.replace(/BBOX=([^&]+)/g, (_, bbox) => {
          const decoded = decodeURIComponent(bbox)
          const coords = decoded.split(',').map((coord) => {
            const num = parseFloat(coord)
            return Math.round(num * 1e6) / 1e6
          })
          return `BBOX=${encodeURIComponent(coords.join(','))}`
        })
        const imageElement = image.getImage()
        const cachedBlob = tileCache.get(layerName, normalizedSrc)
        if (cachedBlob) {
          const objectUrl = URL.createObjectURL(cachedBlob)
          imageElement.src = objectUrl
          imageElement.onload = function () {
            URL.revokeObjectURL(objectUrl)
          }
        } else if (tileCache.has(layerName, normalizedSrc)) {
          const pendingRequest = tileCache.pendingRequests.get(normalizedSrc)

          if (pendingRequest && pendingRequest.promise) {
            pendingRequest.promise
              .then(() => {
                const blob = tileCache.get(layerName, normalizedSrc)
                if (blob) {
                  const objectUrl = URL.createObjectURL(blob)
                  imageElement.src = objectUrl
                  imageElement.onload = function () {
                    URL.revokeObjectURL(objectUrl)
                  }
                } else {
                  imageElement.src = src
                }
              })
              .catch(() => {
                imageElement.src = src
              })
          } else {
            imageElement.src = src
          }
        } else {
          imageElement.src = src
        }
      }
    },
    clearLayerCache(layerInfo) {
      const { layerName, date, isRefTimeOnly } = layerInfo
      if (layerName === undefined) {
        this.tileCache.clear()
      } else if (date) {
        this.tileCache.deleteTile(layerName, date, isRefTimeOnly)
      } else {
        this.tileCache.clearLayer(layerName)
      }
    },
    updateScreenSize() {
      this.screenWidth = window.innerWidth
    },
  },
  watch: {
    dateIndex: {
      deep: true,
      handler([newIndex, _]) {
        if (newIndex !== null) {
          this.mapControls()
        }
        this.emitter.emit('updatePermalink')
      },
    },
    extent: {
      deep: true,
      handler(
        [newExtent, newStep, newNumLayers],
        [oldExtent, oldStep, oldNumLayers],
      ) {
        if (oldExtent !== null && newExtent !== null) {
          if (
            newExtent[0].getTime() !== oldExtent[0].getTime() ||
            newExtent[newExtent.length - 1].getTime() !==
              oldExtent[oldExtent.length - 1].getTime()
          ) {
            this.onExtentChanged(
              newExtent,
              newStep,
              oldExtent,
              oldStep,
              newNumLayers - oldNumLayers,
            )
          } else if (this.mapTimeSettings.SnappedLayer !== null) {
            this.onSnappedLayerChanged(this.mapTimeSettings.SnappedLayer)
          } else if (newExtent.length !== oldExtent.length) {
            let first = this.findLayerIndex(
              oldExtent[this.datetimeRangeSlider[0]],
              newExtent,
              newStep,
            )
            let last = this.findLayerIndex(
              oldExtent[this.datetimeRangeSlider[1]],
              newExtent,
              newStep,
            )
            if (first < 0 || first === newExtent.length - 1) {
              first = 0
            }
            if (last <= 0) {
              last = newExtent.length - 1
            }
            this.store.setDatetimeRangeSlider([first, last])
            this.emitter.emit('updatePermalink')
          }
        }
      },
    },
    layerList(newLength, oldLength) {
      if (newLength !== oldLength && newLength === 0) {
        this.store.setDatetimeRangeSlider([null, null])
      }
      this.emitter.emit('updatePermalink')
    },
    snappedLayer(newSnap, oldSnap) {
      if (newSnap !== null && newSnap !== oldSnap) {
        this.onSnappedLayerChanged(newSnap)
      }
    },
  },
  computed: {
    collapsedControls() {
      return this.store.getCollapsedControls
    },
    datetimeRangeSlider() {
      return this.store.getDatetimeRangeSlider
    },
    isAnimating() {
      return this.store.getIsAnimating
    },
    mapTimeSettings() {
      return this.store.getMapTimeSettings
    },
    playbackReversed() {
      return this.store.getIsReversed
    },
    playState() {
      return this.store.getPlayState
    },
    uniqueTimestepsList() {
      return this.store.getUniqueTimestepsList
    },
    dateIndex() {
      return [this.mapTimeSettings.DateIndex, this.mapTimeSettings.Extent]
    },
    extent() {
      return [
        this.mapTimeSettings.Extent,
        this.mapTimeSettings.Step,
        this.$mapLayers.arr.length,
      ]
    },
    layerList() {
      return this.$mapLayers.arr.length
    },
    snappedLayer() {
      return this.mapTimeSettings.SnappedLayer
    },
  },
}
</script>

<style scoped>
.collapsed {
  border-radius: 4px 4px 0 0;
  box-shadow: none;
  height: 50px !important;
  margin-top: 6px;
  min-width: 285px !important;
  pointer-events: auto;
  transform: translateY(2px);
  width: 30%;
}
.collapsed::before {
  min-width: 250px;
}
.collapsed-play-pause {
  display: flex;
  position: relative;
  min-width: 285px !important;
  width: 30%;
  margin-left: auto;
  margin-right: auto;
  z-index: 2;
  transform: translate(5px, 51px);
}
.collapsed-play-pause-small {
  bottom: 4px;
  position: absolute;
  z-index: 2;
}
.collapsed-date {
  display: block;
  font-size: 16px;
  text-transform: none !important;
  white-space: nowrap !important;
}
.collapsed-time {
  display: block;
  font-size: 24px;
  text-transform: none !important;
  white-space: nowrap !important;
}
.collapsed-date-M-Y {
  display: block;
  font-size: 26px;
  text-transform: none !important;
  white-space: nowrap !important;
}
.column-padding {
  padding-top: 0 !important;
}
.controller-padding {
  margin-bottom: -16px;
  pointer-events: none;
}
.controller-padding-collapsed {
  pointer-events: none;
}
.enable-events {
  pointer-events: auto;
}
.extended {
  background-color: transparent !important;
  border-radius: 0 0 20px 20px;
  box-shadow: none;
  height: 26px !important;
  margin-top: 6px;
  transform: translateY(-10px);
  width: 100%;
}
.hide-controls {
  display: none;
}
.icon-nudge {
  transform: translateY(-8px);
}
.slider {
  padding-bottom: 0;
  padding-top: 2px;
}
#collapse-button {
  font-size: 0.75rem;
}
#time-controls {
  border-radius: 20px;
  bottom: 24px;
  left: 50%;
  max-width: 1200px;
  position: absolute;
  text-align: center;
  transform: translateX(-50%);
  transition: none;
  width: 75%;
  z-index: 2;
}
@media (max-width: 1120px) {
  .time-controls {
    border-radius: 0 !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    transform: none !important;
    width: 100% !important;
  }
}
@media (min-width: 565px) {
  .time-controls-collapsed {
    background-color: transparent;
    box-shadow: none !important;
    padding-top: 0;
    pointer-events: none !important;
    bottom: 0 !important;
  }
}
@media (max-width: 565px) {
  .collapsed {
    border-radius: 0;
    margin-left: 0;
    margin-top: -8px;
    padding-top: 0 !important;
    transform: translateY(8px);
    width: 100%;
  }
  .controller-padding {
    pointer-events: auto;
  }
  #time-controls {
    padding-top: 0;
  }
}
</style>
