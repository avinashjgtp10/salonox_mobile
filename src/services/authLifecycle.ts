import { resumeNotificationRegistration } from "@/services/notificationRegistrationLifecycle";

let userLogoutInProgress = false;

export const beginUserLogout = () => {
  userLogoutInProgress = true;
};

export const finishUserLogin = () => {
  resumeNotificationRegistration();
  userLogoutInProgress = false;
};

export const isUserLogoutInProgress = () => userLogoutInProgress;

