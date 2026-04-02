import type { ReactNode } from "react";
import { AuthProvider } from "../features/bookings/context/AuthContext";
import { SchedulerProvider } from "../features/bookings/store/SchedulerContext";

interface Props {
  children: ReactNode;
}

export const DashboardProviders = ({ children }: Props) => {
  return (
    <AuthProvider>
      <SchedulerProvider>
        {children}
      </SchedulerProvider>
    </AuthProvider>
  );
};
