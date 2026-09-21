import type { ReactNode } from "react";

import { PrivilegeShell } from "@/components/privilege/PrivilegeShell";

export default function IstefadaLayout({ children }: { children: ReactNode }) {
  return <PrivilegeShell>{children}</PrivilegeShell>;
}
