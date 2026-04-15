import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter as Router } from "react-router-dom";
import { DDragonProvider } from "./context/DDragonContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <Router>
    <DDragonProvider>
      <App />
    </DDragonProvider>
  </Router>
);
