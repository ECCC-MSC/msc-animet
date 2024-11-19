<template>
  <v-menu
    eager
    :close-on-content-click="false"
    location="bottom"
    offset="8"
    class="style-selector"
    v-model="menuVisible"
  >
    <template v-slot:activator="{ props: menuProps }">
      <v-tooltip location="bottom" :disabled="menuVisible">
        <template v-slot:activator="{ props: tooltipProps }">
          <v-btn
            class="icon-size"
            variant="text"
            :color="color"
            v-bind="{ ...menuProps, ...tooltipProps }"
            :icon="
              activeLegends.includes(item.get('layerName'))
                ? 'mdi-palette'
                : 'mdi-palette-outline'
            "
            :disabled="isAnimating || item.get('layerStyles').length === 0"
            hide-details
          >
          </v-btn>
        </template>
        <span>{{ $t('LayerStyle') }}</span>
      </v-tooltip>
    </template>
    <v-container @click.stop :class="getCurrentTheme" class="styles-container">
      <v-checkbox
        :disabled="isAnimating"
        :model-value="activeLegends.includes(item.get('layerName'))"
        hide-details
        class="font-weight-medium display-cb"
        density="compact"
        :color="legendStyle(item.get('layerName'))"
        @update:model-value="
          (value) => toggleLegends(item.get('layerName'), value)
        "
        :label="$t('DisplayLegend')"
      >
        <template v-slot:label>
          <span :class="getCurrentTheme">{{ $t('DisplayLegend') }}</span>
        </template>
      </v-checkbox>
      <v-list
        v-model:selected="selectedStyle"
        color="primary"
        class="style-list"
      >
        <v-list-item
          v-for="(style, styleIndex) in item.get('layerStyles')"
          class="pa-0"
          :class="{ 'selected-item': selectedStyle === styleIndex }"
          :key="styleIndex"
          @click="changeStyleHandler(item, style.Name)"
        >
          <template class="ma-0 selected-icon" v-slot:prepend>
            <div class="icon-container">
              <v-icon v-if="selectedStyle === styleIndex">
                mdi-check-circle-outline
              </v-icon>
            </div>
          </template>
          <v-list-item-title>
            {{ style.Name }}
            <img
              :src="getImgSrc(style.LegendURL)"
              class="d-block image white"
            />
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-container>
  </v-menu>
</template>

<script>
import { useTheme } from 'vuetify'

export default {
  inject: ['store'],
  props: ['item', 'color'],
  data() {
    return {
      menuVisible: false,
    }
  },
  methods: {
    changeStyleHandler(layer, styleName) {
      layer.setProperties({
        layerCurrentStyle: styleName,
      })
      layer.getSource().updateParams({ STYLES: styleName })
      this.emitter.emit('updatePermalink')
    },
    getImgSrc(legendUrl) {
      if (legendUrl.includes('GetLegendGraphic'))
        return `${legendUrl}&lang=${this.$i18n.locale}`
      return legendUrl
    },
    legendStyle(name) {
      if (this.colorBorder) {
        const legendRGB = this.$mapLayers.arr
          .find((l) => l.get('layerName') === name)
          .get('legendColor')
        return `rgb(${legendRGB.r}, ${legendRGB.g}, ${legendRGB.b})`
      }
      return 'primary'
    },
    toggleLegends(name, on) {
      if (on) {
        this.store.addActiveLegend(name)
      } else {
        this.store.removeActiveLegend(name)
      }
      this.emitter.emit('updatePermalink')
    },
  },
  computed: {
    activeLegends() {
      return this.store.getActiveLegends
    },
    colorBorder() {
      return this.store.getColorBorder
    },
    isAnimating() {
      return this.store.getIsAnimating
    },
    getCurrentTheme() {
      const theme = useTheme()
      return theme.global.current.value.dark ? 'bg-grey-darken-4' : 'bg-white'
    },
    selectedStyle() {
      return this.item
        .get('layerStyles')
        .findIndex((style) => style.Name === this.item.get('layerCurrentStyle'))
    },
  },
}
</script>

<style scoped>
.display-cb {
  padding: 0;
  margin: 0;
}
.icon-container {
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-size {
  font-size: 22px;
}
.image {
  border: 1px solid;
  border-color: #212121;
}
.selected-icon {
  align-self: center;
}
.selected-item {
  background-color: rgba(var(--v-theme-primary), 0.16) !important;
  color: rgb(var(--v-theme-primary)) !important;
}
.style-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 0;
}
.styles-container {
  border-radius: 4px;
  margin-right: 8px !important;
  padding: 0 0 2px 2px !important;
}
</style>
