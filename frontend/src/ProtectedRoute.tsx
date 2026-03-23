import type { JSX } from "solid-js";
import { Navigate } from "@solidjs/router";
import { useAuth } from "./app/context/auth";

export default function ProtectedRoute(props: { children: JSX.Element }) {
  const { user } = useAuth();
  return !user() ? <Navigate href="/login" /> : props.children;
}
