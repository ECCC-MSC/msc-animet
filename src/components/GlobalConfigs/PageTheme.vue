<template>
  <div id="theme">
    <v-tooltip bottom>
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          min-width="34px"
          width="34px"
          height="34px"
          class="rounded-circle"
          v-bind="attrs"
          v-on="on"
          @click="toggleThemeDarkMode"
        >
          <v-icon
            :style="{
              transform: `rotate(${$vuetify.theme.dark ? 0 : -190}deg)`,
            }"
          >
            {{ "mdi-theme-light-dark" }}
          </v-icon>
        </v-btn>
      </template>
      <span
        >{{
          $vuetify.theme.dark
            ? $t("MP4CreateLightMode")
            : $t("MP4CreateDarkMode")
        }}
      </span>
    </v-tooltip>
  </div>
</template>

<script>
export default {
  mounted() {
    const userThemeChoice = this.getTheme();
    if (userThemeChoice === null) {
      if (this.getMediaPreference()) {
        this.toggleThemeDarkMode();
      }
    } else if (userThemeChoice === "true") {
      this.toggleThemeDarkMode();
    }
  },
  methods: {
    getMediaPreference() {
      const hasDarkPreference = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      if (hasDarkPreference) {
        return true;
      } else {
        return false;
      }
    },
    getTheme() {
      return localStorage.getItem("user-theme");
    },
    toggleThemeDarkMode() {
      localStorage.setItem("user-theme", !this.$vuetify.theme.dark);
      this.$vuetify.theme.dark = !this.$vuetify.theme.dark;
    },
  },
};
</script>

<style scoped>
#theme {
  pointer-events: auto;
  z-index: 4;
}
</style>
