import type { ReactNode } from "react";
import { SchedulerProvider } from "../features/bookings/store/SchedulerContext";

interface Props {
  children: ReactNode;
}

export const DashboardProviders = ({ children }: Props) => {
  return (
    <SchedulerProvider>
      {children}
    </SchedulerProvider>
  );
};
