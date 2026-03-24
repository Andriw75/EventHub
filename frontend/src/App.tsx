import { Route, Navigate } from "@solidjs/router";
import Login from "./app/Pages/Login/Login";
import CreateAccount from "./app/Pages/CreateAccount/CreateAccount";
import PersonHome from "./app/Pages/Person/PersonHome";
import Dashboard from "./app/Pages/Dashboard/Dashboard";

export default function App() {
  return (
    <>
      <Route path="/login" component={() => <Login />} />
      <Route path="/create-account" component={() => <CreateAccount />} />

      <Route path="/:person" component={() => <PersonHome />} />

      <Route path="/:person/dashboard" component={() => <Dashboard />} />
      <Route path="/:person/:event" component={() => <>EventDetails</>} />

      <Route path="/" component={() => <Navigate href="/login" />} />
      <Route path="*" component={() => <Navigate href="/login" />} />
    </>
  );
}
