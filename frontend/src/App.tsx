import { Route, Navigate } from "@solidjs/router";
import Login from "./app/Pages/Login/Login";
import CreateAccount from "./app/Pages/CreateAccount/CreateAccount";
import PersonHome from "./app/Pages/Person/PersonHome";
import EventDetails from "./app/Pages/EventDetails/EventDetails";
import DashboardLayout from "./app/Pages/Dashboard/DashboardLayout";

export default function App() {
  return (
    <>
      <Route path="/login" component={() => <Login />} />
      <Route path="/create-account" component={() => <CreateAccount />} />
      <Route path="/:person" component={() => <PersonHome />} />
      <Route path="/:person/dashboard" component={DashboardLayout} />
      <Route
        path="/:person/dashboard/events/rifas"
        component={DashboardLayout}
      />
      <Route
        path="/:person/dashboard/events/subasta"
        component={DashboardLayout}
      />
      <Route
        path="/:person/dashboard/events/venta-limitada"
        component={DashboardLayout}
      />

      <Route path="/:person/:event" component={() => <EventDetails />} />
      <Route path="/" component={() => <Navigate href="/login" />} />
      {/* <Route path="*" component={() => <Navigate href="/login" />} /> */}
    </>
  );
}
