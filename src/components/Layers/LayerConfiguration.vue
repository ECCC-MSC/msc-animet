<template>
  <v-card>
    <v-list class="ml-4 pa-0 scroll">
      <transition-group name="list" tag="div">
        <v-list-item
          v-for="(item, index) in layerListReversed"
          :key="item.get('layerName')"
          outlined
          class="pa-0"
        >
          <v-list-item-content>
            <v-col class="pa-0">
              <v-list-item-title :title="$t(item.get('layerName'))">
                {{ $t(item.get("layerName")) }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ item.get("layerName") }}
              </v-list-item-subtitle>

              <model-run-handler :item="item" />

              <!-- Layer control buttons -->
              <v-row class="justify-space-between ma-0">
                <snapped-layer-handler
                  :item="item"
                  :color="isSnapped(item.get('layerName'))"
                />
                <opacity-handler
                  :item="item"
                  :color="isSnapped(item.get('layerName'))"
                />
                <visibility-handler
                  :item="item"
                  :color="isSnapped(item.get('layerName'))"
                />
                <style-handler
                  :item="item"
                  :color="isSnapped(item.get('layerName'))"
                />
                <remove-layer-handler
                  :item="item"
                  :color="isSnapped(item.get('layerName'))"
                />
              </v-row>
            </v-col>
            <v-divider v-if="numLayers - 1 !== index"></v-divider>
          </v-list-item-content>
          <v-divider vertical class="ml-3"></v-divider>
          <v-list-item-action class="mx-1 action">
            <v-btn
              :disabled="index === 0 || isAnimating"
              @click="changeLayerOrder(index - 1)"
              icon
            >
              <v-icon v-if="index !== 0"> mdi-arrow-up </v-icon>
            </v-btn>
            <v-btn
              :disabled="index + 1 >= numLayers || isAnimating"
              @click="changeLayerOrder(index)"
              icon
            >
              <v-icon v-if="index + 1 < numLayers"> mdi-arrow-down </v-icon>
            </v-btn>
          </v-list-item-action>
        </v-list-item>
      </transition-group>
    </v-list>
  </v-card>
</template>

<script>
import { mapGetters, mapState } from "vuex";

import datetimeManipulations from "../../mixins/datetimeManipulations";

import ModelRunHandler from "./ModelRunHandler.vue";
import OpacityHandler from "./OpacityHandler.vue";
import RemoveLayerHandler from "./RemoveLayerHandler.vue";
import SnappedLayerHandler from "./SnappedLayerHandler.vue";
import StyleHandler from "./StyleHandler.vue";
import VisibilityHandler from "./VisibilityHandler.vue";

export default {
  components: {
    ModelRunHandler,
    OpacityHandler,
    RemoveLayerHandler,
    SnappedLayerHandler,
    StyleHandler,
    VisibilityHandler,
  },
  mixins: [datetimeManipulations],
  methods: {
    changeLayerOrder(index) {
      let reverseIndex = this.numLayers - index - 1;
      this.$mapLayers.arr[reverseIndex].setZIndex(reverseIndex - 1);
      this.$mapLayers.arr[reverseIndex - 1].setZIndex(reverseIndex);
      this.$mapLayers.arr[reverseIndex] = this.$mapLayers.arr.splice(
        reverseIndex - 1,
        1,
        this.$mapLayers.arr[reverseIndex]
      )[0];
      this.$root.$emit("updatePermalink");
      this.$root.$emit("calcFooterPreview");
    },
    isSnapped(layerName) {
      if (this.getMapTimeSettings.SnappedLayer !== null) {
        return layerName === this.getMapTimeSettings.SnappedLayer
          ? "primary"
          : "";
      } else {
        return "";
      }
    },
  },
  computed: {
    ...mapGetters("Layers", ["getMapTimeSettings"]),
    ...mapState("Layers", ["isAnimating"]),
    layerListReversed() {
      return this.$mapLayers.arr.slice().reverse();
    },
    numLayers() {
      return this.$mapLayers.arr.length;
    },
  },
};
</script>

<style scoped>
.action {
  margin-top: -6px;
  padding-bottom: 6px;
}
.content {
  min-height: 96px;
  max-width: 100%;
}
.list-enter,
.list-leave-to {
  opacity: 0;
}
.list-enter-active,
.list-leave-active {
  transition: opacity 0.25s ease;
}
.list-move {
  transition: transform 0.25s ease-out;
}
.scroll {
  overflow-x: hidden;
  overflow-y: auto;
  max-height: calc(100vh - (34px + 0.5em * 2) - 0.5em - 138px - 48px);
}
@media (max-width: 1265px) {
  .scroll {
    max-height: calc(100vh - (34px + 0.5em * 2) - 0.5em - 138px - 48px - 42px);
  }
}
@media (max-width: 1120px) {
  .scroll {
    max-height: calc(
      100vh - (34px + 0.5em * 2) - 0.5em - 138px - 48px - 42px + 24px
    );
  }
}
@media (max-width: 565px) {
  .scroll {
    max-height: calc(
      100vh - (34px + 0.5em * 2) - 0.5em - 158px - 48px - 42px - 10px
    );
  }
}
</style>
