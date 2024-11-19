<template>
  <v-row class="locale-selector">
    <v-col cols="9" class="pa-0">
      <v-switch
        class="locale-switch"
        color="primary"
        density="compact"
        :disabled="isAnimating && playState !== 'play'"
        v-model="timeFormat"
        hide-details
        :label="getLabel"
      ></v-switch>
    </v-col>
    <v-col cols="3" class="pa-0">
      <v-menu v-model="menu" location="top">
        <template v-slot:activator="{ props }">
          <v-btn
            icon="mdi-chevron-down"
            size="36"
            variant="text"
            v-bind="props"
            class="locale-btn"
            :disabled="isAnimating && playState !== 'play'"
          >
          </v-btn>
        </template>
        <v-container
          @click.stop
          :class="getCurrentTheme"
          class="px-3 pt-3 pb-0 locale-treeview"
        >
          <div class="content-overlay" :class="getCurrentTheme"></div>
          <v-text-field
            autofocus
            v-model="search"
            :label="$t('SearchTZ')"
            hide-details
            class="ma-0 sticky"
            :class="getCurrentTheme"
            clearable
            clear-icon="mdi-close-circle-outline"
            density="compact"
            variant="outlined"
            @input="filterOnInput()"
            @keydown.left.right.space.stop
            @click:clear="filterOnInput()"
          ></v-text-field>
          <tree-node
            v-for="node in filteredTree"
            :key="`${node.name}`"
            :node="node"
            @node-toggled="handleNodeToggle"
            @request="selectTimeZone"
          ></tree-node>
        </v-container>
        <div class="sticky-container">
          <v-tooltip location="bottom" offset-overflow>
            <template v-slot:activator="{ props }">
              <v-btn
                class="revert-button"
                icon="mdi-undo"
                @click="revertTimeZone"
                color="primary"
                fab
                variant="text"
                v-bind="props"
              >
              </v-btn>
            </template>
            <span>{{ $t('RevertTimeZone') }}</span>
          </v-tooltip>
        </div>
      </v-menu>
    </v-col>
  </v-row>
</template>

<script>
import { useI18n } from 'vue-i18n'
import { useTheme } from 'vuetify'

export default {
  inject: ['store'],
  data() {
    return {
      activateNodeCheck: false,
      closedNodes: new Set(),
      filteredTree: [],
      menu: false,
      open: [],
      search: null,
      selection: null,
      t: useI18n().t,
      timeZoneOptions: this.$ct.getAllTimezones(),
      timeZoneTree: [],
    }
  },
  mounted() {
    this.buildTimezoneTree()
    this.filteredTree.push(...this.timeZoneTree)
    const localeChoice = this.getLocale()
    if (localeChoice['use-locale'] === 'false') {
      this.store.setTimeFormat(false)
    }
    if (localeChoice['timezone'] !== null) {
      this.$timeZone.id = localeChoice['timezone']
    }
    if (localeChoice['countryCode'] !== null) {
      this.$countryCode.id = localeChoice['countryCode']
    }
  },
  methods: {
    buildTimezoneTree() {
      let timezones = {}
      const keys = Object.keys(this.timeZoneOptions)

      keys.forEach((key) => {
        if (this.timeZoneOptions[key].countries.length !== 0) {
          const utcOffsetStr = this.timeZoneOptions[key].utcOffsetStr
          const levels = this.timeZoneOptions[key].name.split('/')

          const [hours, minutes] = utcOffsetStr.split(':').map(Number)
          const num = hours < 0 ? hours * 60 - minutes : hours * 60 + minutes
          const offsetName = `UTC${utcOffsetStr}`

          if (!timezones[offsetName]) {
            timezones[offsetName] = {
              hourValue: num,
              name: offsetName,
              children: [],
            }
          }
          let currentLevel = timezones[offsetName]
          levels.forEach((level, index) => {
            if (!currentLevel.children.find((child) => child.name === level)) {
              if (index === levels.length - 1) {
                currentLevel.children.push({ name: level, value: key })
              } else {
                currentLevel.children.push({ name: level, children: [] })
              }
            }
            currentLevel = currentLevel.children.find(
              (child) => child.name === level,
            )
          })
        }
      })
      let treeItems = Object.values(timezones)
      treeItems.sort((a, b) => a.hourValue - b.hourValue)
      this.timeZoneTree = treeItems
    },
    filterCallbackFunction(array, fn) {
      return array.reduce((r, o) => {
        let children = this.filterCallbackFunction(o.children || [], fn)
        if (fn(o) || children.length) {
          r.push(
            Object.assign({}, o, children.length && { children }, {
              isOpen: this.closedNodes.has(o.Name) ? false : true,
            }),
          )
          this.open.push(o['name'])
        }
        return r
      }, [])
    },
    filterOnInput() {
      if (this.search !== null) {
        if (this.search.length > 1) {
          this.activateNodeCheck = false
          this.open = []
          this.filteredTree = this.filterCallbackFunction(
            this.timeZoneTree,
            (item) =>
              item['name'].toLowerCase().indexOf(this.search.toLowerCase()) >
              -1,
          )
        } else {
          this.activateNodeCheck = false
          this.filteredTree = this.timeZoneTree
        }
      } else {
        this.activateNodeCheck = false
        this.filteredTree = this.timeZoneTree
      }
    },
    getLocale() {
      return {
        'use-locale': localStorage.getItem('use-locale'),
        timezone: localStorage.getItem('timezone'),
        countryCode: localStorage.getItem('country-code'),
      }
    },
    handleNodeToggle(nodeName, isOpen) {
      if (this.activateNodeCheck) {
        if (!isOpen) {
          this.closedNodes.add(nodeName)
        } else {
          this.closedNodes.delete(nodeName)
        }
      } else {
        // this.closedNodes.clear();
      }
    },
    revertTimeZone() {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const country = this.$ct.getCountryForTimezone(timezone)
      this.$timeZone.id = timezone
      if (country === null) {
        this.$countryCode.id = null
      } else {
        this.$countryCode.id = country.id
      }
      localStorage.setItem('timezone', timezone)
      localStorage.setItem('country-code', this.$countryCode.id)
    },
    selectTimeZone(zone) {
      const timezone = zone.value
      this.$countryCode.id = this.$ct.getCountryForTimezone(timezone).id
      this.$timeZone.id = timezone
      localStorage.setItem('timezone', timezone)
      localStorage.setItem('country-code', this.$countryCode.id)
      this.menu = false
    },
    toggleMenu() {
      this.menu = !this.menu
    },
  },
  watch: {
    menu(newVal) {
      if (!newVal) {
        this.search = ''
        this.filterOnInput()
      }
    },
  },
  computed: {
    getCurrentTheme() {
      const theme = useTheme()
      return theme.global.current.value.dark ? 'bg-grey-darken-4' : 'bg-white'
    },
    getLabel() {
      if (this.timeFormat) return this.t('LocalTime')
      return 'UTC'
    },
    isAnimating() {
      return this.store.getIsAnimating
    },
    playState() {
      return this.store.getPlayState
    },
    timeFormat: {
      get() {
        return this.store.getTimeFormat
      },
      set(flag) {
        this.store.setTimeFormat(flag)
        localStorage.setItem('use-locale', flag)
        this.emitter.emit('calcFooterPreview')
      },
    },
  },
}
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
  top: -12px;
  margin-left: -12px;
  margin-right: -12px;
  margin-top: -12px;
  position: sticky;
  z-index: 2;
}
.locale-btn {
  transform: translate(-22px, 12px);
}
.locale-selector {
  transform: translate(18px, 6px);
}
.locale-switch {
  margin-top: 12px;
}
.locale-treeview {
  border-bottom: 1px solid;
  border-left: 1px solid;
  border-top: 1px solid;
  border-radius: 6px;
  min-width: 260px;
  max-height: 500px;
  overflow-y: auto;
}
.revert-button {
  position: absolute;
  bottom: 0;
  right: 0;
  z-index: 4;
}
.sticky {
  position: sticky;
  top: 0;
  z-index: 2;
}
</style>
