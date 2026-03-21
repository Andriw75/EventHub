import { Route, Navigate } from "@solidjs/router";
import Login from "./app/Pages/Login/Login";
import CreateAccount from "./app/Pages/CreateAccount/CreateAccount";
import Person from "./app/Pages/Person/Person";

function App() {
  return (
    <>
      <Route path="/" component={() => <Navigate href="/login" />} />

      <Route path="/login" component={Login} />
      <Route path="/create-account" component={CreateAccount} />
      <Route path="/:person" component={Person} />
    </>
  );
}

export default App;
