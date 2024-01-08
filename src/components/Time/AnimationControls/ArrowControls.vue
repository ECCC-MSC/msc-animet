<template>
  <div>
    <v-btn
      @click="changeDateIndex(getAction().name)"
      icon
      medium
      color="primary"
      :disabled="
        getMapTimeSettings.DateIndex ===
          datetimeRangeSlider[getAction().prevent] || isAnimating
      "
    >
      <v-icon>{{ getAction().icon }}</v-icon>
    </v-btn>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";

export default {
  props: {
    action: {
      type: String,
      required: true,
      validator: function (value) {
        return ["first", "previous", "next", "last"].includes(value);
      },
    },
  },
  data() {
    return {
      items: [
        {
          name: "first",
          icon: "mdi-skip-backward",
          prevent: 0,
        },
        {
          name: "previous",
          icon: "mdi-skip-previous",
          prevent: 0,
        },
        {
          name: "next",
          icon: "mdi-skip-next",
          prevent: 1,
        },
        {
          name: "last",
          icon: "mdi-skip-forward",
          prevent: 1,
        },
      ],
    };
  },
  computed: {
    ...mapGetters("Layers", ["getMapTimeSettings"]),
    ...mapState("Layers", ["datetimeRangeSlider", "isAnimating"]),
  },
  methods: {
    changeDateIndex(actionName) {
      this.$root.$emit("changeTab");
      switch (actionName) {
        case "first":
          if (this.getMapTimeSettings.DateIndex > this.datetimeRangeSlider[0]) {
            this.$store.dispatch(
              "Layers/setMapTimeIndex",
              this.datetimeRangeSlider[0]
            );
          }
          break;
        case "previous":
          if (this.getMapTimeSettings.DateIndex > this.datetimeRangeSlider[0]) {
            this.$store.dispatch(
              "Layers/setMapTimeIndex",
              this.getMapTimeSettings.DateIndex - 1
            );
          }
          break;
        case "next":
          if (this.getMapTimeSettings.DateIndex < this.datetimeRangeSlider[1]) {
            this.$store.dispatch(
              "Layers/setMapTimeIndex",
              this.getMapTimeSettings.DateIndex + 1
            );
          }
          break;
        case "last":
          if (this.getMapTimeSettings.DateIndex < this.datetimeRangeSlider[1]) {
            this.$store.dispatch(
              "Layers/setMapTimeIndex",
              this.datetimeRangeSlider[1]
            );
          }
          break;
      }
    },
    getAction() {
      return this.items.filter((action) => action.name === this.action)[0];
    },
  },
};
</script>
