import { configureStore } from "@reduxjs/toolkit"
import authReducer   from "./authSlice"
import salonReducer  from "./salonSlice"
import clientReducer from "./clientSlice"
import userReducer   from "./userSlice"

export const store = configureStore({
  reducer: {
    auth:   authReducer,
    salon:  salonReducer,
    client: clientReducer,
    user:   userReducer,
  },
})

export type RootState   = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
