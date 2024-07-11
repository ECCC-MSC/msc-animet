<template></template>

<script>
import axios from "../../utils/AxiosConfig.js";
import SaxonJS from "saxon-js";

import { mapState } from "vuex";

export default {
  data() {
    return {
      interval: setInterval(this.fetchLayerData, 90000),
      iterationCounter: 0,
      layers: [],
      xsltTime: `parse-xml($xml)//Layer[not(.//Layer) and Name = 'REPLACE_WITH_LAYERNAME']!map
                      {
                          'Dimension' : map
                          {
                              'Dimension_time' : string(Dimension[@name = 'time']),
                              'Dimension_time_default' : string(Dimension[@name = 'time']/@default),
                              'Dimension_ref_time' : string(Dimension[@name = 'reference_time'])
                          }
                      }`,
    };
  },
  mounted() {
    this.$root.$on("timeLayerAdded", (layerName) => {
      this.layers.push(layerName);
    });
    this.$root.$on("timeLayerRemoved", (layer) => {
      this.layers = this.layers.filter((l) => l !== layer.get("layerName"));
    });
  },
  beforeDestroy() {
    this.stopPolling();
  },
  methods: {
    checkRefresh(layersInfo) {
      this.iterationCounter++;
      let errorList = [];
      layersInfo.forEach((layerInfo) => {
        if (
          layerInfo["layer"].get("layerDimensionTime") !==
            layerInfo["layerData"].Dimension.Dimension_time ||
          layerInfo["layer"].get("layerDimensionRefTime") !==
            layerInfo["layerData"].Dimension.Dimension_ref_time
        ) {
          errorList.push(layerInfo["layer"]);
        }
      });
      if (errorList.length !== 0) {
        this.$root.$emit("refreshExpired", errorList);
      }
      if (this.iterationCounter % 6 === 0) {
        this.iterationCounter = 0;
        if (this.isAnimating && this.playState !== "play") return;
        this.$mapLayers.arr.forEach((layer) => {
          if (!layer.get("layerIsTemporal")) {
            layer.getSource().updateParams({
              t: new Date().getTime(),
            });
          }
        });
      }
    },
    stopPolling() {
      clearInterval(this.interval);
    },
    async fetchLayerData() {
      let layersInfo = [];
      let layerData;
      await Promise.all(
        this.layers.map(async (layerName) => {
          try {
            const layer = this.$mapLayers.arr.find(
              (l) => l.get("layerName") === layerName
            );
            const api = axios.create({
              baseURL: layer.get("source")["url_"],
              params: {
                SERVICE: "WMS",
                VERSION: "1.3.0",
                REQUEST: "GetCapabilities",
                LAYERS: layerName,
                t: new Date().getTime(),
              },
            });
            await api.get().then((response) => {
              layerData = SaxonJS.XPath.evaluate(
                this.xsltTime.replace(
                  "REPLACE_WITH_LAYERNAME",
                  layer.get("layerXmlName")
                ),
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
            layersInfo.push({
              layer: layer,
              layerData: layerData,
            });
          } catch (error) {
            // pass, it'll be handled in the error manager
          }
        })
      );
      this.checkRefresh(layersInfo);
    },
  },
  computed: {
    ...mapState("Layers", ["isAnimating", "playState"]),
  },
};
</script>
