import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import "../index.css";
import { MarketingApp } from "./MarketingApp";

const container = document.getElementById("root")!;
const app = (
  <BrowserRouter future={{ v7_relativeSplatPath: true }}>
    <MarketingApp />
  </BrowserRouter>
);

// Prerendered pages carry server markup to hydrate; an empty root (e.g. the
// bare template) just renders from scratch.
if (container.hasChildNodes()) hydrateRoot(container, app);
else createRoot(container).render(app);
