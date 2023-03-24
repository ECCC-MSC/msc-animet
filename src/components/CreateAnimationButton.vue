<template>
  <div>
    <v-tooltip top color="warning" :disabled="getMapTimeSettings.Step !== null">
      <template v-slot:activator="{ on }">
        <span v-on="on"
          ><!-- span wrap to enable tooltip on disabled btn -->
          <v-btn
            v-if="!isAnimating"
            :disabled="getMapTimeSettings.Step === null"
            block
            color="primary"
            @click="createMP4"
            class="text-none"
          >
            {{ $t("MP4CreateButtonLabel") }}
          </v-btn>
        </span>
      </template>
      <span>{{ $t("errorNoTimeLayer") }}</span>
    </v-tooltip>
    <div v-if="isAnimating">
      <v-row>
        <v-col class="d-inline-flex">
          <v-progress-linear
            :value="MP4ProgressPercent"
            height="36"
            rounded
            class="mr-3"
          >
            <strong>{{ MP4ProgressPercent }} %</strong>
          </v-progress-linear>
          <v-btn
            outlined
            elevation="0"
            color="primary"
            @click="cancelAnimation"
            class="text-none"
          >
            {{ $t("MP4CreateCancelAnimationCreation") }}
          </v-btn>
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<script>
import { mapState, mapMutations, mapGetters } from "vuex";

export default {
  computed: {
    ...mapState("Layers", [
      "animationTitle",
      "datetimeRangeSlider",
      "isAnimating",
      "MP4ProgressPercent",
    ]),
    ...mapGetters("Layers", ["getMapTimeSettings"]),
  },
  methods: {
    ...mapMutations("Layers", ["setDefaultAnimationTitle"]),
    createMP4() {
      if (this.animationTitle === "") {
        // ensure non-empty title
        this.setDefaultAnimationTitle();
      }
      this.$store.dispatch("Layers/setMP4URL", "null"); // move to createMP4 event handler
      this.$root.$emit("createMP4");
      this.$store.dispatch(
        "Layers/setOutputDate",
        this.getMapTimeSettings.Extent[this.datetimeRangeSlider[0]]
      );
    },
    cancelAnimation() {
      this.$root.$emit("cancelAnimationCreation");
    },
  },
};
</script>

<style scoped>
.create-animation-button-panel {
  height: 100px;
}
</style>
