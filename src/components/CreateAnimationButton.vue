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
        this.getAnimationDateTitle(this.getMapTimeSettings.Step)
      );
    },
    cancelAnimation() {
      this.$root.$emit("cancelAnimationCreation");
    },
    getAnimationDateTitle(interval) {
      const firstDate =
        this.getMapTimeSettings.Extent[this.datetimeRangeSlider[0]];
      const lastDate =
        this.getMapTimeSettings.Extent[this.datetimeRangeSlider[1]];
      if (interval === "P1Y") {
        return `${firstDate.getFullYear()}-${lastDate.getFullYear()}`;
      } else if (interval === "P1M") {
        let firstMonth = firstDate.getMonth() + 1;
        let lastMonth = lastDate.getMonth() + 1;
        if (firstMonth < 10) {
          firstMonth = "0" + firstMonth;
        }
        if (lastMonth < 10) {
          lastMonth = "0" + lastMonth;
        }
        let firstYear = firstDate.getFullYear();
        let lastYear = lastDate.getFullYear();
        return `${firstYear}${firstMonth}-${lastYear}${lastMonth}`;
      }
      return (
        firstDate.toISOString().split(".")[0] +
        "Z" +
        "-" +
        lastDate.toISOString().split(".")[0] +
        "Z"
      );
    },
  },
};
</script>

<style scoped>
.create-animation-button-panel {
  height: 100px;
}
</style>
