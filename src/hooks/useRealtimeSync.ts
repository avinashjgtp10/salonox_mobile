import { useEffect, useMemo, useRef } from "react";
import type { Socket } from "socket.io-client";

import { fetchAppointmentsThunk } from "@/middleware/appointment/appointment.thunk";
import { fetchAttendanceOverviewThunk } from "@/middleware/attendance/attendance.thunk";
import { filterClientsThunk, fetchClientsThunk, searchClientsThunk } from "@/middleware/client/client.thunk";
import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { fetchMembershipsThunk } from "@/middleware/membership/membership.thunk";
import { fetchNotificationsThunk, fetchUnreadCountThunk } from "@/middleware/notification/notification.thunk";
import { fetchBrandsThunk, fetchInventorySummaryThunk, fetchProductsThunk } from "@/middleware/product/product.thunk";
import { fetchSalesInitThunk, fetchSalesSummaryThunk, fetchSalesThunk } from "@/middleware/sales/sales.thunk";
import { fetchServicesThunk } from "@/middleware/service/service.thunk";
import { fetchStaffThunk } from "@/middleware/staff/staff.thunk";
import {
  emitRealtimeEntityChanged,
  type RealtimeEntity,
} from "@/services/realtimeEvents";
import { realtimeSocket } from "@/services/realtimeSocket";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const REALTIME_ACTIONS = ["created", "updated", "deleted", "changed"] as const;

const EVENT_ALIASES: Record<RealtimeEntity, string[]> = {
  appointments: ["appointments", "appointment"],
  attendance: ["attendance"],
  clients: ["clients", "client"],
  clientMemberships: [
    "clientMemberships",
    "client_memberships",
    "clientMembership",
    "client_membership",
    "membershipAssignment",
    "membership_assignment",
  ],
  dashboard: ["dashboard", "statistics", "stats", "revenue", "stock", "inventory"],
  memberships: ["memberships", "membership"],
  notifications: ["notifications", "notification"],
  products: ["products", "product"],
  sales: ["sales", "sale"],
  services: ["services", "service"],
  staff: [
    "staff",
    "staffAvailability",
    "staff_availability",
    "staffSchedule",
    "staff_schedule",
    "staffBlockedTimes",
    "staff_blocked_times",
    "blockedTimes",
    "blocked_times",
    "staffLeaves",
    "staff_leaves",
    "leaves",
    "leave",
    "holiday",
    "holidays",
    "shift",
    "shifts",
    "workingHours",
    "working_hours",
  ],
};

const EXTRA_ENTITY_EVENTS: Partial<Record<RealtimeEntity, string[]>> = {
  attendance: [
    "attendance:checked-in",
    "attendance:checked-out",
    "attendance:checkedIn",
    "attendance:checkedOut",
    "attendance:check-in",
    "attendance:check-out",
    "attendance:checkIn",
    "attendance:checkOut",
    "attendance_checked_in",
    "attendance_checked_out",
    "checkin:updated",
    "checkout:updated",
  ],
};

const getEntityEvents = (entity: RealtimeEntity) =>
  [
    ...EVENT_ALIASES[entity].flatMap((name) =>
      REALTIME_ACTIONS.flatMap((action) => [
        `${name}:${action}`,
        `${name}.${action}`,
        `${name}_${action}`,
      ]),
    ),
    ...(EXTRA_ENTITY_EVENTS[entity] ?? []),
  ];

const REFRESH_DEBOUNCE_MS = 450;

export const useRealtimeSync = (isAuthenticated: boolean) => {
  const dispatch = useAppDispatch();
  const activeBranchId = useAppSelector(selectActiveBranchId);
  const appointmentQuery = useAppSelector((state) => state.appointment.query);
  const clientActiveFilter = useAppSelector((state) => state.client.activeFilter);
  const clientQuery = useAppSelector((state) => state.client.query);
  const membershipQuery = useAppSelector((state) => state.membership.query);
  const productQuery = useAppSelector((state) => state.product.query);
  const salesQuery = useAppSelector((state) => state.sales.query);
  const serviceQuery = useAppSelector((state) => state.service.query);
  const staffQuery = useAppSelector((state) => state.staff.query);
  const refreshTimersRef = useRef<Partial<Record<RealtimeEntity, ReturnType<typeof setTimeout>>>>({});
  const hasConnectedRef = useRef(false);

  const refreshEntity = useMemo(
    () => ({
      appointments: () => {
        void dispatch(fetchAppointmentsThunk({ ...appointmentQuery, refresh: true }));
        void dispatch(fetchDashboardThunk());
      },
      attendance: () => {
        void dispatch(fetchAttendanceOverviewThunk());
        void dispatch(fetchDashboardThunk());
      },
      clients: () => {
        const args = { ...clientQuery, offset: 0, refresh: true, reset: true };

        if (clientActiveFilter) {
          void dispatch(filterClientsThunk({ ...args, filter: clientActiveFilter }));
        } else if (clientQuery.search) {
          void dispatch(searchClientsThunk(args));
        } else {
          void dispatch(fetchClientsThunk(args));
        }

        void dispatch(fetchDashboardThunk());
      },
      clientMemberships: () => {
        const args = { ...clientQuery, offset: 0, refresh: true, reset: true };

        if (clientActiveFilter) {
          void dispatch(filterClientsThunk({ ...args, filter: clientActiveFilter }));
        } else if (clientQuery.search) {
          void dispatch(searchClientsThunk(args));
        } else {
          void dispatch(fetchClientsThunk(args));
        }

        void dispatch(fetchMembershipsThunk({ ...membershipQuery, refresh: true, reset: true }));
        void dispatch(fetchDashboardThunk());
      },
      dashboard: () => {
        void dispatch(fetchDashboardThunk());
        void dispatch(fetchInventorySummaryThunk());
        void dispatch(fetchSalesSummaryThunk());
      },
      memberships: () => {
        void dispatch(fetchMembershipsThunk({ ...membershipQuery, refresh: true, reset: true }));
        void dispatch(fetchDashboardThunk());
      },
      notifications: () => {
        void dispatch(fetchNotificationsThunk({ refresh: true }));
        void dispatch(fetchUnreadCountThunk());
      },
      products: () => {
        void dispatch(fetchProductsThunk({ ...productQuery, offset: 0, refresh: true, reset: true }));
        void dispatch(fetchInventorySummaryThunk());
        void dispatch(fetchBrandsThunk({ refresh: true }));
        void dispatch(fetchDashboardThunk());
      },
      sales: () => {
        void dispatch(fetchSalesInitThunk({ refresh: true }));
        void dispatch(fetchSalesThunk({ ...salesQuery, offset: 0, refresh: true, reset: true }));
        void dispatch(fetchSalesSummaryThunk());
        void dispatch(fetchDashboardThunk());
      },
      services: () => {
        void dispatch(fetchServicesThunk({ ...serviceQuery, offset: 0, refresh: true, reset: true }));
        void dispatch(fetchDashboardThunk());
      },
      staff: () => {
        void dispatch(fetchStaffThunk({ ...staffQuery, page: 1, refresh: true, reset: true }));
        void dispatch(fetchDashboardThunk());
      },
    }),
    [
      appointmentQuery,
      clientActiveFilter,
      clientQuery,
      dispatch,
      membershipQuery,
      productQuery,
      salesQuery,
      serviceQuery,
      staffQuery,
    ],
  );

  useEffect(() => {
    if (!isAuthenticated || !activeBranchId) {
      realtimeSocket.disconnect();
      return;
    }

    let isMounted = true;
    const cleanupHandlers: (() => void)[] = [];

    const scheduleRefresh = (entity: RealtimeEntity, payload?: unknown) => {
      emitRealtimeEntityChanged({ entity, payload });

      const currentTimer = refreshTimersRef.current[entity];

      if (currentTimer) {
        clearTimeout(currentTimer);
      }

      refreshTimersRef.current[entity] = setTimeout(() => {
        refreshEntity[entity]();
        delete refreshTimersRef.current[entity];
      }, REFRESH_DEBOUNCE_MS);
    };

    const bindHandler = (socket: Socket, eventName: string, handler: (...args: unknown[]) => void) => {
      socket.on(eventName, handler);
      cleanupHandlers.push(() => socket.off(eventName, handler));
    };

    void realtimeSocket.connect({ salonId: activeBranchId }).then((socket) => {
      if (!isMounted || !socket) {
        return;
      }

      (Object.keys(EVENT_ALIASES) as RealtimeEntity[]).forEach((entity) => {
        getEntityEvents(entity).forEach((eventName) => {
          bindHandler(socket, eventName, (payload) => scheduleRefresh(entity, payload));
        });
      });

      bindHandler(socket, "entity:changed", (payload) => {
        const entity = (payload as { entity?: RealtimeEntity } | undefined)?.entity;

        if (entity && entity in EVENT_ALIASES) {
          scheduleRefresh(entity, payload);
        }
      });

      // These are the actual appointment events emitted by the shared backend
      // and consumed by the Web Calendar.
      bindHandler(socket, "notification", (payload) => {
        const notification = payload as { type?: string } | undefined;
        scheduleRefresh("notifications", payload);
        if (notification?.type === "appointment") {
          scheduleRefresh("appointments", payload);
        }
      });

      bindHandler(socket, "payment_updated", (payload) => {
        scheduleRefresh("appointments", payload);
        scheduleRefresh("sales", payload);
      });

      // A reconnect means events may have been missed while offline. Replace
      // the active appointment query from the API instead of trusting cache.
      hasConnectedRef.current = socket.connected;
      bindHandler(socket, "connect", () => {
        if (hasConnectedRef.current) {
          scheduleRefresh("appointments", { reason: "socket_reconnected" });
        }
        hasConnectedRef.current = true;
      });
    });

    return () => {
      isMounted = false;
      cleanupHandlers.forEach((cleanup) => cleanup());
      Object.values(refreshTimersRef.current).forEach((timer) => {
        if (timer) {
          clearTimeout(timer);
        }
      });
      refreshTimersRef.current = {};
    };
  }, [activeBranchId, isAuthenticated, refreshEntity]);

  useEffect(() => {
    if (!isAuthenticated) {
      hasConnectedRef.current = false;
      realtimeSocket.disconnect();
    }
  }, [isAuthenticated]);
};
