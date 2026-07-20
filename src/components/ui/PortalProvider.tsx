import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

type PortalContextValue = {
  mount: (id: string, node: ReactNode) => void;
  unmount: (id: string) => void;
};

const PortalContext = createContext<PortalContextValue | null>(null);

// Mounted once at the app root (sibling of the root <Stack>, same level as
// SimpleSplash) so anything registered here paints above every screen,
// including the bottom tab bar — a screen-local overlay can't reach that far
// since the tab bar is a sibling outside any individual screen's subtree.
export function PortalProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<Record<string, ReactNode>>({});

  const mount = useCallback((id: string, node: ReactNode) => {
    setNodes((current) => ({ ...current, [id]: node }));
  }, []);

  const unmount = useCallback((id: string) => {
    setNodes((current) => {
      if (!(id in current)) {
        return current;
      }

      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const contextValue = useMemo(() => ({ mount, unmount }), [mount, unmount]);
  const entries = Object.entries(nodes);

  return (
    <PortalContext.Provider value={contextValue}>
      {children}
      {entries.length > 0 ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
          {entries.map(([id, node]) => (
            <View key={id} pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
              {node}
            </View>
          ))}
        </View>
      ) : null}
    </PortalContext.Provider>
  );
}

export function usePortalContext() {
  const context = useContext(PortalContext);

  if (!context) {
    throw new Error("Portal components must be rendered within a PortalProvider.");
  }

  return context;
}
