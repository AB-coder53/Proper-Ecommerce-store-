import type { ReactNode } from "react";

import { AnalyticsTracker } from "@/components/site/AnalyticsTracker";
import "@/app/privilege/privilege.css";

export function PrivilegeShell({ children }: { children: ReactNode }) {
  return (
    <div className="privilege-page">
      <AnalyticsTracker />
      {children}
    </div>
  );
}
