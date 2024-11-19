<template></template>

<script>
import axios from '../../utils/AxiosConfig.js'

export default {
  inject: ['store'],
  data() {
    return {
      interval: setInterval(this.fetchLayerData, 90000),
      iterationCounter: 0,
      layers: [],
    }
  },
  mounted() {
    this.emitter.on('timeLayerAdded', (layerName) => {
      this.layers.push(layerName)
    })
    this.emitter.on('timeLayerRemoved', (layer) => {
      this.layers = this.layers.filter((l) => l !== layer.get('layerName'))
    })
  },
  beforeUnmount() {
    this.stopPolling()
  },
  methods: {
    checkRefresh(layersInfo) {
      this.iterationCounter++
      let errorList = []
      layersInfo.forEach((layerInfo) => {
        if (
          layerInfo['layer'].get('layerDimensionTime') !==
            layerInfo['layerData'].Dimension.Dimension_time ||
          layerInfo['layer'].get('layerDimensionRefTime') !==
            layerInfo['layerData'].Dimension.Dimension_ref_time
        ) {
          errorList.push(layerInfo['layer'])
        }
      })
      if (errorList.length !== 0) {
        this.emitter.emit('refreshExpired', errorList)
      }
      if (this.iterationCounter % 6 === 0) {
        this.iterationCounter = 0
        if (this.isAnimating && this.playState !== 'play') return
        this.$mapLayers.arr.forEach((layer) => {
          if (!layer.get('layerIsTemporal')) {
            layer.getSource().updateParams({
              t: new Date().getTime(),
            })
          }
        })
      }
    },
    stopPolling() {
      clearInterval(this.interval)
    },
    async fetchLayerData() {
      let layersInfo = []
      let layerData
      await Promise.all(
        this.layers.map(async (layerName) => {
          try {
            const layer = this.$mapLayers.arr.find(
              (l) => l.get('layerName') === layerName,
            )
            const api = axios.create({
              baseURL: layer.get('source')['url_'],
              params: {
                SERVICE: 'WMS',
                VERSION: '1.3.0',
                REQUEST: 'GetCapabilities',
                LAYERS: layerName,
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
                    dimension.Dimension_time_default =
                      dim.getAttribute('default')
                  } else if (dim.getAttribute('name') === 'reference_time') {
                    dimension.Dimension_ref_time = dim.textContent
                  }
                }
                layerData.Dimension = dimension
              }
            })
            layersInfo.push({
              layer: layer,
              layerData: layerData,
            })
          } catch (error) {
            // pass, it'll be handled in the error manager
          }
        }),
      )
      this.checkRefresh(layersInfo)
    },
  },
  computed: {
    isAnimating() {
      return this.store.getIsAnimating
    },
    playState() {
      return this.store.getPlayState
    },
  },
}
</script>
