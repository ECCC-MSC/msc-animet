<template>
  <v-menu top offset-y nudge-top="10">
    <template v-slot:activator="{ on, attrs }">
      <v-btn
        class="controller-options"
        color="primary"
        small
        v-bind="attrs"
        v-on="on"
        icon
        :disabled="isAnimating"
      >
        <v-icon class="controller-options-icon"> mdi-cog </v-icon>
      </v-btn>
    </template>

    <v-card @click.stop class="pb-1 options-card">
      <v-card-subtitle class="pa-2">
        {{ $t("ControllerOptions") }}
      </v-card-subtitle>
      <v-switch
        v-for="action in controllerOptions"
        :key="action"
        hide-details
        class="px-3 pt-0 pb-2 mt-0"
        :input-value="action === 'Loop' ? isLooping : false"
        @change="$emit('action-clicked', action)"
      >
        <template v-slot:label>
          <span
            :class="{
              'white--text': $vuetify.theme.dark,
              'black--text': !$vuetify.theme.dark,
            }"
            >{{ $t(action) }}</span
          >
        </template>
      </v-switch>
    </v-card>
  </v-menu>
</template>

<script>
import { mapState } from "vuex";

export default {
  mounted() {
    this.$nextTick(() => {
      if (this.isLooping) {
        this.$emit("action-clicked", "Loop");
      }
    });
  },
  data() {
    return {
      controllerOptions: ["Reverse", "Loop"],
    };
  },
  computed: {
    ...mapState("Layers", ["isAnimating", "isLooping"]),
  },
};
</script>

<style scoped>
.controller-options {
  position: absolute;
  top: 8px;
}
.controller-options-icon {
  font-size: 20px !important;
}
.options-card {
  min-width: 150px;
}
</style>
