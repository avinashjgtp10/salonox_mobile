import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  token: localStorage.getItem("token"),
  user: null as any,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action) => {
      state.token = action.payload
      state.user = JSON.parse(atob(action.payload.split(".")[1]))
      localStorage.setItem("token", action.payload)
    },

    logout: (state) => {
      state.token = null
      state.user = null
      localStorage.removeItem("token")
    },
  },
})

export const { login, logout } = authSlice.actions
export default authSlice.reducer
