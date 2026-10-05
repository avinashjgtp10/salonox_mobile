import { useId, useLayoutEffect, type ReactNode } from "react";

import { usePortalContext } from "@/components/ui/PortalProvider";

type PortalProps = {
  children: ReactNode;
};

export function Portal({ children }: PortalProps) {
  const id = useId();
  const { mount, unmount } = usePortalContext();

  useLayoutEffect(() => {
    mount(id, children);
    return () => unmount(id);
  });

  return null;
}
