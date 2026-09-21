import type { ReactNode } from "react";

import { PrivilegeShell } from "@/components/privilege/PrivilegeShell";

export default function PrivilegeLayout({ children }: { children: ReactNode }) {
  return <PrivilegeShell>{children}</PrivilegeShell>;
}
