<template>
  <div>
    <center>
      <h1>{{ $t("NotFound") }}</h1>
      <p>
        {{ $t("NotFoundSub") }}
      </p>
      <p>
        <router-link :to="{ name: 'home' }">
          {{ $t("GoToHomePage") }}
        </router-link>
      </p>
    </center>
  </div>
</template>

<script>
export default {
  name: "NotFound",
};
</script>

<style scoped>
center {
  margin: 15vw;
}

h1 {
  color: var(--border);
  font-size: 2em;
}
</style>
