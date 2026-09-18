import { useEffect, useState } from "react";

import {
  EARLY_ACCESS_EVENT,
  isEarlyAccessUnlocked,
  readEarlyAccessEmail,
} from "@/lib/early-access";

/** Single source of truth for early-access state, shared across the page. */
export function useEarlyAccess() {
  const [state, setState] = useState({ unlocked: false, email: "", ready: false });

  useEffect(() => {
    const sync = () =>
      setState({ unlocked: isEarlyAccessUnlocked(), email: readEarlyAccessEmail(), ready: true });
    sync();
    window.addEventListener(EARLY_ACCESS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EARLY_ACCESS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return state;
}
