// PublicRoute.tsx
import type { JSX } from "solid-js";
import { Navigate } from "@solidjs/router";
import { useAuth } from "./app/context/auth";

export default function PublicRoute(props: { children: JSX.Element }) {
  const { user } = useAuth();
  return user() ? (
    <Navigate href={`/${user()?.name}/dashboard`} />
  ) : (
    props.children
  );
}
