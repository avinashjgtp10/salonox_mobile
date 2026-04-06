import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

import { BrowserRouter } from "react-router-dom"
import { Provider } from "react-redux"
import { store } from "./store/store"
import * as authActions from "./store/authSlice"
import { injectStore } from "./services/api/interceptors"

import "bootstrap/dist/css/bootstrap.min.css";
import './i18n'; // Inject translation engine

// Inject store into interceptors before app boots to avoid circular dependencies
injectStore(store, authActions)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
)
