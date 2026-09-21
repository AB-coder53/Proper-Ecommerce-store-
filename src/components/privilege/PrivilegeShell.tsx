import type { ReactNode } from "react";

import "@/app/privilege/privilege.css";

export function PrivilegeShell({ children }: { children: ReactNode }) {
  return <div className="privilege-page">{children}</div>;
}
