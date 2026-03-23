/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import App from "./App.tsx";
import { Router } from "@solidjs/router";
import { AuthProvider } from "./app/context/auth.tsx";

const root = document.getElementById("root");

render(
  () => (
    <>
      <AuthProvider>
        <Router>
          <App />
        </Router>
      </AuthProvider>
    </>
  ),
  root!,
);
