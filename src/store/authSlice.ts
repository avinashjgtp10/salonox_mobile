import { createSlice } from "@reduxjs/toolkit"

const token = localStorage.getItem("accessToken")
let user = null
if (token) {
  try {
    user = JSON.parse(atob(token.split(".")[1]))
  } catch (e) {
    user = null
  }
}

const initialState = {
  accessToken: token,
  refreshToken: localStorage.getItem("refreshToken"),
  isOnboardingComplete: localStorage.getItem("isOnboardingComplete") === "true",
  user,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action) => {
      const { accessToken, refreshToken, isOnboardingComplete } = action.payload
      
      state.accessToken = accessToken
      state.refreshToken = refreshToken
      state.isOnboardingComplete = !!isOnboardingComplete
      
      // Decode user info from accessToken
      try {
        state.user = JSON.parse(atob(accessToken.split(".")[1]))
      } catch (e) {
        state.user = null
      }
      
      localStorage.setItem("accessToken", accessToken)
      localStorage.setItem("refreshToken", refreshToken)
      localStorage.setItem("isOnboardingComplete", String(!!isOnboardingComplete))
    },

    updateOnboardingStatus: (state, action) => {
      state.isOnboardingComplete = !!action.payload
      localStorage.setItem("isOnboardingComplete", String(!!action.payload))
    },

    setAccessToken: (state, action) => {
      state.accessToken = action.payload
      localStorage.setItem("accessToken", action.payload)
    },

    logout: (state) => {
      state.accessToken = null
      state.refreshToken = null
      state.isOnboardingComplete = false
      state.user = null
      
      localStorage.clear()
    },
  },
})

export const { login, logout, updateOnboardingStatus, setAccessToken } = authSlice.actions
export default authSlice.reducer
