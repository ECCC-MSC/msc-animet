import Vue from "vue";
import Router from "vue-router";

Vue.use(Router);

const router = new Router({
  mode: "history",
  base: process.env.BASE_URL,
  routes: [
    {
      path: "/",
      name: "home",
      component: require("@/views/Home").default,
      props: (route) => ({
        layers: route.query.layers,
        extent: route.query.extent,
        color: route.query.color,
        basemap: route.query.basemap,
        hide: route.query.hide,
      }),
    },
  ],
});

export default router;
