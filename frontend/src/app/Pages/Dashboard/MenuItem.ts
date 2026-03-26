import type { Component } from "solid-js";
import LoadingLoop from "../../common/IconSVG/LoadingLoop";
import Events from "../../common/IconSVG/Events";
import Ticket from "../../common/IconSVG/Ticket";
import Countdown from "../../common/IconSVG/Countdown";
import Gavel from "../../common/IconSVG/Gavel";
// import Notification from "../../common/IconSvg/Notification";
// import SettingsRounded from "../../common/IconSvg/SettingsRounded";

export type MenuItem = {
  label: string;
  key: string;
  route?: string;
  component?: Component<any>;
  submenu?: MenuItem[];
  requiredPermission?: string;
  icon?: {
    component: Component<any>;
    props?: Record<string, any>;
  };
};

export const menu: MenuItem[] = [
  {
    label: "Eventos",
    key: "Eventos",
    icon: { component: Events, props: { width: "20px", height: "20px" } },
    submenu: [
      {
        label: "Rifas",
        key: "Rifas",
        route: "/:person/dashboard/events/rifas",
        icon: { component: Ticket, props: { width: "20px", height: "20px" } },
      },
      {
        label: "Subasta",
        key: "Subasta",
        route: "/:person/dashboard/events/subasta",
        icon: { component: Gavel, props: { width: "20px", height: "20px" } },
      },
      {
        label: "Venta Limitada",
        key: "VentaLimitada",
        route: "/:person/dashboard/events/venta-limitada",
        icon: {
          component: Countdown,
          props: { width: "20px", height: "20px" },
        },
      },
    ],
  },
];
