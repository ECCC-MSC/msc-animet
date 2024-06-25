<template>
  <v-card>
    <v-list class="ml-4 pa-0 scroll">
      <transition-group name="list" tag="div">
        <v-list-item
          v-for="(item, index) in layerListReversed"
          :key="item.get('layerName')"
          outlined
          class="px-0"
          :class="{
            'item-padding':
              !isAnimating || configPanelHover || playState !== 'play',
          }"
        >
          <v-list-item-content
            v-if="isAnimating && !configPanelHover && playState === 'play'"
            class="pa-0"
          >
            <v-list-item-title :title="$t(item.get('layerName'))">
              {{ $t(item.get("layerName")) }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ item.get("layerName") }}
            </v-list-item-subtitle>
            <div
              v-if="
                item.get('layerIsTemporal') &&
                item.get('layerModelRuns') !== null &&
                item.get('layerModelRuns').length > 0
              "
              class="text--disabled font-weight-light text-caption mr-subtitle"
              v-text="$t('ModelRun')"
            ></div>
            <model-run-handler class="mr-text" :item="item" />
          </v-list-item-content>
          <v-list-item-content
            v-if="!isAnimating || configPanelHover || playState !== 'play'"
            class="pa-0"
          >
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
          <v-divider
            v-if="!isAnimating || configPanelHover || playState !== 'play'"
            vertical
            class="ml-3 divider"
          ></v-divider>
          <v-list-item-action
            v-if="!isAnimating || configPanelHover || playState !== 'play'"
            class="mx-1 action"
          >
            <v-btn
              v-if="index !== 0"
              :disabled="index === 0 || (isAnimating && playState !== 'play')"
              @click="changeLayerOrder(index - 1)"
              icon
            >
              <v-icon> mdi-arrow-up </v-icon>
            </v-btn>
            <v-btn
              v-if="index + 1 < numLayers"
              :disabled="
                index + 1 >= numLayers || (isAnimating && playState !== 'play')
              "
              @click="changeLayerOrder(index)"
              icon
            >
              <v-icon> mdi-arrow-down </v-icon>
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
    ...mapState("Layers", ["configPanelHover", "isAnimating", "playState"]),
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
  margin-bottom: 10px;
  margin-top: -4px;
}
.content {
  min-height: 96px;
  max-width: 100%;
}
.divider {
  margin-bottom: -2px;
  margin-top: -2px;
}
.item-padding {
  padding-bottom: 2px;
  padding-top: 2px;
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
.mr-subtitle {
  margin-bottom: -8px;
  margin-top: -4px;
}
.mr-text::v-deep .v-label.v-label--active,
.mr-text::v-deep .v-input__append-inner {
  display: none;
}
.scroll {
  overflow-x: hidden;
  overflow-y: auto;
  max-height: calc(100vh - (34px + 0.5em * 2) - 0.5em - 138px - 48px);
}
.v-input.model-run.mr-text.v-input--hide-details.v-input--is-label-active.v-input--is-dirty.v-input--is-disabled.v-text-field.v-text-field--is-booted {
  margin: 0;
  padding: 0;
}
@media (max-width: 1120px) {
  .scroll {
    max-height: calc(100vh - (34px + 0.5em * 2) - 0.5em - 138px - 48px + 24px);
  }
}
@media (max-width: 959px) {
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
