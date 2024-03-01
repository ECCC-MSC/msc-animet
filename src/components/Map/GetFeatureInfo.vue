<template>
  <div
    id="popupGFI"
    class="ol-popup"
    :class="getCurrentTheme"
    :style="popupStyle"
    v-show="items.length !== 0"
  >
    <a href="#" id="popupGFI-closer" class="ol-popup-closer"></a>
    <v-card flat class="tree-container">
      <v-treeview
        @update:open="popupFocus"
        hoverable
        dense
        id="treeviewGFI"
        :items="items"
        :open.sync="initiallyOpen"
      >
        <template v-slot:label="{ item }">
          <v-tooltip bottom open-delay="500" content-class="custom-tooltip">
            <template v-slot:activator="{ on }">
              <span v-on="on">{{ item.name }}</span>
            </template>
            <span class="dont-break-out">{{ item.name }}</span>
          </v-tooltip>
        </template>
      </v-treeview>
    </v-card>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";
export default {
  data() {
    return {
      closer: null,
      initiallyOpen: [],
      items: [],
      overlay: null,
    };
  },
  mounted() {
    window.addEventListener("keydown", this.closeMenu);
    this.$root.$on("onMapClicked", this.onSingleClick);
    this.$root.$on("modelRunChanged", () => {
      if (this.overlay !== null && this.closer !== null) this.closePopup();
    });

    this.closer = document.getElementById("popupGFI-closer");
    this.closer.onclick = this.closePopup;
    this.$root.$on("localeChange", this.changeGFILang);
  },
  beforeDestroy() {
    this.$root.$off("onMapClicked", onSingleClick);
    window.removeEventListener("keydown", this.closeMenu);
    this.$root.$off("localeChange", this.changeGFILang);
  },
  computed: {
    ...mapGetters("Layers", ["getMapTimeSettings", "getMenusOpen"]),
    ...mapState("Layers", ["isAnimating"]),
    getCurrentTheme() {
      return {
        "custom-dark": this.$vuetify.theme.dark,
        white: !this.$vuetify.theme.dark,
      };
    },
    maplayersLength() {
      return this.$mapLayers.arr.length;
    },
    popupStyle() {
      return {
        "--popup-gfi-arrow-color": this.$vuetify.theme.dark
          ? "#1E1E1E"
          : "white",
      };
    },
  },
  watch: {
    getMapTimeSettings: {
      deep: true,
      handler() {
        if (this.overlay !== null && this.closer !== null) this.closePopup();
      },
    },
    maplayersLength() {
      if (this.overlay !== null && this.closer !== null) this.closePopup();
    },
  },
  methods: {
    closeMenu(event) {
      if (event.key === "Escape" && this.overlay !== null) {
        this.closePopup();
      }
    },
    changeGFILang() {
      this.items.forEach((item) => {
        if (item.children[0].name.includes(":")) {
          const value = item.children[0].name.split(":")[1];
          item.children[0].name = `${this.$t("Value")}${this.$t(
            "Colon"
          )}${value}`;
          item.children[1].name = this.$t("OtherProperties");
        } else {
          item.children[0].name = this.$t("OtherProperties");
        }
      });
    },
    async onSingleClick(evt, overlay) {
      this.items = [];
      this.initiallyOpen = [];
      if (
        this.$mapLayers.arr.length > 0 &&
        this.getMenusOpen === 0 &&
        !this.isAnimating
      ) {
        let urls = {};
        this.$mapLayers.arr.forEach((layer) => {
          if (layer.get("visible")) {
            urls[layer.get("layerName")] = layer
              .getSource()
              .getFeatureInfoUrl(
                evt.coordinate,
                evt.map.getView().getResolution(),
                evt.map.getView().getProjection().getCode(),
                { INFO_FORMAT: "application/json", FEATURE_COUNT: 1 }
              );
          }
        });
        overlay.setPosition(evt.coordinate);
        this.overlay = overlay;
        let index = 0;
        for (const [name, url] of Object.entries(urls)) {
          try {
            await fetch(url)
              .then((response) => response.json())
              .then((json) => {
                if (
                  Object.keys(json).length > 0 &&
                  json.features.length !== 0
                ) {
                  let feature = [];
                  if (Object.hasOwn(json.features[0].properties, "value")) {
                    feature.push({
                      id: index,
                      name: `${this.$t("Value")}${this.$t("Colon")} ${
                        json.features[0].properties.value
                      }`,
                    });
                    delete json.features[0].properties.value;
                    index++;
                  }
                  feature.push({
                    id: index,
                    name: this.$t("OtherProperties"),
                    children: Object.entries(json.features[0].properties).map(
                      ([key, value], childIndex) => {
                        return {
                          id: `${index}-${childIndex}`,
                          name: `${key}: ${value}`,
                        };
                      }
                    ),
                  });
                  index++;

                  const item = {
                    id: index,
                    name: name,
                    children: feature,
                  };
                  this.initiallyOpen.push(item.id);
                  this.items.push(item);
                  index++;
                }
              });
          } catch {
            // Just continue execution if somehow the request errors out
          }
        }
        if (this.items.length !== 0) {
          this.popupFocus();
        }
      }
    },
    popupFocus() {
      // The event is triggered when the treeview node is clicked.
      // Thus, you need to wait for 2 DOM updates:
      // 1: The treeview fully opened so you can see the new height;
      // 2: The node names appearing so you can see the new width.
      this.$nextTick(() => {
        this.$nextTick(() => {
          if (this.overlay !== null) {
            const overlayElement = this.overlay.getElement();
            const overlayRect = overlayElement.getBoundingClientRect();
            const isOffScreen =
              overlayRect.right + 64 > window.innerWidth ||
              overlayRect.top - 50 < 0 ||
              overlayRect.bottom + 144 > window.innerHeight;
            if (isOffScreen) {
              const currentCenter = this.$mapCanvas.mapObj
                .getView()
                .getCenter();
              let newCenter = currentCenter;
              if (overlayRect.right + 64 > window.innerWidth) {
                const rightPixel =
                  this.$mapCanvas.mapObj.getPixelFromCoordinate(currentCenter);
                newCenter[0] = this.$mapCanvas.mapObj.getCoordinateFromPixel([
                  rightPixel[0] + (overlayRect.right - window.innerWidth) + 64,
                  rightPixel[1],
                ])[0];
              }
              if (overlayRect.bottom + 144 > window.innerHeight) {
                const bottomPixel =
                  this.$mapCanvas.mapObj.getPixelFromCoordinate(currentCenter);
                newCenter[1] = this.$mapCanvas.mapObj.getCoordinateFromPixel([
                  bottomPixel[0],
                  bottomPixel[1] +
                    (overlayRect.bottom + 144 - window.innerHeight),
                ])[1];
              }
              if (overlayRect.top - 50 < 0) {
                const topPixel =
                  this.$mapCanvas.mapObj.getPixelFromCoordinate(currentCenter);
                newCenter[1] = this.$mapCanvas.mapObj.getCoordinateFromPixel([
                  topPixel[0],
                  topPixel[1] - Math.abs(overlayRect.top) - 50,
                ])[1];
              }
              const view = this.$mapCanvas.mapObj.getView();
              view.animate({
                center: newCenter,
                duration: 250,
              });
            }
          }
        });
      });
    },
    closePopup() {
      this.overlay.setPosition(undefined);
      this.closer.blur();
      return false;
    },
  },
};
</script>

<style scoped>
.custom-dark {
  background-color: #1e1e1e;
  border-color: #1e1e1e;
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
.tree-container {
  border-radius: 20px;
  max-width: 550px;
  max-height: calc(90vh - (34px + 0.5em * 2) - 0.5em - 128px);
  overflow-y: auto;
  padding: 4px 0px;
}
#treeviewGFI {
  font-size: 0.8em;
}
#treeviewGFI::v-deep .v-icon.v-icon::after {
  transform: scale(1);
}
#treeviewGFI::v-deep .v-treeview-node__content {
  margin-left: -2px;
}
#treeviewGFI::v-deep .v-treeview-node__level {
  width: 16px;
}
#treeviewGFI::v-deep .v-treeview-node__prepend {
  margin-right: 0;
}
#treeviewGFI::v-deep .v-treeview-node__root {
  min-height: 22px;
}
#treeviewGFI::v-deep .v-treeview-node .v-treeview-node__toggle {
  display: none !important;
}

#treeviewGFI::v-deep .v-treeview-node__children .v-treeview-node__toggle {
  display: inline-flex !important;
}
</style>
