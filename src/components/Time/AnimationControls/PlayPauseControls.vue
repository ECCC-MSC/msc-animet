<template>
  <div>
    <v-btn
      ref="playPauseButton"
      @click="playPause()"
      icon
      color="primary"
      class="enable-events"
      :disabled="
        (isAnimating && playState !== 'play') ||
        getMapTimeSettings.Extent.length < 2
      "
    >
      <v-icon
        class="rotation-animation"
        :class="{
          'rotated-icon':
            playbackReversed &&
            (!(getMapTimeSettings.DateIndex === getDatetimeRangeSlider[0]) ||
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
import { mapGetters, mapState } from "vuex";

import ControllerOptions from "./ControllerOptions.vue";

export default {
  props: {
    hide: Boolean,
  },
  mounted() {
    if (this.playState === "play") {
      this.play(true);
    }
    this.$root.$on("playAnimation", this.play);
    this.$root.$on("stopAnimation", this.playPause);
  },
  beforeDestroy() {
    // Once unmounted, component no longer sees Vuex store changes
    // Make sure to kill this loop and restart it in the new one that's been mounted
    this.killUnmountLoop = true;
    this.$root.$off("playAnimation", this.play);
    this.$root.$off("stopAnimation", this.playPause);
  },
  components: {
    ControllerOptions,
  },
  data() {
    return {
      locked: false,
      loop: false,
      playbackReversed: false,
      playLocked: false,
      showMenu: false,
      killUnmountLoop: false,
      contextMenuActions: [{ label: this.$t("Reverse"), action: "reverse" }],
    };
  },
  computed: {
    ...mapGetters("Layers", ["getDatetimeRangeSlider", "getMapTimeSettings"]),
    ...mapState("Layers", [
      "isAnimating",
      "pendingErrorResolution",
      "playState",
    ]),
    changeIcon() {
      let replayCondition;
      if (this.playbackReversed) {
        replayCondition =
          this.getMapTimeSettings.DateIndex === this.getDatetimeRangeSlider[0];
      } else {
        replayCondition =
          this.getMapTimeSettings.DateIndex === this.getDatetimeRangeSlider[1];
      }
      if (replayCondition && !this.loop) {
        return "mdi-replay";
      } else if (this.playState === "play") {
        if (this.hide) return "mdi-pause";
        return "mdi-pause-circle-outline";
      } else {
        if (this.hide) return "mdi-play";
        return "mdi-play-circle-outline";
      }
    },
  },
  methods: {
    changeBehavior(action) {
      if (action === "Reverse") {
        this.playbackReversed = !this.playbackReversed;
      } else if (action === "Loop") {
        this.loop = !this.loop;
        this.$store.dispatch("Layers/setIsLooping", this.loop);
      }
    },
    delay(time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    },
    measurePromise(fn) {
      let onPromiseDone = () => performance.now() - start;

      let start = performance.now();
      return fn().then(onPromiseDone, onPromiseDone);
    },
    playPause() {
      if (!this.locked) {
        this.locked = true;
        setTimeout(this.unlock, 1000);
        if (this.playState === "pause") {
          this.$root.$emit("changeTab");
          if (!this.playbackReversed) {
            if (
              this.getMapTimeSettings.DateIndex !==
              this.getDatetimeRangeSlider[1]
            ) {
              this.$store.commit("Layers/setPlayState", "play");
              this.$store.commit("Layers/setIsAnimating", true);
              this.play();
            } else {
              this.$store.dispatch(
                "Layers/setMapTimeIndex",
                this.getDatetimeRangeSlider[0] - 1
              );
              this.$store.commit("Layers/setPlayState", "play");
              this.$store.commit("Layers/setIsAnimating", true);
              this.play();
            }
          } else {
            if (
              this.getMapTimeSettings.DateIndex !==
              this.getDatetimeRangeSlider[0]
            ) {
              this.$store.commit("Layers/setPlayState", "play");
              this.$store.commit("Layers/setIsAnimating", true);
              this.play();
            } else {
              this.$store.dispatch(
                "Layers/setMapTimeIndex",
                this.getDatetimeRangeSlider[1] + 1
              );
              this.$store.commit("Layers/setPlayState", "play");
              this.$store.commit("Layers/setIsAnimating", true);
              this.play();
            }
          }
        } else {
          this.$store.commit("Layers/setPlayState", "pause");
          this.$store.commit("Layers/setIsAnimating", false);
        }
      }
    },
    async play(restore = false) {
      if (!this.playLocked && !this.killUnmountLoop) {
        this.playLocked = true;
        let r = 0;
        if (!restore) {
          if (!this.playbackReversed) {
            if (
              this.getMapTimeSettings.DateIndex < this.getDatetimeRangeSlider[1]
            ) {
              this.$store.dispatch(
                "Layers/setMapTimeIndex",
                this.getMapTimeSettings.DateIndex + 1
              );
            } else if (this.loop) {
              this.$store.dispatch(
                "Layers/setMapTimeIndex",
                this.getDatetimeRangeSlider[0]
              );
            } else {
              this.playPause();
            }
          } else {
            if (
              this.getMapTimeSettings.DateIndex > this.getDatetimeRangeSlider[0]
            ) {
              this.$store.dispatch(
                "Layers/setMapTimeIndex",
                this.getMapTimeSettings.DateIndex - 1
              );
            } else if (this.loop) {
              this.$store.dispatch(
                "Layers/setMapTimeIndex",
                this.getDatetimeRangeSlider[1]
              );
            } else {
              this.playPause();
            }
          }
          // Count time it takes to finish render for play button,
          // if less than 1sec wait until it's been a second
          r = await this.measurePromise(
            () =>
              new Promise((resolve) =>
                this.$mapCanvas.mapObj.once("rendercomplete", resolve)
              )
          );
        }
        if (!this.pendingErrorResolution && this.playState === "play") {
          if (r < 1000) {
            await this.delay(1000 - r);
          }
          this.playLocked = false;
          this.play();
        } else {
          this.playLocked = false;
        }
      }
    },
    unlock() {
      this.locked = false;
    },
  },
};
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
