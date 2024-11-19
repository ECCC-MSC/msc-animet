<template>
  <v-col class="flex-grow-1 flex-shrink-0">
    <v-row class="d-flex justify-space-between top_row">
      <div>
        <arrow-controls action="first" class="button_group"></arrow-controls>
        <arrow-controls action="previous" class="button_group"></arrow-controls>
      </div>
      <span class="text-wrap">
        {{
          localeDateFormat(
            mapTimeSettings.Extent[mapTimeSettings.DateIndex],
            mapTimeSettings.Step,
            dateFormat,
          )
        }}
      </span>
      <div>
        <arrow-controls action="next" class="button_group"></arrow-controls>
        <arrow-controls action="last" class="button_group"></arrow-controls>
      </div>
    </v-row>
    <v-row>
      <play-pause-controls
        v-if="!hide"
        class="play-pause"
      ></play-pause-controls>
      <v-col class="pl-0">
        <v-range-slider
          class="range_slider"
          v-model="datetimeRangeSlider"
          :disabled="isAnimating"
          :min="0"
          :max="mapTimeSettings.Extent.length - 1"
          :step="1"
          :color="hideRangeSlider"
          :thumb-color="hideRangeSlider"
          :track-color="hideRangeSlider"
          :track-fill-color="hideRangeSlider"
          :track-size="2"
          :thumb-label="false"
          hide-details
          @end="handleEnd"
          @update:model-value="changeDisplayedTime"
        ></v-range-slider>
        <div
          class="play-head-slider mt-n8"
          ref="playHeadSlider"
          @mousedown="startDrag"
          @touchstart="startDrag"
        >
          <div class="play-head-slider-track"></div>
          <div
            class="play-head-slider-thumb"
            :style="{ left: `${thumbPosition}%` }"
          ></div>
        </div>
      </v-col>
    </v-row>
    <v-row justify="space-between" class="mt-n6 bottom_row">
      <v-col class="text-left text-wrap px-0">{{
        formatDate(datetimeRangeSlider[0], dateFormat)
      }}</v-col>
      <v-col class="text-right text-wrap px-0">{{
        formatDate(datetimeRangeSlider[1], dateFormat)
      }}</v-col>
    </v-row>
  </v-col>
</template>

<script>
import datetimeManipulations from '../../mixins/datetimeManipulations'

export default {
  inject: ['store'],
  props: {
    hide: Boolean,
  },
  mixins: [datetimeManipulations],
  data() {
    return {
      isDragging: false,
      screenWidth: window.innerWidth,
      throttle: false,
    }
  },
  mounted() {
    window.addEventListener('keydown', this.movePlayHead)
    window.addEventListener('resize', this.updateScreenSize)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.movePlayHead)
    window.removeEventListener('resize', this.updateScreenSize)
  },
  methods: {
    handleEnd() {
      document.activeElement.blur()
    },
    movePlayHead(event) {
      if (this.isAnimating) return
      if (!this.throttle) {
        this.throttle = true
        switch (event.key) {
          case 'ArrowLeft':
            if (this.mapTimeSettings.DateIndex > this.datetimeRangeSlider[0]) {
              this.store.setMapTimeIndex(this.mapTimeSettings.DateIndex - 1)
            } else {
              this.store.setMapTimeIndex(this.datetimeRangeSlider[1])
            }
            break
          case 'ArrowRight':
            if (this.mapTimeSettings.DateIndex < this.datetimeRangeSlider[1]) {
              this.store.setMapTimeIndex(this.mapTimeSettings.DateIndex + 1)
            } else {
              this.store.setMapTimeIndex(this.datetimeRangeSlider[0])
            }
            break
        }
        setTimeout(() => {
          this.throttle = false
        }, 250)
      }
    },
    startDrag(event) {
      if (this.isAnimating) return

      this.isDragging = true
      this.updateThumbPosition(event)

      const moveHandler = (e) => {
        if (this.isDragging) {
          this.updateThumbPosition(e)
        }
      }

      const endHandler = () => {
        this.isDragging = false
        document.removeEventListener('mousemove', moveHandler)
        document.removeEventListener('touchmove', moveHandler)
        document.removeEventListener('mouseup', endHandler)
        document.removeEventListener('touchend', endHandler)
        this.handleEnd()
      }

      document.addEventListener('mousemove', moveHandler)
      document.addEventListener('touchmove', moveHandler)
      document.addEventListener('mouseup', endHandler)
      document.addEventListener('touchend', endHandler)
    },
    updateCurrentTime(newDateIndex) {
      this.emitter.emit('changeTab')
      if (this.mapTimeSettings.DateIndex !== null) {
        if (newDateIndex < this.datetimeRangeSlider[0]) {
          this.store.setMapSnappedLayer(null)
          this.store.setDatetimeRangeSlider([
            newDateIndex,
            this.datetimeRangeSlider[1],
          ])
        } else if (newDateIndex > this.datetimeRangeSlider[1]) {
          this.store.setMapSnappedLayer(null)
          this.store.setDatetimeRangeSlider([
            this.datetimeRangeSlider[0],
            newDateIndex,
          ])
        }
      }
      this.store.setMapTimeIndex(newDateIndex)
      this.emitter.emit('updatePermalink')
    },
    updateScreenSize() {
      this.screenWidth = window.innerWidth
    },
    updateThumbPosition(event) {
      const rect = this.$refs.playHeadSlider.getBoundingClientRect()
      const x = (event.clientX || event.touches[0].clientX) - rect.left
      const percentage = Math.max(0, Math.min(1, x / rect.width))
      const max = this.mapTimeSettings.Extent.length - 1
      const newDateIndex = Math.round(percentage * max)

      this.updateCurrentTime(newDateIndex)
    },
    changeDisplayedTime() {
      this.emitter.emit('changeTab')
      if (
        this.mapTimeSettings.Extent[this.mapTimeSettings.DateIndex] <
        this.mapTimeSettings.Extent[this.datetimeRangeSlider[0]]
      ) {
        this.store.setMapTimeIndex(this.datetimeRangeSlider[0])
        this.emitter.emit('adjustMapTime')
      } else if (
        this.mapTimeSettings.Extent[this.mapTimeSettings.DateIndex] >
        this.mapTimeSettings.Extent[this.datetimeRangeSlider[1]]
      ) {
        this.store.setMapTimeIndex(this.datetimeRangeSlider[1])
        this.emitter.emit('adjustMapTime')
      }
      if (this.mapTimeSettings.SnappedLayer !== null) {
        this.store.setMapSnappedLayer(null)
      }
      this.emitter.emit('updatePermalink')
    },
    formatDate(index, format) {
      if (index > this.mapTimeSettings.Extent.length - 1) {
        index = this.mapTimeSettings.Extent.length - 1
      } else if (index < 0) {
        index = 0
      }
      return this.localeDateFormat(
        this.mapTimeSettings.Extent[index],
        this.mapTimeSettings.Step,
        format,
      )
    },
  },
  computed: {
    isAnimating() {
      return this.store.getIsAnimating
    },
    mapTimeSettings() {
      return this.store.getMapTimeSettings
    },
    dateFormat() {
      if (this.screenWidth > 850) {
        return 'DATETIME_FULL'
      } else if (this.screenWidth > 740) {
        return 'DATETIME_MED'
      } else {
        return 'DATETIME_SHORT'
      }
    },
    datetimeRangeSlider: {
      get() {
        return this.store.getDatetimeRangeSlider
      },
      set(dateRange) {
        this.store.setDatetimeRangeSlider(dateRange)
      },
    },
    hideRangeSlider() {
      if (
        this.mapTimeSettings.Extent !== null &&
        this.mapTimeSettings.Extent.length === 1
      ) {
        return 'rgba(0, 0, 0, 0)'
      } else {
        return 'primary'
      }
    },
    thumbPosition() {
      const max = this.mapTimeSettings.Extent.length - 1
      return (this.mapTimeSettings.DateIndex / max) * 100
    },
  },
}
</script>

<style>
.range_slider {
  --v-focus-opacity: 0.2 !important;
  --v-hover-opacity: 0.2 !important;
  --v-pressed-opacity: 0.5 !important;
}
.range_slider .v-slider__container .v-slider-thumb {
  transform: translate(114%, -50%) !important;
}
.range_slider .v-slider-thumb {
  z-index: 2;
}
.range_slider .v-slider-thumb__surface::before {
  top: -6px;
  left: -15px;
  width: 36px;
  height: 36px;
  z-index: 2;
}
.range_slider .v-slider-thumb--focused .v-slider-thumb__surface::before,
.range_slider .v-slider-thumb:hover .v-slider-thumb__surface::before {
  transform: scale(1) !important;
}
.range_slider .v-slider-thumb__ripple {
  left: calc(var(--v-slider-thumb-size) / -1.3);
  top: calc(var(--v-slider-thumb-size) / -3.4);
  width: 36px;
  height: 36px;
}
.range_slider .v-slider-thumb__surface {
  width: 6px;
  height: 24px;
  position: relative;
  border-radius: 15px;
}
.range_slider .v-slider-track__fill {
  height: 2px !important;
}
</style>

<style scoped>
.play-head-slider {
  position: relative;
  left: 8px;
  height: 32px;
  width: calc(100% - 16px);
  cursor: pointer;
}

.play-head-slider-track {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background-color: rgba(0, 0, 0, 0);
  transform: translateY(-50%);
}

.play-head-slider-thumb {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background-color: rgba(231, 116, 22, 0.5);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
  z-index: 3;
}

.play-head-slider-thumb:hover,
.play-head-slider-thumb:active {
  transform: translate(-50%, -50%) scale(1.8);
}

.button_group {
  display: inline-block;
}
.top_row {
  padding-left: 31px;
  padding-right: 7px;
  padding-top: 8px;
  margin-bottom: -26px;
}
.bottom_row {
  padding-left: 40px;
  padding-right: 17px;
}
.play-pause {
  display: flex;
  align-items: center;
  justify-content: center;
}
.text-wrap {
  overflow: hidden;
  white-space: nowrap !important;
  text-overflow: ellipsis;
}
</style>
