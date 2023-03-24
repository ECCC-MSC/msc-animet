<template>
  <v-container fluid>
    <v-row justify="center" align="center">
      <v-subheader>{{ $t("MP4CreateProgressLabel") }}</v-subheader>
      <v-progress-circular color="primary" indeterminate height="40">
      </v-progress-circular>
    </v-row>
  </v-container>
</template>

<script>
export default {
  //
}
</script>