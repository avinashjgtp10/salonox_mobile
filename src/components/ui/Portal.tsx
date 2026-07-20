import { useId, useLayoutEffect, type ReactNode } from "react";

import { usePortalContext } from "@/components/ui/PortalProvider";

type PortalProps = {
  children: ReactNode;
};

// Re-registers on every render (no dependency array) so the root-level
// output always reflects this render's latest children — matches how the
// element would have re-rendered in place if it weren't being teleported.
export function Portal({ children }: PortalProps) {
  const id = useId();
  const { mount, unmount } = usePortalContext();

  useLayoutEffect(() => {
    mount(id, children);
    return () => unmount(id);
  });

  return null;
}
