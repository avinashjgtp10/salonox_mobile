// A message for the next login screen, set just before an automatic sign-out
// (e.g. a staff member whose salon's subscription has ended). Read once, then cleared.
export type LoginNotice = { message: string; title: string };

let pendingNotice: LoginNotice | null = null;

export const setLoginNotice = (notice: LoginNotice) => {
  pendingNotice = notice;
};

export const takeLoginNotice = (): LoginNotice | null => {
  const notice = pendingNotice;
  pendingNotice = null;
  return notice;
};

export const SUBSCRIPTION_ENDED_NOTICE: LoginNotice = {
  message: "Your salon's subscription has ended. Please contact your salon owner to renew.",
  title: "Subscription ended",
};
