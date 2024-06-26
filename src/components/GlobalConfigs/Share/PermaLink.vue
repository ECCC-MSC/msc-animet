<template>
  <div id="permaLink">
    <v-dialog v-model="dialog" max-width="600px">
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          v-bind="attrs"
          v-on="on"
          min-width="34px"
          width="34px"
          height="34px"
          class="rounded-circle font-weight-bold"
          @click="createPermaLink"
        >
          <v-icon class="share-icon"> mdi-share </v-icon>
          <span v-show="false" class="share-text">{{ $t("Share") }}</span>
        </v-btn>
      </template>
      <v-card tile>
        <v-toolbar dark color="black">
          <v-toolbar-title>{{ $t("Share") }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon dark @click="closeAll">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text>
          <v-spacer></v-spacer>
          <ShareSocialLinks id="sharesocial" />
          <v-text-field
            id="permalinktext"
            autocomplete="off"
            hide-details
            :value="[getPermalink ? getPermalink : prefixLink()]"
            readonly
            rounded
            dense
            filled
          >
            <template slot="prepend">
              <v-btn icon color="info" @click="toClipboard('permalinktext')">
                <v-icon>mdi-clipboard-multiple-outline</v-icon>
              </v-btn>
            </template>
          </v-text-field>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import ShareSocialLinks from "./ShareSocialLinks.vue";

export default {
  components: {
    ShareSocialLinks,
  },
  data() {
    return {
      dialog: false,
    };
  },
  mounted() {
    this.$root.$on("updatePermalink", this.createPermaLink);
  },
  beforeDestroy() {
    this.$root.$off("updatePermalink", this.createPermaLink);
  },
  computed: {
    ...mapGetters("Layers", [
      "getActiveLegends",
      "getCurrentCRS",
      "getExtent",
      "getMapTimeSettings",
      "getPermalink",
      "getRGB",
      "getShowGraticules",
    ]),
    ...mapState("Layers", ["isBasemapVisible"]),
  },
  methods: {
    closeAll() {
      this.dialog = false;
      document.activeElement.blur();
    },
    selectFieldValue(id) {
      const copyText = document.getElementById(id);
      copyText.select();
      copyText.setSelectionRange(0, 99999);
      return copyText.value;
    },
    toClipboard(id) {
      navigator.clipboard.writeText(this.selectFieldValue(id));
    },
    prefixLink() {
      return window.location.origin + window.location.pathname;
    },
    createPermaLink() {
      if (this.getExtent !== null) {
        let prefix = this.prefixLink();
        let permalinktemp = prefix + "?";
        if (this.$mapLayers.arr.length !== 0) {
          permalinktemp += "layers=";
          const numLayers = this.$mapLayers.arr.length;
          for (let i = 0; i < numLayers; i++) {
            let layerName = this.$mapLayers.arr[i].get("layerName");
            let layerOpacity = this.$mapLayers.arr[i].get("opacity").toString();
            let isSnapped =
              this.$mapLayers.arr[i].get("layerName") ===
              this.getMapTimeSettings.SnappedLayer
                ? "1"
                : "0";
            let isVisible = this.$mapLayers.arr[i].get("layerVisibilityOn")
              ? "1"
              : "0";
            let layerStyle = "0";
            if (
              this.$mapLayers.arr[i].get("layerCurrentStyle") &&
              this.$mapLayers.arr[i].get("layerCurrentStyle") !==
                this.$mapLayers.arr[i].get("layerStyles")[0].Name
            ) {
              layerStyle = this.$mapLayers.arr[i].get("layerCurrentStyle");
            }
            let legendDisplayed = this.getActiveLegends.includes(layerName)
              ? "1"
              : "0";
            permalinktemp +=
              layerName +
              ";" +
              layerOpacity +
              ";" +
              isSnapped +
              ";" +
              isVisible +
              ";" +
              layerStyle +
              ";" +
              legendDisplayed;

            if (i < this.$mapLayers.arr.length - 1) {
              permalinktemp += ",";
            }
          }
          permalinktemp += "&";
        }

        const extent = this.getExtent;
        permalinktemp += "extent=";
        for (let j = 0; j < extent.length; j++) {
          if (j === extent.length - 1) {
            if (j === 4) {
              permalinktemp += extent[j].toFixed(4);
            } else {
              permalinktemp += extent[j].toFixed();
            }
          } else {
            permalinktemp += extent[j].toFixed() + ",";
          }
        }

        if (this.getCurrentCRS !== "EPSG:3857") {
          permalinktemp += `&proj=${this.getCurrentCRS.split(":")[1]}`;
        }

        if (this.getShowGraticules) {
          permalinktemp += "&grat=1";
        }

        let rgb = this.getRGB;
        if (!this.isBasemapVisible) {
          permalinktemp += `&color=None`;
        } else if (rgb.length !== 0) {
          permalinktemp += `&color=${rgb}`;
        }

        if (
          decodeURIComponent(
            this.$router.history.current.fullPath.split("?")[1]
          ) !== permalinktemp.split("?")[1]
        ) {
          this.$router.replace({
            path: "?" + permalinktemp.split("?")[1],
          });
        }

        this.$store.dispatch("Layers/setPermalink", permalinktemp);
        return permalinktemp;
      }
    },
  },
};
</script>

<style scoped>
.share-icon {
  margin-bottom: 2px;
}

#permaLink {
  pointer-events: auto;
  z-index: 4;
}
</style>
