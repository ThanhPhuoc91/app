import { FirebaseAnalytics } from "@capacitor-community/firebase-analytics"
import { route } from "quasar/wrappers"
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from "vue-router"

import routes from "./routes"

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default route(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === "history"
    ? createWebHistory
    : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: (to, from, saved) => saved ?? { left: 0, top: 0 },
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeResolve((to) => {
    if (!to.meta.screen) return

    const { name, override } = to.meta.screen

    if (import.meta.env.MODE !== "spa")
      FirebaseAnalytics.setScreenName({
        screenName: name,
        nameOverride: typeof override === "string" ? override : override?.(to),
      })
  })

  return Router
})
