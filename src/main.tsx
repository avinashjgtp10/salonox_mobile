import ReactDOM from "react-dom/client";
import App from "./App";

import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./store/store";
import * as authActions from "./store/authSlice";
import { injectStore } from "./services/api/interceptors";

import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import "./i18n"; // Inject translation engine

// Inject store into interceptors before app boots to avoid circular dependencies
injectStore(store, authActions);

// Prevent accidental value changes when scrolling over a focused number input —
// the browser's native spinner responds to wheel events on focus, which fights page scroll.
document.addEventListener(
  "wheel",
  () => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement && active.type === "number") {
      active.blur();
    }
  },
  { passive: true },
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </PersistGate>
  </Provider>,
);
