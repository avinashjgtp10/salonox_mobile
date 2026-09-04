export const NOTIFICATION_CHANNELS_ENDPOINTS = {
  LIST:           (salonId: string) => `/api/v1/notification-channels/${salonId}`,
  UPDATE_SMS:     (salonId: string, eventType: string) => `/api/v1/notification-channels/${salonId}/${eventType}/sms`,
  UPDATE_EMAIL:   (salonId: string, eventType: string) => `/api/v1/notification-channels/${salonId}/${eventType}/email`,
  SET_ENABLED:    (salonId: string, eventType: string, channel: "sms" | "email") =>
    `/api/v1/notification-channels/${salonId}/${eventType}/${channel}/enabled`,
  SEND_TEST:      (salonId: string, channel: "sms" | "email") =>
    `/api/v1/notification-channels/${salonId}/test/${channel}`,
};
