import { createSlice } from "@reduxjs/toolkit"



const initialState = {
  token: localStorage.getItem("token"),
  refreshToken: localStorage.getItem("refreshToken"),
  user: null as any,
  isOnboardingComplete: localStorage.getItem("isOnboardingComplete") === "true",
}

if (initialState.token) {
  try {
    initialState.user = JSON.parse(atob(initialState.token.split(".")[1]))
  } catch (e) {
    console.error("Failed to parse token", e)
  }
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action) => {
      const { accessToken, refreshToken, isOnboardingComplete } = action.payload
      state.token = accessToken
      state.refreshToken = refreshToken
      state.isOnboardingComplete = !!isOnboardingComplete
      state.user = JSON.parse(atob(accessToken.split(".")[1]))
      localStorage.setItem("token", accessToken)
      localStorage.setItem("refreshToken", refreshToken)
      localStorage.setItem("isOnboardingComplete", String(!!isOnboardingComplete))
    },

    updateOnboardingStatus: (state, action) => {
      state.isOnboardingComplete = action.payload
      localStorage.setItem("isOnboardingComplete", String(action.payload))
    },

    updateToken: (state, action) => {
      state.token = action.payload
      localStorage.setItem("token", action.payload)
    },

    logout: (state) => {
      state.token = null
      state.refreshToken = null
      state.user = null
      state.isOnboardingComplete = false
      localStorage.removeItem("token")
      localStorage.removeItem("refreshToken")
      localStorage.removeItem("isOnboardingComplete")
    },
  },
})

export const { login, logout, updateToken, updateOnboardingStatus } = authSlice.actions
export default authSlice.reducer
