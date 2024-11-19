<template>
  <div>
    <v-btn
      ref="playPauseButton"
      @click="playPause()"
      icon
      class="enable-events"
      color="primary"
      size="36"
      variant="text"
      :disabled="
        (isAnimating && playState !== 'play') ||
        mapTimeSettings.Extent.length < 2
      "
    >
      <v-icon
        class="rotation-animation"
        :class="{
          'rotated-icon':
            playbackReversed &&
            (!(mapTimeSettings.DateIndex === datetimeRangeSlider[0]) ||
              this.loop),
          'large-font': !hide,
        }"
      >
        {{ changeIcon }}
      </v-icon>
    </v-btn>
    <controller-options :hide="hide" @action-clicked="changeBehavior" />
  </div>
</template>

<script>
export default {
  inject: ['store'],
  props: {
    hide: Boolean,
  },
  mounted() {
    if (this.playState === 'play') {
      this.play(true)
    }
    this.emitter.on('playAnimation', this.play)
    this.emitter.on('stopAnimation', this.playPause)
  },
  beforeUnmount() {
    // Once unmounted, component no longer sees Pinia store changes
    // Make sure to kill this loop and restart it in the new one that's been mounted
    this.killUnmountLoop = true
    this.emitter.off('playAnimation', this.play)
    this.emitter.off('stopAnimation', this.playPause)
  },
  data() {
    return {
      killUnmountLoop: false,
      locked: false,
      loop: false,
      playbackReversed: false,
      playLocked: false,
      showMenu: false,
    }
  },
  computed: {
    datetimeRangeSlider() {
      return this.store.getDatetimeRangeSlider
    },
    isAnimating() {
      return this.store.getIsAnimating
    },
    mapTimeSettings() {
      return this.store.getMapTimeSettings
    },
    pendingErrorResolution() {
      return this.store.getPendingErrorResolution
    },
    playState() {
      return this.store.getPlayState
    },

    changeIcon() {
      let replayCondition
      if (this.playbackReversed) {
        replayCondition =
          this.mapTimeSettings.DateIndex === this.datetimeRangeSlider[0]
      } else {
        replayCondition =
          this.mapTimeSettings.DateIndex === this.datetimeRangeSlider[1]
      }
      if (replayCondition && !this.loop) {
        return 'mdi-replay'
      } else if (this.playState === 'play') {
        if (this.hide) return 'mdi-pause'
        return 'mdi-pause-circle-outline'
      } else {
        if (this.hide) return 'mdi-play'
        return 'mdi-play-circle-outline'
      }
    },
  },
  methods: {
    changeBehavior(action) {
      if (action === 'Reverse') {
        this.playbackReversed = !this.playbackReversed
      } else if (action === 'Loop') {
        this.loop = !this.loop
        this.store.setIsLooping(this.loop)
      }
    },
    delay(time) {
      return new Promise((resolve) => setTimeout(resolve, time))
    },
    measurePromise(fn) {
      let onPromiseDone = () => performance.now() - start

      let start = performance.now()
      return fn().then(onPromiseDone, onPromiseDone)
    },
    playPause() {
      if (!this.locked) {
        this.locked = true
        setTimeout(this.unlock, 1000)
        if (this.playState === 'pause') {
          this.emitter.emit('changeTab')
          if (!this.playbackReversed) {
            if (
              this.mapTimeSettings.DateIndex !== this.datetimeRangeSlider[1]
            ) {
              this.store.setPlayState('play')
              this.store.setIsAnimating(true)
              this.play()
            } else {
              this.store.setMapTimeIndex(this.datetimeRangeSlider[0] - 1)
              this.store.setPlayState('play')
              this.store.setIsAnimating(true)
              this.play()
            }
          } else {
            if (
              this.mapTimeSettings.DateIndex !== this.datetimeRangeSlider[0]
            ) {
              this.store.setPlayState('play')
              this.store.setIsAnimating(true)
              this.play()
            } else {
              this.store.setMapTimeIndex(this.datetimeRangeSlider[1] + 1)
              this.store.setPlayState('play')
              this.store.setIsAnimating(true)
              this.play()
            }
          }
        } else {
          this.store.setPlayState('pause')
          this.store.setIsAnimating(false)
        }
      }
    },
    async play(restore = false) {
      if (!this.playLocked && !this.killUnmountLoop) {
        this.playLocked = true
        let r = 0
        if (!restore) {
          if (!this.playbackReversed) {
            if (this.mapTimeSettings.DateIndex < this.datetimeRangeSlider[1]) {
              this.store.setMapTimeIndex(this.mapTimeSettings.DateIndex + 1)
            } else if (this.loop) {
              this.store.setMapTimeIndex(this.datetimeRangeSlider[0])
            } else {
              this.playPause()
            }
          } else {
            if (this.mapTimeSettings.DateIndex > this.datetimeRangeSlider[0]) {
              this.store.setMapTimeIndex(this.mapTimeSettings.DateIndex - 1)
            } else if (this.loop) {
              this.store.setMapTimeIndex(this.datetimeRangeSlider[1])
            } else {
              this.playPause()
            }
          }
          // Count time it takes to finish render for play button,
          // if less than 1sec wait until it's been a second
          r = await this.measurePromise(
            () =>
              new Promise((resolve) =>
                this.$mapCanvas.mapObj.once('rendercomplete', resolve),
              ),
          )
        }
        if (!this.pendingErrorResolution && this.playState === 'play') {
          if (r < 1000) {
            await this.delay(1000 - r)
          }
          this.playLocked = false
          this.play()
        } else {
          this.playLocked = false
        }
      }
    },
    unlock() {
      this.locked = false
    },
  },
}
</script>

<style scoped>
.enable-events {
  pointer-events: auto;
}
.large-font {
  font-size: 36px !important;
}
.rotation-animation {
  transition: transform 0.3s ease-in-out !important;
}
.rotation-animation.rotated-icon {
  transform: rotate(180deg);
}
</style>
