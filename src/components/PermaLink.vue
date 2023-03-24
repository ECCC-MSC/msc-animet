<template>
  <v-dialog v-model="dialog" max-width="600px">
    <template v-slot:activator="{ on, attrs }">
      <v-btn
        rounded
        v-bind="attrs"
        v-on="on"
        @click="createPermaLink"
        class="permalink-button text-none font-weight-bold pl-3 pr-3"
        height="32px"
      >
        <v-icon left> mdi-link-variant </v-icon>
        {{ $t("share") }}
      </v-btn>
    </template>
    <v-card tile>
      <v-toolbar dark color="black">
        <v-toolbar-title>{{ $t("share") }}</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon dark @click="dialog = false">
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
</template>

<script>
import { mapGetters } from "vuex";
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
  computed: {
    ...mapGetters("Layers", [
      "getExtent",
      "getLayerList",
      "getOutputWH",
      "getMapTimeSettings",
      "getOrderedLayers",
      "getPermalink",
    ]),
  },
  methods: {
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
      let prefix = this.prefixLink();
      if (this.getLayerList.length === 0) {
        this.$store.dispatch("Layers/setPermalink", prefix);
        return prefix;
      }
      this.$root.$emit("getExtent");
      this.$root.$emit("generatePermaLink");

      const orderedLayerList = [
        ...this.getOrderedLayers.toString().split(","),
      ].reverse();
      let permalinktemp = prefix + "?layers=";
      let isSnapped = "0";
      for (let i = 0; i < this.getLayerList.length; i++) {
        let layer = this.getLayerList.find(
          (l) => l.Name === orderedLayerList[i]
        );
        let layerOpacity = layer.Opacity.toString();
        if (this.getMapTimeSettings.SnappedLayer) {
          isSnapped =
            layer.Name === this.getMapTimeSettings.SnappedLayer.Name
              ? "1"
              : "0";
        }
        let isVisible = layer.Visible ? "1" : "0";
        let layerStyle = "0";
        if (layer.currentStyle !== layer.Style[0].Name) {
          layerStyle = layer.currentStyle;
        }

        permalinktemp +=
          layer.Name +
          ";" +
          layerOpacity +
          ";" +
          isSnapped +
          ";" +
          isVisible +
          ";" +
          layerStyle;
        if (i < orderedLayerList.length - 1) {
          permalinktemp += ",";
        }
      }

      const extent = this.getExtent;
      permalinktemp += "&extent=";
      for (let j = 0; j < extent.length; j++) {
        if (j === extent.length - 1) {
          permalinktemp += extent[j].toFixed();
        } else {
          permalinktemp += extent[j].toFixed() + ",";
        }
      }

      const mapwh = this.getOutputWH;
      permalinktemp += "&width=" + mapwh[0] + "&height=" + mapwh[1];
      if (
        decodeURIComponent(
          this.$router.history.current.fullPath.split("?")[1]
        ) !== permalinktemp.split("?")[1]
      ) {
        this.$router.replace({ path: "?" + permalinktemp.split("?")[1] });
      }

      this.$store.dispatch("Layers/setPermalink", permalinktemp);
      return permalinktemp;
    },
  },
};
</script>

<style>
.permalink-button .v-btn__content {
  font-size: 1rem;
  letter-spacing: normal;
}
</style>
