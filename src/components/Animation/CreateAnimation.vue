<template>
  <div>
    <v-tooltip :disabled="layersVisible" location="bottom">
      <template v-slot:activator="{ props }">
        <div v-bind="props">
          <v-btn
            v-if="!isAnimating || playState === 'play'"
            :disabled="
              mapTimeSettings.Step === null ||
              playState === 'play' ||
              !layersVisible
            "
            block
            color="primary"
            @click="createMP4"
            class="text-none"
          >
            {{
              datetimeRangeSlider[0] !== datetimeRangeSlider[1] &&
              outputFormat === 'MP4'
                ? $t('MP4CreateButtonLabel')
                : $t('JPEGCreateButtonLabel')
            }}
          </v-btn>
        </div>
      </template>
      <span>{{ $t('MakeLayersVisible') }}</span>
    </v-tooltip>
    <div
      v-if="isAnimating && playState !== 'play'"
      class="animation-progress-wrapper"
    >
      <v-row>
        <v-col class="d-flex">
          <v-progress-linear
            :model-value="MP4ProgressPercent"
            color="primary"
            height="36"
            class="mr-2 animation-progress"
          >
            <strong>{{ MP4ProgressPercent }} %</strong>
          </v-progress-linear>
          <v-btn
            outlined
            elevation="0"
            color="primary"
            @click="cancelAnimationCreation"
            class="text-none"
          >
            {{ $t('MP4CreateCancelAnimationCreation') }}
          </v-btn>
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<script>
import canvasTxt from 'canvas-txt'
import OLImage from 'ol/layer/Image'
import { markRaw } from 'vue'
import { useI18n } from 'vue-i18n'

import * as HME from 'h264-mp4-encoder'

import datetimeManipulations from '../../mixins/datetimeManipulations'

export default {
  inject: ['store'],
  mounted() {
    this.emitter.on('redoAnimation', this.redoAnimation)
    this.emitter.on('restoreState', this.restoreState)

    // cancel animation creations on window resize avoid Safari bug
    window.addEventListener('resize', this.cancelAnimationFromResize)
  },
  unmounted() {
    window.removeEventListener('resize', this.cancelAnimationFromResize)
  },
  beforeUnmount() {
    this.emitter.off('redoAnimation', this.redoAnimation)
    this.emitter.off('restoreState', this.restoreState)
  },
  mixins: [datetimeManipulations],
  methods: {
    cancelAnimationCreation() {
      if (this.isAnimating && this.playState !== 'play') {
        this.generating = false
        if (this.mapController) {
          this.mapController.abort('')
        }
        if (this.animationController) {
          this.animationController.abort('')
        }
        if (this.layersController) {
          this.layersController.abort('')
        }
        this.store.setMP4URL(this.MP4URL)
        this.store.setImgURL(this.imgURL)
        this.store.setOutputDate(this.outputDate)
      }
    },
    cancelAnimationFromResize() {
      if (this.isAnimating && this.playState !== 'play') {
        this.emitter.emit('cancelAnimationResize')
        this.cancelAnimationCreation()
      }
    },
    getTimeTitleWidths() {
      return [this.mapWidth - 320, 300]
    },
    getModelRuns() {
      let modelRuns = []
      let visibleLayers = this.$mapLayers.arr
        .filter((l) => {
          return l.get('layerVisibilityOn') && l instanceof OLImage
        })
        .reverse()
      const numVisibleLayers = visibleLayers.length
      for (let i = 0; i < numVisibleLayers; i++) {
        if (
          visibleLayers[i].get('layerCurrentMR') !== null &&
          visibleLayers[i].get('layerCurrentMR') !== undefined
        ) {
          modelRuns.push(
            this.localeDateFormat(
              visibleLayers[i].get('layerCurrentMR'),
              null,
              'DATETIME_MED',
            ),
          )
        } else {
          modelRuns.push('')
        }
      }
      return modelRuns
    },
    getAnimationDateTitle(interval) {
      let exportTitleDate
      if (this.outputFormat === 'MP4') {
        exportTitleDate =
          this.mapTimeSettings.Extent[this.datetimeRangeSlider[0]]
      } else {
        exportTitleDate =
          this.mapTimeSettings.Extent[this.mapTimeSettings.DateIndex]
      }
      if (interval === 'P1Y') {
        return `${exportTitleDate.toISOString().split('-')[0]}`
      } else if (interval === 'P1M') {
        let exportTitleDateSplit = exportTitleDate.toISOString().split('-')
        return `${exportTitleDateSplit[0]}${exportTitleDateSplit[1]}`
      } else {
        return (
          exportTitleDate
            .toISOString()
            .split(':00.000')[0]
            .replace(/[:-]/g, '') + 'Z'
        )
      }
    },
    async createMP4() {
      this.emitter.emit('setAnimationTitle')
      this.createMP4Handler()
      this.outputDate = this.storeOutputDate
      this.store.setOutputDate(
        this.getAnimationDateTitle(this.mapTimeSettings.Step),
      )
    },
    async createMP4Handler() {
      this.imgURL = this.storeImgURL
      this.MP4URL = this.mp4URL
      this.store.setMP4URL(null)
      this.store.setImgURL(null)
      this.store.setIsAnimating(true)
      this.generating = true
      this.$mapCanvas.mapObj.updateSize()

      let visibleLayers = this.$mapLayers.arr.filter((l) => {
        return l.get('layerVisibilityOn') && l instanceof OLImage
      })

      this.$mapCanvas.mapObj
        .getInteractions()
        .forEach((x) => x.setActive(false))
      this.setMapHeight()
      this.setMapWidth()
      const widths = this.getTimeTitleWidths()

      this.infoCanvas = this.getInfoCanvas(
        visibleLayers,
        widths,
        this.animationTitle,
      )
      this.dateCanvas = this.getDateCanvas()
      const encoder = await HME.createH264MP4Encoder()
      // This is to prevent encoder from becoming a proxy object through Vue 3
      // Otherwise this code would fail when trying to set the width saying:
      // "property 'c' is a read-only and non-configurable data property on the proxy target but the proxy did not return its actual value (expected '#<Object>' but got '#<Object>')"
      this.encoder = markRaw(encoder)
      this.encoder.width = this.mapWidth
      this.encoder.height = this.mapHeight
      this.encoder.frameRate = this.framesPerSecond
      this.encoder.quantizationParameter = 30
      this.encoder.initialize()

      if (this.outputFormat === 'MP4') {
        this.MP4Length =
          this.datetimeRangeSlider[1] - this.datetimeRangeSlider[0] + 1
      } else {
        this.MP4Length = 1
      }

      let progressCounter = 1
      const initialState = this.mapTimeSettings.DateIndex

      let startIndex
      let endIndex
      if (this.outputFormat === 'MP4') {
        if (!this.isAnimationReversed) {
          startIndex = this.datetimeRangeSlider[0]
          endIndex = this.datetimeRangeSlider[1]
        } else {
          startIndex = this.datetimeRangeSlider[1]
          endIndex = this.datetimeRangeSlider[0]
        }
      } else {
        startIndex = initialState
        endIndex = initialState
      }
      let increment = this.isAnimationReversed ? -1 : 1
      for (
        let i = startIndex;
        this.isAnimationReversed ? i >= endIndex : i <= endIndex;
        i += increment, progressCounter++
      ) {
        if (this.generating === false) {
          break
        }
        if (this.generating === true) {
          this.store.setMapTimeIndex(i)
          if (i === this.datetimeRangeSlider[0]) {
            this.animationController = new AbortController()
            let animationRendered = new Promise((resolve, reject) => {
              const abortListener = ({ target }) => {
                this.animationController.signal.removeEventListener(
                  'abort',
                  abortListener,
                )
                reject(target.reason)
              }
              this.animationController.signal.addEventListener(
                'abort',
                abortListener,
              )

              this.$animationCanvas.mapObj.once('rendercomplete', resolve)
              this.emitter.on('noChange', resolve)
            }).catch(() => {
              console.error('Animation creation cancelled')
            })
            if (initialState === startIndex) {
              await animationRendered
            } else {
              this.mapController = new AbortController()
              let mapRendered = new Promise((resolve, reject) => {
                const abortListener = ({ target }) => {
                  this.mapController.signal.removeEventListener(
                    'abort',
                    abortListener,
                  )
                  reject(target.reason)
                }
                this.mapController.signal.addEventListener(
                  'abort',
                  abortListener,
                )

                this.$mapCanvas.mapObj.once('rendercomplete', resolve)
                this.emitter.on('noChange', resolve)
              }).catch(() => {
                console.error('Animation creation cancelled')
              })
              await Promise.all([mapRendered, animationRendered])
            }
          } else {
            // For some reason the rendercomplete event seems to fire early
            // with the animation on 2 maps, so I'm waiting for layers to
            // throw the loadend event instead.
            this.animationController = new AbortController()
            this.layersController = new AbortController()
            let layersRendered = new Promise((resolve, reject) => {
              const abortListener = ({ target }) => {
                this.layersController.signal.removeEventListener(
                  'abort',
                  abortListener,
                )
                reject(target.reason)
              }
              this.layersController.signal.addEventListener(
                'abort',
                abortListener,
              )

              this.emitter.on('layersRendered', resolve)
              this.emitter.on('noChange', resolve)
            }).catch(() => {
              console.error('Animation creation cancelled')
            })
            let animationRendered = new Promise((resolve, reject) => {
              const abortListener = ({ target }) => {
                this.animationController.signal.removeEventListener(
                  'abort',
                  abortListener,
                )
                reject(target.reason)
              }
              this.animationController.signal.addEventListener(
                'abort',
                abortListener,
              )

              this.$animationCanvas.mapObj.once('rendercomplete', resolve)
              this.emitter.on('noChange', resolve)
            }).catch(() => {
              console.error('Animation creation cancelled')
            })
            await Promise.all([layersRendered, animationRendered])
          }
          if (this.pendingErrorResolution) {
            this.generating = false
            return
          }
          await this.composeCanvas(this.mapTimeSettings.Extent[i], this.encoder)
          this.store.setMP4Percent(
            Math.round((progressCounter / this.MP4Length) * 100),
          )
        }
      }
      this.restoreState(initialState)
    },
    async redoAnimation() {
      this.createMP4Handler()
      this.store.setOutputDate(
        this.getAnimationDateTitle(this.mapTimeSettings.Step),
      )
    },
    restoreState(initialState = null) {
      if (initialState === null) {
        initialState = 0
      } else if (initialState > this.datetimeRangeSlider[1]) {
        initialState = this.datetimeRangeSlider[1]
      }
      this.store.setMapTimeIndex(initialState)

      this.store.setMP4Percent(0)
      this.encoder.finalize()

      this.store.setIsAnimating(false)
      if (this.generating) {
        if (this.MP4Length === 1) {
          const binaryData = atob(this.imgURL.split(',')[1])
          this.store.setOutputSize(binaryData.length)
          this.store.setImgURL(this.imgURL)
        } else {
          const uint8Array = this.encoder.FS.readFile(
            this.encoder.outputFilename,
          )
          const animationBlob = new Blob([uint8Array], { type: 'video/mp4' })
          this.store.setOutputSize(animationBlob.size)
          const mp4URL = URL.createObjectURL(animationBlob)
          this.store.setMP4URL(mp4URL)
        }
      }
      this.encoder.delete()

      this.$mapCanvas.mapObj.getInteractions().forEach((x) => x.setActive(true)) // Enables all map interactions such as drag or zoom
      let theMap = document.getElementById('map')
      theMap.style.height = '100%'
      theMap.style.width = '100%'
    },
    async composeCanvas(date, encoder) {
      this.$mapCanvas.mapObj.updateSize()
      this.$animationCanvas.mapObj.updateSize()
      const mapCnv = this.getMapCanvas()
      this.activeLegends.forEach((layerName) => {
        if (
          this.$mapLayers.arr
            .find((l) => l.get('layerName') === layerName)
            .get('layerVisibilityOn')
        ) {
          this.addLegend(
            mapCnv,
            document.getElementById(layerName),
            this.$mapLayers.arr
              .find((l) => l.get('layerName') === layerName)
              .get('legendColor'),
          )
        }
      })
      await this.updateInfoCanvas(date)
      const composedCnv = await this.stitchCanvases(mapCnv)
      if (this.MP4Length === 1) {
        this.imgURL = composedCnv.toDataURL('image/jpeg', 0.9)
      }
      if (encoder !== null) {
        try {
          encoder.addFrameRgba(
            composedCnv
              .getContext('2d')
              .getImageData(0, 0, composedCnv.width, composedCnv.height).data,
          )
        } catch (error) {
          console.error(
            'Crashed from addFrameRgba because the size of the Map was changed during animation creation.',
          )
          this.cancelAnimationCreation()
        }
      }
      await new Promise((resolve) => window.requestAnimationFrame(resolve))
    },
    addLegend(mapCanvas, mapLegend, rgbObject) {
      const context = mapCanvas.getContext('2d')
      let animationRect = document.getElementById('animation-rect')
      const ratioH = (animationRect.offsetHeight - 8) / mapCanvas.height
      const ratioW = (animationRect.offsetWidth - 8) / mapCanvas.width
      let borderWidth = 0
      if (this.colorBorder) {
        borderWidth = 2
      }
      const offsetLeft =
        (mapLegend.offsetParent.offsetLeft - animationRect.offsetLeft) /
          ratioW +
        borderWidth -
        4
      const offsetTop =
        50 +
        (mapLegend.offsetParent.offsetTop -
          animationRect.offsetTop -
          (50 / this.currentAspect[this.currentResolution].height) *
            animationRect.offsetHeight) /
          ratioH +
        borderWidth -
        4
      const legendWidth = mapLegend.clientWidth / ratioW
      const legendHeight =
        ((mapLegend.naturalHeight / mapLegend.naturalWidth) *
          mapLegend.clientWidth) /
        ratioH
      context.drawImage(
        mapLegend,
        offsetLeft,
        offsetTop,
        legendWidth,
        legendHeight,
      ) // drawImage(image, dx, dy, dWidth, dHeight)
      if (this.colorBorder) {
        const borderWidth = 2
        const borderColor = `rgb(${rgbObject.r}, ${rgbObject.g}, ${rgbObject.b})`
        context.strokeStyle = borderColor
        context.lineWidth = borderWidth

        context.strokeRect(
          offsetLeft - borderWidth / 2,
          offsetTop - borderWidth / 2,
          legendWidth + borderWidth,
          legendHeight + borderWidth,
        )
      }
    },
    async stitchCanvases(mapCanvas) {
      return new Promise((resolve) => {
        let composedCnv = document.createElement('canvas')
        let ctx = composedCnv.getContext('2d')

        composedCnv.width = mapCanvas.width
        composedCnv.height = mapCanvas.height
        ;[
          {
            cnv: mapCanvas,
            x: 0,
            y: 0,
          },
          {
            cnv: this.outputHeader,
            x: 0,
            y: 0,
          },
          {
            cnv: this.infoCanvas,
            x: mapCanvas.width - this.infoCanvas.width,
            y: mapCanvas.height - this.infoCanvas.height,
          },
          {
            cnv: this.outputDateCanvas,
            x: mapCanvas.width - this.outputDateCanvas.width - 10,
            y: this.outputHeader.height + 10,
          },
        ].forEach((n) => {
          ctx.beginPath()
          ctx.drawImage(n.cnv, n.x, n.y, n.cnv.width, n.cnv.height)
        })

        resolve(composedCnv)
      })
    },
    getMapCanvas() {
      let mapCanvas = document.createElement('canvas')
      mapCanvas.width = this.mapWidth //size[0]
      mapCanvas.height = this.mapHeight //size[1]
      let mapContext = mapCanvas.getContext('2d')
      if (this.$mapCanvas.mapObj.getLayers().getArray()[0].get('visible')) {
        mapContext.fillStyle = 'white'
      } else {
        mapContext.fillStyle =
          document.getElementById('map').style.backgroundColor
      }
      mapContext.fillRect(0, 0, mapCanvas.width, mapCanvas.height)
      Array.prototype.forEach.call(
        document.querySelectorAll('#animation-canvas .ol-layer canvas'),
        function (canvas) {
          if (canvas.width > 0) {
            const opacity = canvas.parentNode.style.opacity
            mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity)
            const transform = canvas.style.transform
            const matrix = transform
              .match(/^matrix\(([^\(]*)\)$/)[1] //eslint-disable-line
              .split(',')
              .map(Number)
            CanvasRenderingContext2D.prototype.setTransform.apply(
              mapContext,
              matrix,
            )
            mapContext.drawImage(canvas, 0, 0)
          }
        },
      )
      return mapCanvas
    },
    getOutputHeader(widths, customTitle) {
      let outputHeaderCanvas = document.createElement('canvas')
      let ctx = outputHeaderCanvas.getContext('2d')
      outputHeaderCanvas.width = this.mapWidth
      if (this.mapWidth >= 1080) {
        outputHeaderCanvas.height = 50
      } else {
        outputHeaderCanvas.height = 30
      }
      ctx.fillStyle = 'rgba(255,255,255,0.65)'
      ctx.fillRect(0, 0, outputHeaderCanvas.width, outputHeaderCanvas.height)
      ctx.strokeStyle = 'black'
      ctx.fillStyle = 'black'
      const logo_canvas = document.getElementById(
        `eccc_logo_${this.$i18n.locale}`,
      )
      let ratio = logo_canvas.naturalWidth / logo_canvas.naturalHeight
      let width = null
      if (this.mapWidth >= 1080) {
        let fontSize = 26
        ctx.font = fontSize + 'px sans-serif'
        let metrics = ctx.measureText(customTitle)
        width = 2 * widths[1]
        while (metrics.width > this.mapWidth - width - 16 && fontSize > 15) {
          fontSize -= 1
          ctx.font = fontSize + 'px sans-serif'
          metrics = ctx.measureText(customTitle)
        }
        canvasTxt.fontSize = fontSize
        canvasTxt.align = 'left'
        canvasTxt.drawText(
          ctx,
          customTitle,
          8,
          0,
          this.mapWidth - width - 16,
          outputHeaderCanvas.height / 2 + fontSize / 2,
        )
      } else {
        let fontSize = 18
        ctx.font = fontSize + 'px sans-serif'
        let metrics = ctx.measureText(customTitle)
        width = widths[1]
        while (metrics.width > this.mapWidth - width - 16 && fontSize > 12) {
          fontSize -= 1
          ctx.font = fontSize + 'px sans-serif'
          metrics = ctx.measureText(customTitle)
        }
        canvasTxt.fontSize = fontSize
        canvasTxt.align = 'left'
        canvasTxt.drawText(
          ctx,
          customTitle,
          8,
          0,
          this.mapWidth - width - 16,
          outputHeaderCanvas.height / 2 + fontSize / 2,
        )
      }
      let height = width / ratio
      if (this.mapWidth >= 1080) {
        ctx.drawImage(
          logo_canvas,
          this.mapWidth - 2 * widths[1] - 8,
          (outputHeaderCanvas.height - height) / 2,
          width,
          height,
        )
      } else {
        ctx.drawImage(
          logo_canvas,
          this.mapWidth - widths[1] - 8,
          (outputHeaderCanvas.height - height) / 2,
          width,
          height,
        )
      }
      this.outputHeader = outputHeaderCanvas
    },
    getDateCanvas() {
      this.outputDateCanvas = document.createElement('canvas')
      let ctx = this.outputDateCanvas.getContext('2d')

      let dateFont = 16
      if (this.currentResolution === '1080p') {
        canvasTxt.fontSize = 26
      } else {
        canvasTxt.fontSize = 22
        dateFont = 12
      }
      ctx.font = canvasTxt.fontSize + 'px sans-serif'

      if (
        this.mapTimeSettings.Step === 'P1Y' ||
        this.mapTimeSettings.Step === 'P1M'
      ) {
        let dateLabelForMeasurement
        if (this.mapTimeSettings.Step === 'P1Y') {
          dateLabelForMeasurement = '2222'
        } else {
          dateLabelForMeasurement = 'September 2222'
        }
        let metrics = ctx.measureText(dateLabelForMeasurement)

        this.outputDateCanvas.height =
          this.currentResolution === '1080p' ? 34 : 30
        this.outputDateCanvas.width = metrics.width + 12
      } else {
        const [dateLabel, timeLabel] = this.localeDateFormatAnimation(
          this.mapTimeSettings.Extent[this.mapTimeSettings.DateIndex],
          this.mapTimeSettings.Step,
        )
        let timeMetrics = ctx.measureText(timeLabel)

        canvasTxt.fontSize = dateFont
        ctx.font = canvasTxt.fontSize + 'px sans-serif'
        let dateMetrics = ctx.measureText(dateLabel)

        this.outputDateCanvas.height =
          this.currentResolution === '1080p' ? 54 : 50
        this.outputDateCanvas.width =
          timeMetrics.width >= dateMetrics.width
            ? timeMetrics.width + 16
            : dateMetrics.width + 16
      }

      ctx.fillStyle = 'rgba(255,255,255,0.65)'
      ctx.fillRect(
        0,
        0,
        this.outputDateCanvas.width,
        this.outputDateCanvas.height,
      )
      ctx.strokeStyle = 'black'
      ctx.fillStyle = 'black'
    },
    getInfoCanvas(visibleLayers, widths, customTitle) {
      this.getOutputHeader(widths, customTitle)
      let infoCanvas = document.createElement('canvas')
      let ctx = infoCanvas.getContext('2d')
      let ctx_w = this.mapWidth
      this.isLayerListShown = !(
        visibleLayers.length === 1 &&
        customTitle === this.t(visibleLayers[0].get('layerName'))
      )
      // Must be divisible by 2 otherwise encoder.initialize() will fail
      let ctx_h = 40

      let fontArray = []
      let metrics
      let baseFont = 18
      let minFont = 12
      if (this.mapWidth < 1080) {
        baseFont = 13
        minFont = 10
      }
      const modelRuns = this.getModelRuns()
      const numModelRuns = modelRuns.filter((mr) => {
        return mr !== ''
      }).length
      if (this.isLayerListShown) {
        ctx_h = 0
        for (let i = visibleLayers.length - 1; i >= 0; i--) {
          let layerTitle = `• ${this.t(visibleLayers[i].get('layerName'))}`
          let fontSize = baseFont
          ctx.font = fontSize + 'px sans-serif'
          metrics = ctx.measureText(layerTitle)
          while (metrics.width > widths[0] && fontSize > minFont) {
            fontSize -= 1
            ctx.font = fontSize + 'px sans-serif'
            metrics = ctx.measureText(layerTitle)
          }
          ctx_h += baseFont + 8
          fontArray.push({
            name: visibleLayers[i].get('layerName'),
            title: layerTitle,
            fontSize: fontSize,
            color: visibleLayers[i].get('legendColor'),
          })
        }
        // Must be divisible by 2 otherwise encoder.initialize() will fail
        ctx_h = 2 * Math.ceil(ctx_h / 2)
        if (ctx_h < 40) ctx_h = 40
      }
      let animetOffset = 0
      let animetPlacement = ctx_h
      let osmOffset = 0
      let osmPlacement = ctx_h
      if (!this.isLayerListShown) {
        animetPlacement = 0.01 * infoCanvas.height
        osmPlacement = 20
      } else if (
        !this.$mapCanvas.mapObj.getLayers().getArray()[0].get('visible')
      ) {
        if (this.mapWidth < 1080) {
          animetOffset = 21
        } else {
          animetOffset = 23
        }
      } else {
        if (this.mapWidth < 1080) {
          animetOffset = 30
          osmOffset = 17
        } else {
          animetOffset = 34
          osmOffset = 20
        }
      }

      let animetAttr = this.t('MadeWithAniMet')
      if (this.mapWidth < 1080) {
        canvasTxt.fontSize = 13
      } else {
        canvasTxt.fontSize = 15
      }
      canvasTxt.align = 'left'
      ctx.font = canvasTxt.fontSize + 'px sans-serif'
      metrics = ctx.measureText(animetAttr)

      if (numModelRuns !== 0 && this.isLayerListShown) {
        let minHeight
        if (numModelRuns === 1) {
          minHeight = baseFont + animetOffset
        } else {
          const lastMRIndex = modelRuns.findLastIndex((mr) => mr !== '')
          minHeight = (lastMRIndex + 1) * (baseFont + 8) + animetOffset - 6
        }
        ctx_h = ctx_h >= minHeight ? ctx_h : minHeight
        animetPlacement = ctx_h
        osmPlacement = ctx_h
      } else if (!this.isLayerListShown) {
        if (!this.$mapCanvas.mapObj.getLayers().getArray()[0].get('visible')) {
          ctx_h = 24
        }
        if (numModelRuns === 0) {
          ctx_w = metrics.width + 12
        }
      }
      infoCanvas.width = ctx_w
      infoCanvas.height = ctx_h
      ctx.fillStyle = 'rgba(255,255,255,0.65)'
      ctx.fillRect(0, 0, infoCanvas.width, infoCanvas.height)
      ctx.fillStyle = 'black'
      ctx.strokeStyle = 'black'

      canvasTxt.drawText(
        ctx,
        animetAttr,
        ctx_w - metrics.width - 0.01 * infoCanvas.width - 4,
        animetPlacement - animetOffset,
        widths[1],
        20,
      )

      let hPos = 0
      fontArray.forEach((timeLayer) => {
        let offsetX = 0
        if (this.colorBorder && this.activeLegends.includes(timeLayer.name)) {
          let color = `rgb(${timeLayer.color.r}, ${timeLayer.color.g}, ${timeLayer.color.b})`
          canvasTxt.fontSize = 40
          ctx.fillStyle = color
          canvasTxt.drawText(
            ctx,
            timeLayer.title.slice(0, 2),
            0.01 * infoCanvas.width,
            hPos - 6,
            widths[0],
            30,
          )
          offsetX = ctx.measureText(timeLayer.title.slice(0, 2)).width
        }
        canvasTxt.fontSize = timeLayer.fontSize
        ctx.fillStyle = 'black'
        canvasTxt.drawText(
          ctx,
          timeLayer.title.slice(2),
          0.01 * infoCanvas.width + offsetX,
          hPos - 6,
          widths[0],
          30,
        )
        hPos += baseFont + 8
      })

      ctx.strokeStyle = 'black'
      ctx.fillStyle = 'black'

      if (numModelRuns !== 0) {
        canvasTxt.fontSize = baseFont - 2
        ctx.font = canvasTxt.fontSize + 'px sans-serif'
        canvasTxt.align = 'left'
        const allEqualOrEmpty = (arr) => {
          const nonEmptyArr = arr.filter((v) => v !== '')
          metrics = ctx.measureText(`Ref${this.t('Colon')}` + nonEmptyArr[0])
          return nonEmptyArr.every((v) => v === nonEmptyArr[0])
        }
        if (!allEqualOrEmpty(modelRuns)) {
          const numMRs = modelRuns.length
          for (let i = 1; i < numMRs; i++) {
            let textLength = ctx.measureText(
              `Ref${this.t('Colon')} ` + modelRuns[i],
            )
            if (textLength.width > metrics.width) {
              metrics = textLength
            }
          }
          let MRPlacement = ctx_w - metrics.width - 0.01 * infoCanvas.width
          let side = 1
          if (!this.isLayerListShown) {
            MRPlacement = 0.01 * infoCanvas.width
            side = 0
          }
          let hPos = 0
          for (let i = 0; i < numMRs; i++) {
            canvasTxt.drawText(
              ctx,
              modelRuns[i] === ''
                ? ''
                : `Ref${this.t('Colon')} ` + modelRuns[i],
              MRPlacement,
              hPos - 6,
              widths[side],
              30,
            )
            hPos += baseFont + 8
          }
        } else {
          let MRPlacement = ctx_w - metrics.width - 0.01 * infoCanvas.width
          let side = 1
          if (!this.isLayerListShown) {
            MRPlacement = 0.01 * infoCanvas.width
            side = 0
          }
          const mrDate =
            `Ref${this.t('Colon')} ` +
            modelRuns.filter((mr) => {
              return mr !== ''
            })[0]
          canvasTxt.drawText(ctx, mrDate, MRPlacement, -6, widths[side], 30)
        }
      }

      if (this.$mapCanvas.mapObj.getLayers().getArray()[0].get('visible')) {
        // © OpenStreetMap contributors
        let OSMAttr = this.t('AttributionOSM')
        canvasTxt.fontSize = 10
        canvasTxt.align = 'left'
        ctx.font = canvasTxt.fontSize + 'px sans-serif'
        metrics = ctx.measureText(OSMAttr)
        canvasTxt.drawText(
          ctx,
          OSMAttr,
          ctx_w - metrics.width - 0.01 * infoCanvas.width - 4,
          osmPlacement - osmOffset,
          widths[1],
          20,
        )
      }

      return infoCanvas
    },
    setMapHeight() {
      this.mapHeight = this.currentAspect[this.currentResolution].height
    },
    setMapWidth() {
      this.mapWidth = this.currentAspect[this.currentResolution].width
    },
    async updateInfoCanvas(newDate) {
      return new Promise((resolve) => {
        let ctx = this.outputDateCanvas.getContext('2d')

        ctx.fillStyle = 'rgba(255,255,255,0.65)'
        ctx.clearRect(
          0,
          0,
          this.outputDateCanvas.width,
          this.outputDateCanvas.height,
        )
        ctx.fillRect(
          0,
          0,
          this.outputDateCanvas.width,
          this.outputDateCanvas.height,
        )
        if (
          this.mapTimeSettings.Step === 'P1Y' ||
          this.mapTimeSettings.Step === 'P1M'
        ) {
          const dateLabel = this.localeDateFormat(
            newDate,
            this.mapTimeSettings.Step,
          )
          ctx.fillStyle = 'black'
          canvasTxt.fontSize = this.currentResolution === '1080p' ? 26 : 22
          ctx.font = canvasTxt.fontSize + 'px sans-serif'
          let metricsDate = ctx.measureText(dateLabel)
          let datePlacement =
            this.outputDateCanvas.width -
            metricsDate.width -
            (this.outputDateCanvas.width - metricsDate.width) / 2
          canvasTxt.drawText(
            ctx,
            dateLabel,
            datePlacement,
            this.currentResolution === '1080p' ? -2 : -3,
            this.outputDateCanvas.width,
            30,
          )
        } else {
          const [dateLabel, timeLabel] = this.localeDateFormatAnimation(
            newDate,
            this.mapTimeSettings.Step,
          )
          ctx.fillStyle = 'black'
          canvasTxt.fontSize = this.currentResolution === '1080p' ? 16 : 12
          ctx.font = canvasTxt.fontSize + 'px sans-serif'
          let metricsDate = ctx.measureText(dateLabel)
          let datePlacement =
            this.outputDateCanvas.width -
            metricsDate.width -
            (this.outputDateCanvas.width - metricsDate.width) / 2
          canvasTxt.drawText(
            ctx,
            dateLabel,
            datePlacement,
            -10,
            this.outputDateCanvas.width,
            40,
          )

          canvasTxt.fontSize = this.currentResolution === '1080p' ? 26 : 22
          ctx.font = canvasTxt.fontSize + 'px sans-serif'
          let metricsTime = ctx.measureText(timeLabel)
          let timePlacement =
            this.outputDateCanvas.width -
            metricsTime.width -
            (this.outputDateCanvas.width - metricsTime.width) / 2
          canvasTxt.drawText(
            ctx,
            timeLabel,
            timePlacement,
            this.currentResolution === '1080p' ? 13 : 10,
            this.outputDateCanvas.width,
            40,
          )
        }
        resolve()
      })
    },
  },
  computed: {
    animationTitle() {
      return this.store.getAnimationTitle
    },
    datetimeRangeSlider() {
      return this.store.getDatetimeRangeSlider
    },
    framesPerSecond() {
      return this.store.getFramesPerSecond
    },
    isAnimating() {
      return this.store.getIsAnimating
    },
    isAnimationReversed() {
      return this.store.getIsAnimationReversed
    },
    MP4ProgressPercent() {
      return this.store.getMP4ProgressPercent
    },
    pendingErrorResolution() {
      return this.store.getPendingErrorResolution
    },
    playState() {
      return this.store.getPlayState
    },

    activeLegends() {
      return this.store.getActiveLegends
    },
    colorBorder() {
      return this.store.getColorBorder
    },
    currentAspect() {
      return this.store.getCurrentAspect
    },
    currentResolution() {
      return this.store.getCurrentResolution
    },
    storeImgURL() {
      return this.store.getImgURL
    },
    mapTimeSettings() {
      return this.store.getMapTimeSettings
    },
    mp4URL() {
      return this.store.getMP4URL
    },
    storeOutputDate() {
      return this.store.getOutputDate
    },
    outputFormat() {
      return this.store.getOutputFormat
    },
    layersVisible() {
      let visibleLayers = this.$mapLayers.arr.filter((l) => {
        return l.get('layerVisibilityOn') && l instanceof OLImage
      })
      if (visibleLayers.length === 0) return false
      return true
    },
  },
  watch: {
    pendingErrorResolution(isPending) {
      if (this.isAnimating && this.playState !== 'play' && isPending) {
        this.cancelAnimationCreation()
      }
    },
  },
  data() {
    return {
      animationController: null,
      encoder: null,
      generating: false,
      imgURL: null,
      infoCanvas: null,
      isLayerListShown: true,
      layersController: null,
      mapController: null,
      mapHeight: 0,
      mapWidth: 0,
      MP4Length: 0,
      MP4URL: null,
      modelRunMessage: null,
      outputDate: null,
      outputDateCanvas: null,
      outputHeader: null,
      t: useI18n().t,
    }
  },
}
</script>

<style scoped>
.animation-progress-wrapper {
  overflow: hidden;
}
.animation-progress {
  border-radius: 4px;
}
</style>
