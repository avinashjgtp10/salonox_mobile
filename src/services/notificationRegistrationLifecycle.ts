let paused = false;
const pending = new Set<Promise<unknown>>();

export const pauseNotificationRegistration = () => { paused = true; };
export const resumeNotificationRegistration = () => { paused = false; };
export const isNotificationRegistrationPaused = () => paused;
export const waitForNotificationRegistrations = () => Promise.allSettled([...pending]);

export const trackNotificationRegistration = <T>(operation: () => Promise<T>): Promise<T> => {
  if (paused) return Promise.reject(new Error("Device registration stopped during logout."));
  const task = operation();
  pending.add(task);
  void task.then(() => pending.delete(task), () => pending.delete(task));
  return task;
};
