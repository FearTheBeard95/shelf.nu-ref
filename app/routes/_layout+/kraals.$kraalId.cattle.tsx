// app/routes/kraals.$kraalId.cattle.tsx

import { Outlet } from "@remix-run/react";

export default function CattleLayout() {
  return (
    <div>
      {/* Common layout elements, e.g., headers or navigation */}
      <Outlet /> {/* Renders child routes */}
    </div>
  );
}
