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
        proj: route.query.proj,
        grat: route.query.grat,
      }),
    },
    {
      path: "/:number(1|2|3|4)-displays",
      name: "MultiDisplay",
      component: require("@/views/MultiDisplay").default,
      props: (route) => ({
        disp: route.query.disp,
      }),
    },
    {
      path: "*",
      name: "NotFound",
      component: require("@/views/NotFound").default,
    },
  ],
});

router.beforeEach((to, from, next) => {
  // Normalize the path by removing multiple slashes
  const cleanedPath = to.path.replace(/\/\/+/g, "/");
  const cleanedFullPath = to.fullPath.replace(/\/\/+/g, "/");
  let newPath;
  if (cleanedPath === "/") {
    newPath = cleanedFullPath;
  } else {
    newPath = cleanedFullPath.replace(cleanedPath, "");
  }

  if (cleanedPath !== to.path) {
    next({ path: newPath, replace: true });
  } else {
    next();
  }
});

export default router;
