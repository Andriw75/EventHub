/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import App from "./App.tsx";
import { Router } from "@solidjs/router";
import { AuthProvider } from "./app/context/auth.tsx";
import { WebSocketProvider } from "./app/context/web_socket.tsx";
const root = document.getElementById("root");

render(
  () => (
    <>
      <WebSocketProvider>
        <AuthProvider>
          <Router>
            <App />
          </Router>
        </AuthProvider>
      </WebSocketProvider>
    </>
  ),
  root!,
);
