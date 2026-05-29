declare module "redux-persist/integration/react" {
  import type { FC, ReactNode } from "react";
  import type { Persistor } from "redux-persist";

  interface PersistGateProps {
    persistor: Persistor;
    loading?: ReactNode;
    children?: ReactNode;
  }
  export const PersistGate: FC<PersistGateProps>;
}
