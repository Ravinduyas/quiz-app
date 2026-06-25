import React from "react";
import { createRoot } from "react-dom/client";
import QuizForge from "../QuizForge.jsx";

// QuizForge expects a non-standard `window.storage` API (get/set returning
// { value }). Provide a localStorage-backed shim so it runs in a normal browser.
if (!window.storage) {
  window.storage = {
    async get(key) {
      const value = window.localStorage.getItem(key);
      return value == null ? null : { value };
    },
    async set(key, value) {
      window.localStorage.setItem(key, value);
    },
  };
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QuizForge />
  </React.StrictMode>
);
