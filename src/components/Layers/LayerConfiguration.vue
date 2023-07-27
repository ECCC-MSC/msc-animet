<template>
  <v-expansion-panels :value="0">
    <v-expansion-panel>
      <v-expansion-panel-header>
        {{ $t("LayerControlsTitle") }}
      </v-expansion-panel-header>
      <v-expansion-panel-content>
        <v-list>
          <transition-group name="list" tag="div">
            <v-list-item
              v-for="(item, index) in layerListReversed"
              :key="item.get('layerName')"
              outlined
              class="pa-0"
            >
              <v-list-item-content>
                <v-row class="content">
                  <!-- Title -->
                  <v-col cols="12" sm="8" md="8" class="py-2">
                    <v-list-item-title :title="$t(item.get('layerName'))">
                      {{ $t(item.get("layerName")) }}
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      {{ item.get("layerName") }}
                    </v-list-item-subtitle>

                    <model-run-handler :item="item" />
                  </v-col>

                  <!-- Layer control buttons -->
                  <v-col
                    class="d-flex justify-start justify-md-space-between align-center pl-6 pa-0"
                  >
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
                  </v-col>
                </v-row>
                <v-divider v-if="numLayers - 1 !== index"></v-divider>
              </v-list-item-content>
              <v-divider vertical class="ml-3"></v-divider>
              <v-list-item-action class="mx-2 action">
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
      </v-expansion-panel-content>
    </v-expansion-panel>
  </v-expansion-panels>
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
    numLayers() {
      return this.$mapLayers.arr.length;
    },
    layerListReversed() {
      return this.$mapLayers.arr.slice().reverse();
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
</style>
