<template>
  <div>
    <v-tooltip bottom>
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          @click="changeDateIndex(getAction().name)"
          icon
          medium
          color="primary"
          v-bind="attrs"
          v-on="on"
          :disabled="
            getMapTimeSettings.DateIndex ===
              datetimeRangeSlider[getAction().prevent] || isAnimating
          "
        >
          <v-icon>{{ getAction().icon }}</v-icon>
        </v-btn>
      </template>
      <span>{{ $t(getAction().translation) }}</span>
    </v-tooltip>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import { mapState } from "vuex";

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
          translation: "MapRewindBackAll",
        },
        {
          name: "previous",
          icon: "mdi-skip-previous",
          prevent: 0,
          translation: "MapRewindBackOne",
        },
        {
          name: "next",
          icon: "mdi-skip-next",
          prevent: 1,
          translation: "MapJumpForwardOne",
        },
        {
          name: "last",
          icon: "mdi-skip-forward",
          prevent: 1,
          translation: "MapJumpForwardAll",
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
