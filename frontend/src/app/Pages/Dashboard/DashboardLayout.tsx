import { type ParentComponent, createSignal, onMount } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import Sidebar from "./Sidebar";
import styles from "./DashboardLayout.module.css";
import { useAuth } from "../../context/auth";

const DashboardLayout: ParentComponent = (props) => {
  const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);
  const { user } = useAuth();
  const nav = useNavigate();
  const params = useParams();

  onMount(() => {
    if (!user() || user()?.name !== params.person) {
      nav("/login", { replace: true });
      return;
    }
  });

  return (
    <div class={styles.wrapper}>
      <div
        classList={{
          [styles.sidebarWrap]: true,
          [styles.sidebarWrapCollapsed]: sidebarCollapsed(),
        }}
      >
        <Sidebar onCollapseChange={(c) => setSidebarCollapsed(c)} />
      </div>

      <main class={styles.mainContent}>{props.children}</main>
    </div>
  );
};

export default DashboardLayout;
