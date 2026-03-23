import { Route, Navigate } from "@solidjs/router";
import Login from "./app/Pages/Login/Login";
import CreateAccount from "./app/Pages/CreateAccount/CreateAccount";
import PersonHome from "./app/Pages/Person/PersonHome";
// import Dashboard from "./app/Pages/Person/Dashboard";
// import EventDetails from "./app/Pages/Person/EventDetails";
import PublicRoute from "./PublicRoute";
import ProtectedRoute from "./PublicRoute";

export default function App() {
  return (
    <>
      {/* Rutas públicas */}
      <Route
        path="/login"
        component={() => (
          <PublicRoute>
            <Login />
          </PublicRoute>
        )}
      />
      <Route
        path="/create-account"
        component={() => (
          <PublicRoute>
            <CreateAccount />
          </PublicRoute>
        )}
      />

      {/* Gateway de usuario */}
      <Route path="/:person" component={() => <PersonHome />} />

      {/* Rutas protegidas */}
      <Route
        path="/:person/dashboard"
        component={() => (
          <ProtectedRoute>
            <>Dashboard</>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/:person/:event"
        component={() => (
          <ProtectedRoute>
            <>EventDetails</>
          </ProtectedRoute>
        )}
      />

      {/* Fallback */}
      <Route path="/" component={() => <Navigate href="/login" />} />
      <Route path="*" component={() => <Navigate href="/login" />} />
    </>
  );
}
