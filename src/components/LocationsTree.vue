<template>
  <v-row class="mx-12">
    <v-expansion-panels v-model="expandTreePanel">
      <v-expansion-panel>
        <v-expansion-panel-header>
          {{ $t("LocationsSearchTitle") }}
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <v-text-field
            v-model="searchLocations"
            class="my-2"
            :label="$t('LocationsSearchLabel')"
            rounded
            filled
            hide-details
          >
          </v-text-field>
          <v-treeview
            :items="getLocations"
            :open.sync="openedLevels"
            item-key="Name"
            :filter="filter"
            :search="searchLocations"
            rounded
            dense
            open-on-click
            activatable
            hoverable
            class="overflow-y-auto overflow-x-auto"
            id="treeviewStyle"
            ref="tree"
          >
            <template v-slot:prepend="{ item }">
              <v-container @click="goToLocation(item)" fluid>
                <h3 v-if="item.children" class="text-wrap">{{ item.Title }}</h3>
                <v-tooltip
                  v-if="!item.children"
                  right
                  color="light-blue"
                  nudge-right="45"
                >
                  <template v-slot:activator="{ on, attrs }">
                    <v-container fluid class="fill-width">
                      <v-row v-bind="attrs" v-on="on" align="center">
                        <v-col cols="2" class="d-flex justify-center">
                          <v-btn
                            x-large
                            color="white"
                            icon
                            :disabled="added.includes(item.Name)"
                          >
                            <v-icon color="primary"> mdi-plus </v-icon>
                          </v-btn>
                        </v-col>
                        <v-col cols="6">
                          <h4 class="text-wrap">{{ item.Title }}</h4>
                        </v-col>
                        <v-col cols="4">
                          <h4 class="grey--text">({{ item.Name }})</h4>
                        </v-col>
                      </v-row>
                    </v-container>
                  </template>
                  <span>
                    <h4 v-if="!item.children" id="itemExtent">
                      {{ item.Extent }}
                    </h4>
                  </span>
                </v-tooltip>
              </v-container>
            </template>
          </v-treeview>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-row>
</template>

<script>
import { mapGetters } from "vuex";

export default {
  mounted() {},
  data() {
    return {
      openedLevels: [],
      searchLocations: null,
      expandTreePanel: null,
    };
  },
  methods: {
    goToLocation(location) {
      if (location.isLeaf) {
        this.$root.$emit("goToExtent", location.Extent);
      }
    },
  },
  computed: {
    ...mapGetters("Layers", ["getLocations"]),
    filter() {
      return (item, search) =>
        item["Title"].toLowerCase().indexOf(search.toLowerCase()) > -1 ||
        item["Name"].toLowerCase().indexOf(search.toLowerCase()) > -1;
    },
    added() {
      return this.getLocations.map((o) => o.Name);
    },
  },
};
</script>

<style scoped>
#treeviewStyle {
  max-height: 700px;
  max-width: 100%;
}

#itemExtent {
  max-width: 200px;
}
</style>
