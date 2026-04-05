import { configureStore } from "@reduxjs/toolkit"
import authReducer    from "./authSlice"
import salonReducer   from "./salonSlice"
import clientReducer  from "./clientSlice"
import userReducer    from "./userSlice"
import staffReducer   from "./staffSlice"
import saleReducer    from "./saleSlice"
import catalogReducer from "./catalogSlice"
import calendarReducer from "./calendarSlice"
import bookingReducer from "./bookingSlice"
import settingReducer from "./settingSlice"
import appReducer     from "./appSlice"

export const store = configureStore({
  reducer: {
    auth:     authReducer,
    salon:    salonReducer,
    client:   clientReducer,
    user:     userReducer,
    staff:    staffReducer,
    sale:     saleReducer,
    catalog:  catalogReducer,
    calendar: calendarReducer,
    booking:  bookingReducer,
    setting:  settingReducer,
    app:      appReducer,
  },
})

export type RootState   = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
