/* eslint-disable camelcase */
import { FirebaseAnalytics } from "@capacitor-community/firebase-analytics"
import { defineStore } from "pinia"
import { parse } from "set-cookie-parser"
import sha256 from "sha256"
import { DangNhap } from "src/apis/runs/dang-nhap"
import { i18n } from "src/boot/i18n"
import { post } from "src/logic/http"
import { computed, ref, watch } from "vue"

interface User {
  avatar?: string
  email: string // const
  name: string // const
  sex: string
  username: string
}

export const useAuthStore = defineStore(
  "auth",
  () => {
    const user_data = ref<User | null>(null)
    const token_name = ref<string | null>(null)
    const token_value = ref<string | null>(null)

    const user = computed(() => {
      if (!token_name.value || !token_value.value) return null

      return user_data.value
    })
    const uid = computed(() => {
      if (!user_data.value) return null
      return sha256(user_data.value.email + user_data.value.name)
    })
    const isLogged = computed(() => {
      return !!token_name.value && !!token_value.value && !!user_data.value
    })

    function setUser(value: User) {
      user_data.value = value
    }
    function setToken(name: string, value: string) {
      token_name.value = name
      token_value.value = value
    }
    function deleteUser() {
      user_data.value = null
    }
    function deleteToken() {
      token_name.value = null
      token_value.value = null
    }
    function setTokenByCookie(cookie: string) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const token = parse(cookie).find((item) => item.name.startsWith("token"))!
      // set token
      setToken(token.name, token.value)
      return token
    }
    // ** actions **
    async function login(email: string, password: string) {
      const data = await DangNhap(email, password)

      setUser({
        avatar: data.avatar,
        email: data.email,
        name: data.name,
        sex: data.sex,
        username: data.username,
      })

      if (import.meta.env.MODE !== "spa")
        FirebaseAnalytics.logEvent({ name: "login", params: {} })

      setTokenByCookie(data.cookie)

      return data
    }
    async function logout() {
      deleteToken()
      deleteUser()

      if (import.meta.env.MODE !== "spa")
        FirebaseAnalytics.logEvent({ name: "logout", params: {} })
    }
    async function changePassword(newPassword: string) {
      if (!user_data.value)
        // eslint-disable-next-line functional/no-throw-statement
        throw new Error(
          i18n.global.t("errors.require_login_to", [
            i18n.global.t("thay-doi-mat-khau"),
          ])
        )

      const { headers } = await post(
        "/account/info/",
        {
          "User[hoten]": user_data.value.username,
          "User[gender]": user_data.value.sex,
          "User[password]": newPassword,
          submit: "Cập nhật",
        },
        {
          cookie: `${token_name.value}=${token_value.value}`,
        }
      ).catch((res) => {
        // eslint-disable-next-line promise/no-return-wrap
        if (res.status === 302 && res.data) return Promise.resolve(res)

        // eslint-disable-next-line promise/no-return-wrap
        return Promise.reject(res)
      })

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const cookie = new Headers(headers).get("set-cookie")!
      setTokenByCookie(cookie)
    }

    // Analytics
    watch(
      user_data,
      (user_data) => {
        if (import.meta.env.MODE !== "spa")
          FirebaseAnalytics.setUserProperty({
            name: "sex",
            value: user_data?.sex ?? "unknown",
          })
      },
      { immediate: true }
    )
    watch(
      uid,
      (uid) => {
        if (import.meta.env.MODE !== "spa")
          FirebaseAnalytics.setUserId({
            userId: uid ?? (null as unknown as string),
          })
      },
      { immediate: true }
    )

    return {
      user_data,
      token_name,
      token_value,
      user,
      uid,
      isLogged,
      setUser,
      setToken,
      deleteUser,
      deleteToken,
      setTokenByCookie,
      login,
      logout,
      changePassword,
    }
  },
  {
    persist: true,
  }
)
