import { useParams, useLocation } from "@solidjs/router";
import Sidebar from "./Sidebar";

import styles from "./DashboardLayout.module.css";
import { onMount } from "solid-js";
import { useAuth } from "../../context/auth";
import { useNavigate } from "@solidjs/router";
import Rifas from "../../PagesDash/Rifas/Rifas";
import { ConfirmContainer } from "../../common/UI/Confirm/confirmStore";
import ToastContainer from "../../common/UI/Toast/ToastContainer";
import Subasta from "../../PagesDash/Subasta/Subasta";
import VentaLimitada from "../../PagesDash/VentaLimitada/VentaLimitada";

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
      page = <Rifas />;
      break;
    case `/${params.person}/dashboard/events/subasta`:
      page = <Subasta />;
      break;
    case `/${params.person}/dashboard/events/venta-limitada`:
      page = <VentaLimitada />;
      break;
  }

  return (
    <>
      <ToastContainer />
      <div class={styles.wrapper}>
        <div class={styles.sidebarWrap}>
          <Sidebar />
        </div>

        <main class={styles.mainContent}>{page}</main>
      </div>
      <ConfirmContainer />
    </>
  );
};

export default DashboardLayout;
