let userLogoutInProgress = false;

export const beginUserLogout = () => {
  userLogoutInProgress = true;
};

export const finishUserLogin = () => {
  userLogoutInProgress = false;
};

export const isUserLogoutInProgress = () => userLogoutInProgress;

