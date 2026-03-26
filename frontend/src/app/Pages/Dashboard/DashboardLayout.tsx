import { useParams, useLocation } from "@solidjs/router";
import Sidebar from "./Sidebar";

import styles from "./DashboardLayout.module.css";
import { onMount } from "solid-js";
import { useAuth } from "../../context/auth";
import { useNavigate } from "@solidjs/router";

const DashboardLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const path = location.pathname;

  onMount(() => {
    const _user = user();
    if (!_user) {
      navigate("/login");
    }
  });

  let page;
  switch (path) {
    case `/${params.person}/dashboard/events/rifas`:
      page = <>Rifas</>;
      break;
    case `/${params.person}/dashboard/events/subasta`:
      page = <>subasta</>;
      break;
    case `/${params.person}/dashboard/events/venta-limitada`:
      page = <>venta-limitada</>;
      break;
  }

  return (
    <div class={styles.wrapper}>
      <div class={styles.sidebarWrap}>
        <Sidebar />
      </div>

      <main class={styles.mainContent}>{page}</main>
    </div>
  );
};

export default DashboardLayout;
