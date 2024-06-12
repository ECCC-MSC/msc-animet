<template>
  <v-row class="locale-selector">
    <v-col cols="9" class="pa-0">
      <v-switch
        class="locale-switch"
        :disabled="isAnimating && playState !== 'play'"
        v-model="timeFormat"
        hide-details
        :label="getLabel"
      ></v-switch>
    </v-col>
    <v-col cols="3" class="pa-0">
      <v-menu v-model="menu">
        <template #activator="{ on }">
          <v-btn icon v-on="on" class="locale-btn">
            <v-icon>mdi-chevron-down</v-icon>
          </v-btn>
        </template>
        <v-container @click.stop :class="getCurrentTheme">
          <div class="content-overlay" :class="getCurrentTheme"></div>
          <v-text-field
            autofocus
            dense
            v-model="search"
            :label="$t('SearchTZ')"
            filled
            outlined
            hide-details
            class="ma-0 sticky"
            :class="getCurrentTheme"
            clearable
            clear-icon="mdi-close-circle-outline"
            @input="filterOnInput()"
          ></v-text-field>
          <v-treeview
            :items="filteredTree"
            item-key="name"
            activatable
            dense
            hoverable
            open-on-click
            ref="locale-tree"
            return-object
            :open="open"
            @update:active="selectTimeZone"
          >
          </v-treeview>
        </v-container>
        <div class="sticky-container">
          <v-tooltip bottom offset-overflow>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                class="revert-button"
                icon
                @click="revertTimeZone"
                color="primary"
                fab
                v-bind="attrs"
                v-on="on"
              >
                <v-icon>mdi-undo</v-icon>
              </v-btn>
            </template>
            <span>{{ $t("RevertTimeZone") }}</span>
          </v-tooltip>
        </div>
      </v-menu>
    </v-col>
  </v-row>
</template>

<script>
import { mapGetters, mapState } from "vuex";

export default {
  data() {
    return {
      filteredTree: [],
      menu: false,
      open: [],
      search: null,
      selection: null,
      timeZoneOptions: this.$ct.getAllTimezones(),
      timeZoneTree: [],
    };
  },
  mounted() {
    this.buildTimezoneTree();
    this.filteredTree.push(...this.timeZoneTree);
    const localeChoice = this.getLocale();
    if (localeChoice["use-locale"] === "false") {
      this.$store.dispatch("Layers/setTimeFormat", false);
    }
    if (localeChoice["timezone"] !== null) {
      this.$timeZone.id = localeChoice["timezone"];
    }
    if (localeChoice["countryCode"] !== null) {
      this.$countryCode.id = localeChoice["countryCode"];
    }
  },
  methods: {
    buildTimezoneTree() {
      let timezones = {};
      const keys = Object.keys(this.timeZoneOptions);

      keys.forEach((key) => {
        if (this.timeZoneOptions[key].countries.length !== 0) {
          const utcOffsetStr = this.timeZoneOptions[key].utcOffsetStr;
          const levels = this.timeZoneOptions[key].name.split("/");

          const [hours, minutes] = utcOffsetStr.split(":").map(Number);
          const num = hours < 0 ? hours * 60 - minutes : hours * 60 + minutes;
          const offsetName = `UTC${utcOffsetStr}`;

          if (!timezones[offsetName]) {
            timezones[offsetName] = {
              hourValue: num,
              name: offsetName,
              children: [],
            };
          }
          let currentLevel = timezones[offsetName];
          levels.forEach((level, index) => {
            if (!currentLevel.children.find((child) => child.name === level)) {
              if (index === levels.length - 1) {
                currentLevel.children.push({ name: level, value: key });
              } else {
                currentLevel.children.push({ name: level, children: [] });
              }
            }
            currentLevel = currentLevel.children.find(
              (child) => child.name === level
            );
          });
        }
      });
      let treeItems = Object.values(timezones);
      treeItems.sort((a, b) => a.hourValue - b.hourValue);
      this.timeZoneTree = treeItems;
    },
    filterCallbackFunction(array, fn) {
      return array.reduce((r, o) => {
        let children = this.filterCallbackFunction(o.children || [], fn);
        if (fn(o) || children.length) {
          r.push(Object.assign({}, o, children.length && { children }));
          this.open.push(o["name"]);
        }
        return r;
      }, []);
    },
    filterOnInput() {
      if (this.search !== null) {
        if (this.search.length > 1) {
          this.open = [];
          this.filteredTree = this.filterCallbackFunction(
            this.timeZoneTree,
            (item) =>
              item["name"].toLowerCase().indexOf(this.search.toLowerCase()) > -1
          );
          this.$nextTick(() => {
            this.$refs["locale-tree"].updateAll(true);
          });
        } else {
          this.filteredTree = this.timeZoneTree;
          this.$refs["locale-tree"].updateAll(false);
        }
      } else {
        this.filteredTree = this.timeZoneTree;
        this.$refs["locale-tree"].updateAll(false);
      }
    },
    getLocale() {
      return {
        "use-locale": localStorage.getItem("use-locale"),
        timezone: localStorage.getItem("timezone"),
        countryCode: localStorage.getItem("country-code"),
      };
    },
    revertTimeZone() {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const country = this.$ct.getCountryForTimezone(timezone);
      this.$timeZone.id = timezone;
      if (country === null) {
        this.$countryCode.id = null;
      } else {
        this.$countryCode.id = country.id;
      }
      localStorage.setItem("timezone", timezone);
      localStorage.setItem("country-code", this.$countryCode.id);
    },
    selectTimeZone(zone) {
      const timezone = zone[0].value;
      this.$countryCode.id = this.$ct.getCountryForTimezone(timezone).id;
      this.$timeZone.id = timezone;
      localStorage.setItem("timezone", timezone);
      localStorage.setItem("country-code", this.$countryCode.id);
      this.menu = false;
    },
    toggleMenu() {
      this.menu = !this.menu;
    },
  },
  watch: {
    menu(newVal) {
      if (!newVal) {
        this.search = "";
        this.filterOnInput();
      }
    },
  },
  computed: {
    ...mapGetters("Layers", ["getTimeFormat"]),
    ...mapState("Layers", ["isAnimating", "playState"]),
    getCurrentTheme() {
      return {
        "grey darken-4 white--text": this.$vuetify.theme.dark,
        "white black--text": !this.$vuetify.theme.dark,
      };
    },
    getLabel() {
      if (this.timeFormat) return this.$t("LocalTime");
      return "UTC";
    },
    timeFormat: {
      get() {
        return this.getTimeFormat;
      },
      set(flag) {
        this.$store.dispatch("Layers/setTimeFormat", flag);
        localStorage.setItem("use-locale", flag);
        this.$root.$emit("calcFooterPreview");
      },
    },
  },
};
</script>

<style scoped>
.sticky-container {
  bottom: 0;
  height: 0;
  position: sticky;
}
.content-overlay {
  height: 12px;
  left: 0;
  right: 0;
  top: 0;
  margin-left: -12px;
  margin-right: -12px;
  margin-top: -12px;
  position: sticky;
  z-index: 2;
}
.locale-btn {
  transform: translate(-16px, 6px);
}
.locale-selector {
  transform: translate(12px, 12px);
}
.locale-switch {
  margin-top: 10px;
}
.locale-switch::v-deep .v-input--selection-controls__ripple {
  z-index: 4;
}
.revert-button {
  position: absolute;
  bottom: 0;
  right: 0;
  z-index: 4;
}
.sticky {
  position: sticky;
  top: 12px;
  z-index: 2;
}
.v-menu__content {
  min-width: 260px;
  max-height: 500px;
  overflow-y: auto;
}
</style>
