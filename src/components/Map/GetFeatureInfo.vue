<template>
  <div id="popupGFI" :class="getCurrentTheme" :style="popupStyle">
    <a href="#" id="popupGFI-closer" class="ol-popup-closer"></a>
    <div id="popupGFI-content"></div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      overlay: null,
    };
  },
  mounted() {
    this.$root.$on("onMapClicked", this.onSingleClick);

    const closer = document.getElementById("popupGFI-closer");
    const this_ = this;
    closer.onclick = function () {
      this_.overlay.setPosition(undefined);
      closer.blur();
      return false;
    };
  },
  beforeDestroy() {
    this.$root.$off("onMapClicked", onSingleClick);
  },
  computed: {
    getCurrentTheme() {
      return {
        "grey darken-4 white--text": this.$vuetify.theme.dark,
        "white black--text": !this.$vuetify.theme.dark,
        "ol-popup": true,
      };
    },
    popupStyle() {
      return {
        "--popup-gfi-arrow-color": this.$vuetify.theme.dark
          ? "#212121"
          : "white",
      };
    },
  },
  methods: {
    async onSingleClick(evt, content, overlay) {
      if (this.$mapLayers.arr.length > 0) {
        content.innerHTML = `<span style="text-wrap: nowrap; align: center">${this.$t(
          "Loading"
        )}</span>`;
        let urls = [];
        this.$mapLayers.arr.forEach((layer) => {
          if (layer.get("visible")) {
            urls.push(
              layer
                .getSource()
                .getFeatureInfoUrl(
                  evt.coordinate,
                  evt.map.getView().getResolution(),
                  evt.map.getView().getProjection().getCode(),
                  { INFO_FORMAT: "application/json" }
                )
            );
          }
        });
        overlay.setPosition(evt.coordinate);
        this.overlay = overlay;
        let boxContent = "";
        for (let i = 0; i < urls.length; i++) {
          try {
            await fetch(urls[i])
              .then((response) => response.json())
              .then((json) => {
                if (
                  Object.keys(json).length > 0 &&
                  json.features.length !== 0 &&
                  Object.hasOwn(json.features[0], "properties") &&
                  Object.hasOwn(json.features[0].properties, "value")
                ) {
                  boxContent += `<span style="text-wrap: nowrap">${json.layer}</span><br>`;
                  boxContent += `<span style="text-wrap: nowrap">&emsp;${this.$t(
                    "RawValue"
                  )}${this.$t("Colon")} ${
                    json.features[0].properties.value
                  }</span><br>`;
                }
              });
          } catch {
            // Just continue execution if somehow the request errors out
          }
        }
        if (boxContent === "") {
          content.innerHTML = `<span style="text-wrap: nowrap">${this.$t(
            "NoData"
          )}</span>`;
        } else {
          content.innerHTML = boxContent;
        }
      }
    },
  },
};
</script>

<style scoped>
.ol-popup {
  position: absolute;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  padding: 15px;
  border-radius: 10px;
  border: 1px solid #cccccc;
  bottom: 12px;
  left: -50px;
}
.ol-popup:after,
.ol-popup:before {
  top: 100%;
  border: solid transparent;
  content: " ";
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
  content: "✖";
}
</style>
