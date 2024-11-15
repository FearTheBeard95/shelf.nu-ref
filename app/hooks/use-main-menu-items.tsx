import Icon from "~/components/icons/icon";
import { useUserData } from "./use-user-data";
import { useUserRoleHelper } from "./user-user-role-helper";

export function useMainMenuItems() {
  const user = useUserData();
  const { isBaseOrSelfService } = useUserRoleHelper();

  let menuItemsTop = [
    {
      icon: <Icon icon="graph" />,
      to: "dashboard",
      title: "Dashboard",
    },
    {
      icon: <Icon icon="rows" />,
      to: "kraals",
      title: "Kraals",
    },
    {
      icon: <Icon icon="location" />,
      to: "locations",
      title: "Locations",
    },
    {
      icon: <Icon icon="calendar" />,
      to: "calendar",
      title: "Calendar",
    },
  ];
  let menuItemsBottom = [
    {
      icon: <Icon icon="asset-label" />,
      to: `https://www.shelf.nu/order-tags?email=${user?.email}${
        user?.firstName ? `&firstName=${user.firstName}` : ""
      }${user?.lastName ? `&lastName=${user.lastName}` : ""}`,
      title: "Asset labels",
      target: "_blank",
      isNew: true,
    },
    {
      icon: <Icon icon="scanQR" />,
      to: "scanner",
      title: "QR scanner",
      end: true,
    },
    {
      icon: <Icon icon="settings" />,
      to: "settings",
      title: "Workspace settings",
      end: true,
    },
  ];

  if (isBaseOrSelfService) {
    /** Deleting the Dashboard menu item as its not needed for self_service users. */
    const itemsToRemove = [
      "dashboard",
      "categories",
      "tags",
      "locations",
      "settings",
      "/settings/team",
    ];
    menuItemsTop = menuItemsTop.filter(
      (item) => !itemsToRemove.includes(item.to)
    );
    menuItemsBottom = menuItemsBottom.filter(
      (item) => !itemsToRemove.includes(item.to)
    );
  }

  return {
    menuItemsTop,
    menuItemsBottom,
  };
}
