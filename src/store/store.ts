import { configureStore } from "@reduxjs/toolkit"
import authReducer from "./authSlice"
import salonReducer from "./salonSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    salon: salonReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
