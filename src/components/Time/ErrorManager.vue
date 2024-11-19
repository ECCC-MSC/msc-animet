<template>
  <div id="time-snackbar">
    <v-snackbar
      class="snackbar"
      location="top"
      v-model="notifyExtentRebuilt"
      :timeout="timeoutDuration"
    >
      {{ expiredSnackBarMessage }}
      <template v-slot:actions>
        <v-btn
          color="warning"
          variant="text"
          @click="notifyExtentRebuilt = false"
        >
          {{ $t('Close') }}
        </v-btn>
      </template>
    </v-snackbar>

    <v-snackbar
      class="snackbar"
      timeout="-1"
      location="top"
      v-model="notifyCancelAnimateResize"
    >
      {{ $t('MP4CreateNotifyCancelAnimation') }}
      <template v-slot:actions>
        <v-btn
          color="warning"
          variant="text"
          @click="notifyCancelAnimateResize = false"
        >
          {{ $t('Close') }}
        </v-btn>
      </template>
    </v-snackbar>

    <v-snackbar
      class="snackbar"
      timeout="-1"
      location="top"
      v-model="notifyWrongFormat"
    >
      <span class="snackMessage">{{ $t('WrongTimeFormat') }}</span>

      <template v-slot:actions>
        <v-btn
          color="warning"
          variant="text"
          @click="notifyWrongFormat = false"
        >
          {{ $t('Close') }}
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script>
import axios from '../../utils/AxiosConfig.js'
import { useI18n } from 'vue-i18n'

import datetimeManipulations from '../../mixins/datetimeManipulations'

export default {
  inject: ['store'],
  mixins: [datetimeManipulations],
  mounted() {
    this.emitter.on('cancelAnimationResize', () => {
      this.notifyCancelAnimateResize = true
    })
    this.emitter.on('loadingError', this.errorDispatcher)
    this.emitter.on('notifyWrongFormat', () => {
      this.notifyWrongFormat = true
    })
    this.emitter.on('refreshExpired', this.autoRefreshHandler)
  },
  beforeUnmount() {
    this.emitter.off('loadingError', this.errorDispatcher)
    this.emitter.off('refreshExpired', this.autoRefreshHandler)
  },
  data() {
    return {
      blockRefreshAnimation: false,
      blockRefreshError: false,
      errorLayersList: [],
      expiredSnackBarMessage: '',
      expiredTimestepList: [],
      notifyCancelAnimateResize: false,
      notifyExtentRebuilt: false,
      notifyWrongFormat: false,
      t: useI18n().t,
      timeoutDuration: 6000,
      timeoutHandles: {},
    }
  },
  methods: {
    async autoRefreshHandler(layerList) {
      if (
        this.isAnimating &&
        !(this.datetimeRangeSlider[0] === this.datetimeRangeSlider[1])
      ) {
        await new Promise((resolve) =>
          this.$mapCanvas.mapObj.once('rendercomplete', resolve),
        )
      }
      if (!this.blockRefreshError && !this.blockRefreshAnimation) {
        layerList.forEach((imageLayer) => {
          this.errorLayersList.push(imageLayer.get('layerName'))
        })
        this.store.setPendingErrorResolution(true)
        layerList.forEach((imageLayer) => {
          this.updateTimeInformation(imageLayer)
        })
      }
    },
    clearAllTimeouts() {
      for (var layerName in this.timeoutHandles) {
        clearTimeout(this.timeoutHandles[layerName]['timeoutId'])
        const params = this.timeoutHandles[layerName]['params']
        delete this.timeoutHandles[layerName]
        this.errorDispatcher({ layer: params[0], error: params[1] })
        this.errorLayersList.splice(
          this.errorLayersList.indexOf(layerName.split('_copy')[0]),
          1,
        )
      }
    },
    async fixTimeExtent() {
      if (this.expiredTimestepList.length !== 0) {
        let noChangeFlag = true
        if (this.expiredTimestepList.includes(this.mapTimeSettings.Step)) {
          noChangeFlag = false
        }
        this.expiredTimestepList = []
        if (noChangeFlag) {
          if (this.isAnimating && this.playState !== 'play') {
            this.emitter.emit('redoAnimation')
            this.emitter.emit('animationCanvasReset')
          } else {
            this.emitter.emit('fixLayerTimes')
          }
        } else {
          if (this.mapTimeSettings.SnappedLayer !== null) {
            this.changeMapTime(
              this.mapTimeSettings.Step,
              this.$mapLayers.arr.find(
                (sl) =>
                  sl.get('layerName') === this.mapTimeSettings.SnappedLayer,
              ),
            )
            if (this.isAnimating && this.playState !== 'play') {
              this.emitter.emit('redoAnimation')
            }
          } else {
            const currentHighBoundDate =
              this.mapTimeSettings.Extent[this.datetimeRangeSlider[1]]
            this.changeMapTime(this.mapTimeSettings.Step)
            if (this.mapTimeSettings.Extent[0] >= currentHighBoundDate) {
              if (this.isAnimating && this.playState !== 'play') {
                // Cancel animation
                this.expiredSnackBarMessage = this.t('ExtentFullyOOB')
                this.timeoutDuration = 8000
                this.emitter.emit('restoreState')
              }
            } else {
              if (this.isAnimating && this.playState !== 'play') {
                this.emitter.emit('redoAnimation')
              }
            }
          }
        }
      }
      this.notifyExtentRebuilt = true
      this.store.setPendingErrorResolution(false)
      this.blockRefreshError = false
      if (this.playState === 'play') {
        this.emitter.emit('playAnimation')
      }
    },
    async errorDispatcher(errorInfo) {
      const { layer, error: e } = errorInfo
      this.blockRefreshError = true
      try {
        this.store.setPendingErrorResolution(true)
        this.errorLayersList.push(layer.get('layerName'))
        const response = await axios.get(e.image.image_.currentSrc)
        const xmlDoc = new DOMParser().parseFromString(
          response.data,
          'text/xml',
        )
        const serviceException =
          xmlDoc.getElementsByTagName('ogc:ServiceException')[0] ||
          xmlDoc.getElementsByTagName('ServiceException')[0]
        // An error like 500 will trigger the catch.
        // "undefined" means there's actually no error.
        // Call refresh just to update the values and continue.
        if (serviceException === undefined) {
          this.expiredSnackBarMessage = this.t('ServiceRestored')
          this.timeoutDuration = 3000
          this.errorLayersList.splice(
            this.errorLayersList.indexOf(layer.get('layerName')),
            1,
          )
          return
        }
        const attrs = serviceException.attributes
        if (
          'code' in attrs &&
          attrs['code'].nodeValue === 'NoMatch' &&
          attrs['locator'].nodeValue === 'time'
        ) {
          this.updateTimeInformation(layer, e)
        } else if (
          serviceException.textContent.includes('Unable to access file')
        ) {
          if (layer.get('layerIsTemporal')) {
            this.expiredTimestepList.push(layer.get('layerTimeStep'))
            let newExtent = [...layer.get('layerDateArray')]
            const missingTimestep = newExtent[layer.get('layerDateIndex')]
            newExtent.splice(layer.get('layerDateIndex'), 1)
            if (newExtent.length === 0) {
              throw new Error("All of the layer's timesteps are broken")
            }
            let newDefaultTimeIndex = this.findLayerIndex(
              layer.get('layerDefaultTime'),
              newExtent,
              layer.get('layerTimeStep'),
            )
            layer.setProperties({
              layerDateArray: newExtent,
              layerDateIndex: this.findLayerIndex(
                this.mapTimeSettings.Extent[this.mapTimeSettings.DateIndex],
                newExtent,
                layer.get('layerTimeStep'),
              ),
              layerDefaultTime:
                newDefaultTimeIndex > 0
                  ? newExtent[newDefaultTimeIndex]
                  : newExtent[0],
              layerStartTime: newExtent[0],
              layerEndTime: newExtent[newExtent.length - 1],
            })
            this.expiredSnackBarMessage = this.t('MissingTimesteps', {
              TIMESTEP: this.localeDateFormat(
                missingTimestep,
                layer.get('layerTimeStep'),
              ),
              LAYER: layer.get('layerName'),
            })
            this.timeoutDuration = 8000
            this.errorLayersList.splice(
              this.errorLayersList.indexOf(layer.get('layerName')),
              1,
            )
          } else {
            setTimeout(() => {
              this.errorDispatcher({ layer: layer, error: e })
              this.errorLayersList.splice(
                this.errorLayersList.indexOf(layer.get('layerName')),
                1,
              )
            }, 4000)
            this.timeoutDuration = 4000
            this.expiredSnackBarMessage = this.t('LoopRetry', {
              SECONDS: this.timeoutDuration / 1000,
            })
            this.notifyExtentRebuilt = true
          }
        } else if (
          'code' in attrs &&
          attrs['code'].nodeValue === 'StyleNotDefined'
        ) {
          layer.getSource().updateParams({ STYLES: null })
          this.expiredSnackBarMessage = this.t('StyleError')
          this.timeoutDuration = 8000
          this.errorLayersList.splice(
            this.errorLayersList.indexOf(layer.get('layerName')),
            1,
          )
        } else {
          this.emitter.emit('removeLayer', layer)
          this.expiredSnackBarMessage = this.t('UnhandledError')
          console.error('Unhandled error case: ', response)
          this.timeoutDuration = 12000
          this.errorLayersList.splice(
            this.errorLayersList.indexOf(layer.get('layerName')),
            1,
          )
        }
      } catch (error) {
        let name = layer.get('layerName')
        const timeoutId = setTimeout(() => {
          clearTimeout(this.timeoutHandles[name]['timeoutId'])
          delete this.timeoutHandles[name]
          if (
            this.$mapLayers.arr.includes(
              (l) => l.get('layerName') === layer.get('layerName'),
            )
          ) {
            this.errorDispatcher({ layer: layer, error: e })
          }
          this.errorLayersList.splice(
            this.errorLayersList.indexOf(name.split('_copy')[0]),
            1,
          )
        }, 20000)
        while (name in this.timeoutHandles) {
          name = `${name}_copy`
        }
        this.timeoutHandles[name] = {
          timeoutId: timeoutId,
          params: [layer, e],
        }
        this.timeoutDuration = 20000
        this.expiredSnackBarMessage = this.t('LoopRetry', {
          SECONDS: this.timeoutDuration / 1000,
        })
        this.notifyExtentRebuilt = true
      }
    },
    async updateTimeInformation(layer, originalError = null) {
      let layerData = null
      try {
        const api = axios.create({
          baseURL: layer.get('source')['url_'],
          params: {
            SERVICE: 'WMS',
            VERSION: '1.3.0',
            REQUEST: 'GetCapabilities',
            LAYERS: layer.get('layerName'),
            t: new Date().getTime(),
          },
        })
        await api.get().then((response) => {
          const xmlDoc = new DOMParser().parseFromString(
            response.data,
            'text/xml',
          )
          const layerName = layer.get('layerXmlName')
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
          }
        })
        this.expiredTimestepList.push(layer.get('layerTimeStep'))
        const currentMR = layer.get('layerCurrentMR')
        let newMRs =
          layerData.Dimension.Dimension_ref_time === ''
            ? null
            : this.findFormat(layerData.Dimension.Dimension_ref_time)[0][0]
        let sameMR = true
        // Check if the model run was the problem and not the timestep
        if (currentMR !== null) {
          sameMR = false
          for (let i = 0; i < newMRs.length; i++) {
            if (newMRs[i].getTime() === currentMR.getTime()) {
              sameMR = true
              break
            }
          }
        }
        const layerActiveConfig = layer.get('layerActiveConfig')
        let configs
        if (
          layer.getSource().getParams().DIM_REFERENCE_TIME === undefined ||
          !sameMR
        ) {
          configs = this.createTimeLayerConfigs(
            layerData.Dimension.Dimension_time,
          )
        } else {
          configs = layer.get('layerConfigs')
        }
        let newLayerIndex = this.findLayerIndex(
          this.mapTimeSettings.Extent[this.mapTimeSettings.DateIndex],
          configs[layerActiveConfig].layerDateArray,
          configs[layerActiveConfig].layerTimeStep,
        )
        if (!sameMR) {
          layer.getSource().updateParams({
            DIM_REFERENCE_TIME: undefined,
          })
          if (newLayerIndex < 0) {
            layer.getSource().updateParams({
              TIME: this.getProperDateString(
                configs[layerActiveConfig].layerDateArray[0],
                configs[layerActiveConfig].dateFormat,
              ),
            })
          }
        }
        let layerMR
        if (
          (layer.getSource().getParams().DIM_REFERENCE_TIME === undefined ||
            !sameMR) &&
          currentMR !== null
        ) {
          layerMR = newMRs[newMRs.length - 1]
        } else {
          layerMR = layer.get('layerCurrentMR')
        }
        layer.setProperties({
          layerConfigs: configs,
          layerDateArray: configs[layerActiveConfig].layerDateArray,
          layerDateIndex: newLayerIndex,
          layerDefaultTime: new Date(
            layerData.Dimension.Dimension_time_default,
          ),
          layerDimensionRefTime: layerData.Dimension.Dimension_ref_time,
          layerDimensionTime: layerData.Dimension.Dimension_time,
          layerModelRuns: newMRs,
          layerCurrentMR: layerMR,
          layerStartTime: new Date(configs[layerActiveConfig].layerStartTime),
          layerEndTime: new Date(configs[layerActiveConfig].layerEndTime),
          layerTimeStep: configs[layerActiveConfig].layerTimeStep,
          layerTrueTimeStep: configs[layerActiveConfig].layerTrueTimeStep,
        })
        this.expiredSnackBarMessage = this.t('ExpiredTimesteps')
        this.timeoutDuration = 6000
        this.errorLayersList.splice(
          this.errorLayersList.indexOf(layer.get('layerName')),
          1,
        )
      } catch (error) {
        if (originalError === null) {
          this.errorLayersList.splice(
            this.errorLayersList.indexOf(layer.get('layerName')),
            1,
          )
        } else {
          setTimeout(() => {
            this.errorDispatcher({ layer: layer, error: originalError })
            this.errorLayersList.splice(
              this.errorLayersList.indexOf(layer.get('layerName')),
              1,
            )
          }, 4000)
          this.timeoutDuration = 4000
          this.expiredSnackBarMessage = this.t('LoopRetry', {
            SECONDS: this.timeoutDuration / 1000,
          })
          this.notifyExtentRebuilt = true
        }
      }
    },
  },
  watch: {
    isAnimating(newState) {
      if (newState && this.playState !== 'play') {
        this.blockRefreshAnimation = true
      } else if (!newState) {
        this.blockRefreshAnimation = false
      }
    },
    isErrorLayersListEmpty(isEmpty) {
      if (isEmpty) {
        this.fixTimeExtent()
      }
    },
    playState(newState, oldState) {
      if (newState !== 'play' && oldState === 'play') {
        this.clearAllTimeouts()
      }
    },
  },
  computed: {
    datetimeRangeSlider() {
      return this.store.getDatetimeRangeSlider
    },
    isAnimating() {
      return this.store.getIsAnimating
    },
    mapTimeSettings() {
      return this.store.getMapTimeSettings
    },
    playState() {
      return this.store.getPlayState
    },
    isErrorLayersListEmpty() {
      return this.errorLayersList.length === 0
    },
  },
}
</script>

<style scoped>
.snackbar {
  top: -7px;
}
.snackMessage {
  white-space: pre-wrap;
}
</style>
