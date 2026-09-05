import { Badge } from "@/components/ui/Badge";
import { getStatusStyles } from "@/features/appointments/utils/appointmentScreenHelpers";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentStatus } from "@/types/appointment";
import { useMemo } from "react";

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const Colors = useThemeColors();
  const statusStyle = useMemo(() => getStatusStyles(Colors)[status], [Colors, status]);

  return <Badge bg={statusStyle.bg} color={statusStyle.color} label={status} size="sm" />;
}
