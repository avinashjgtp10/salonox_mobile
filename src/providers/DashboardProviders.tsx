import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export const DashboardProviders = ({ children }: Props) => {
  return <>{children}</>;
};
