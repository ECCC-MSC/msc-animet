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
import datetimeManipulations from '../../mixins/datetimeManipulations'

export default {
  inject: ['store'],
  mixins: [datetimeManipulations],
  data() {
    return {
      screenWidth: window.innerWidth,
    }
  },
  mounted() {
    this.emitter.on('addTemporalLayer', this.layerTimeManager)
    this.emitter.on('fixLayerTimes', this.mapControls)
    this.emitter.on('timeLayerRemoved', this.removedTimeLayerManager)
    window.addEventListener('resize', this.updateScreenSize)
  },
  beforeUnmount() {
    this.emitter.off('addTemporalLayer', this.layerTimeManager)
    this.emitter.off('fixLayerTimes', this.mapControls)
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
    layerTimeManager(eventData) {
      const { imageLayer, layerData } = eventData
      const referenceTime =
        layerData.Dimension.Dimension_ref_time === ''
          ? null
          : this.findFormat(layerData.Dimension.Dimension_ref_time)[0][0]
      const configs = this.createTimeLayerConfigs(
        layerData.Dimension.Dimension_time,
      )
      if (configs === null) {
        this.emitter.emit('notifyWrongFormat')
        this.emitter.emit('removeLayer', imageLayer)
        return
      }
      imageLayer.setProperties({
        layerActiveConfig: 0,
        layerConfigs: configs,
        layerDateArray: configs[0].layerDateArray,
        layerDateFormat: configs[0].layerDateFormat,
        layerDateIndex: 0,
        layerDefaultTime: new Date(layerData.Dimension.Dimension_time_default),
        layerDimensionRefTime: layerData.Dimension.Dimension_ref_time,
        layerDimensionTime: layerData.Dimension.Dimension_time,
        layerIndexOOB: false,
        layerModelRuns: referenceTime,
        layerCurrentMR:
          referenceTime === null
            ? null
            : referenceTime[referenceTime.length - 1],
        layerStartTime: new Date(configs[0].layerStartTime),
        layerEndTime: new Date(configs[0].layerEndTime),
        layerTimeStep: configs[0].layerTimeStep,
        layerTrueTimeStep: configs[0].layerTrueTimeStep,
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
      this.setDateTime(
        imageLayer,
        this.mapTimeSettings.Extent[this.mapTimeSettings.DateIndex],
      )
      this.emitter.emit('timeLayerAdded', imageLayer.get('layerName'))
      this.$mapCanvas.mapObj.addLayer(imageLayer)
    },
    async mapControls() {
      // Prevents a bug that triggers play twice
      const playStateBuffer = this.playState

      const mapTime =
        this.mapTimeSettings.Extent[this.mapTimeSettings.DateIndex]

      const numLayers = this.$mapLayers.arr.length
      let noChange = true
      for (let i = 0; i < numLayers; i++) {
        if (
          this.$mapLayers.arr[i].get('layerVisibilityOn') &&
          this.$mapLayers.arr[i].get('layerIsTemporal')
        ) {
          const dateArray = this.$mapLayers.arr[i].get('layerDateArray')
          const layerDateIndex = this.findLayerIndex(
            mapTime,
            dateArray,
            this.$mapLayers.arr[i].get('layerTimeStep'),
          )
          this.$mapLayers.arr[i].setProperties({
            layerDateIndex: layerDateIndex,
          })
          if (layerDateIndex >= 0) {
            this.setDateTime(this.$mapLayers.arr[i], dateArray[layerDateIndex])
            noChange = false
            if (!this.$mapLayers.arr[i].get('visible')) {
              this.$mapLayers.arr[i].setVisible(true)
            }
          } else {
            this.$mapLayers.arr[i].setVisible(false)
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
        this.emitter.emit('updatePermalink')
      }
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
      layer.getSource().updateParams({
        TIME: this.getProperDateString(date, layer.get('layerDateFormat')),
      })
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
    isLooping() {
      return this.store.getIsLooping
    },
    mapTimeSettings() {
      return this.store.getMapTimeSettings
    },
    playState() {
      return this.store.getPlayState
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
