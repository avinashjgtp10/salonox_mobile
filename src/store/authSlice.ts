import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  token: localStorage.getItem("token"),
  refreshToken: localStorage.getItem("refreshToken"),
  user: null as any,
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
      const { accessToken, refreshToken } = action.payload
      state.token = accessToken
      state.refreshToken = refreshToken
      state.user = JSON.parse(atob(accessToken.split(".")[1]))
      localStorage.setItem("token", accessToken)
      localStorage.setItem("refreshToken", refreshToken)
    },

    updateToken: (state, action) => {
      state.token = action.payload
      localStorage.setItem("token", action.payload)
    },

    logout: (state) => {
      state.token = null
      state.refreshToken = null
      state.user = null
      localStorage.removeItem("token")
      localStorage.removeItem("refreshToken")
    },
  },
})

export const { login, logout, updateToken } = authSlice.actions
export default authSlice.reducer
