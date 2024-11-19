<template>
  <v-container fluid id="global_configs">
    <v-row class="align-center ma-0 justify-space-between">
      <v-col cols="0" md="4" class="pa-0"></v-col>
      <v-col cols="12" md="4" class="pa-0 pt-2">
        <animet-logo />
      </v-col>
      <v-col
        cols="12"
        md="4"
        class="d-flex pa-0 pt-2 justify-center align-center"
      >
        <v-spacer v-if="mdAndUp"></v-spacer>
        <customization-menu class="mr-3" />
        <page-theme class="mr-3" />
        <language-select class="mr-3" />
        <perma-link class="mr-3" />
        <v-tooltip location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn
              size="34"
              class="rounded-circle info-btn"
              v-bind="props"
              :href="$t('DocumentationURL')"
              target="_blank"
            >
              <v-icon size="24">mdi-information-outline</v-icon>
            </v-btn>
          </template>
          <span>{{ $t('UserDoc') }}</span>
        </v-tooltip>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useDisplay } from 'vuetify'

const { mdAndUp } = useDisplay()
</script>

<style scoped>
.info-btn {
  pointer-events: auto;
  z-index: 4;
}
#global_configs {
  padding: 0 0.5em 0 0.5em;
  pointer-events: none !important;
  position: absolute;
}
</style>
