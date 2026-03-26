import type { Component } from "solid-js";
import LoadingLoop from "../../common/IconSVG/LoadingLoop";
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
  // {
  //   label: "Auto-Respuestas",
  //   key: "MenPredeter",
  //   route: "/dashboard/auto-respuestas",
  //   icon: { component: LoadingLoop, props: { width: "20px", height: "20px" } },
  // },
  // {
  //   label: "Pendientes",
  //   key: "MenPendi",
  //   route: "/dashboard/pendientes",
  //   icon: { component: LoadingLoop, props: { width: "20px", height: "20px" } },
  // },
  // {
  //   label: "Ajustes",
  //   key: "MenConfig",
  //   icon: {
  //     component: LoadingLoop,
  //     props: { width: "20px", height: "20px" },
  //   },
  //   submenu: [
  //     {
  //       label: "Algo",
  //       key: "Key",
  //       icon: {
  //         component: LoadingLoop,
  //         props: { width: "20px", height: "20px" },
  //       },
  //       route: "/dashboard/config",
  //     },
  //   ],
  // },
];
