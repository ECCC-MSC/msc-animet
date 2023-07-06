<template>
  <div>
    <v-tooltip bottom>
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          @click="playPause()"
          icon
          x-large
          color="primary"
          :disabled="
            getMapTimeSettings.DateIndex === getDatetimeRangeSlider[1] ||
            (isAnimating && playState !== 'play')
          "
          v-bind="attrs"
          v-on="on"
        >
          <v-icon>
            {{
              playState === "play"
                ? "mdi-pause-circle-outline"
                : "mdi-play-circle-outline"
            }}
          </v-icon>
        </v-btn>
      </template>
      <span>{{ $t("MapPlay") }}</span>
    </v-tooltip>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import { mapState } from "vuex";

export default {
  mounted() {
    this.$root.$on("playAnimation", this.play);
  },
  beforeDestroy() {
    this.$root.$off("playAnimation", this.play);
  },
  computed: {
    ...mapGetters("Layers", ["getDatetimeRangeSlider", "getMapTimeSettings"]),
    ...mapState("Layers", ["isAnimating", "playState"]),
  },
  methods: {
    playPause() {
      if (this.playState === "pause") {
        this.$store.commit("Layers/setPlayState", "play");
        this.$store.commit("Layers/setIsAnimating", true);
        this.play();
      } else {
        this.$store.commit("Layers/setPlayState", "pause");
        this.$store.commit("Layers/setIsAnimating", false);
      }
    },
    play() {
      if (this.getMapTimeSettings.DateIndex < this.getDatetimeRangeSlider[1]) {
        this.$store.dispatch(
          "Layers/setMapTimeIndex",
          this.getMapTimeSettings.DateIndex + 1
        );
      } else {
        this.playPause();
      }
    },
  },
};
</script>
