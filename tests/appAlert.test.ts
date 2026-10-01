import { createAppAlertQueue } from "@/services/appAlert";

test("alerts raised together are queued instead of replacing the active confirmation", () => {
  const alerts = createAppAlertQueue();
  const confirm = jest.fn();
  alerts.alert("Delete client?", "This cannot be undone", [{ text: "Delete", style: "destructive", onPress: confirm }]);
  alerts.alert("Unable to delete", "Please try again");
  const first = alerts.getSnapshot()!;
  expect(first.title).toBe("Delete client?");
  expect(confirm).not.toHaveBeenCalled();
  const dismissed = alerts.dismiss(first.id, "action")!;
  dismissed.buttons[0].onPress?.();
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(alerts.getSnapshot()?.title).toBe("Unable to delete");
});

test("a late callback for an earlier dialog cannot dismiss the next alert", () => {
  const alerts = createAppAlertQueue();
  alerts.alert("First");
  alerts.alert("Second");
  const firstId = alerts.getSnapshot()!.id;
  alerts.dismiss(firstId, "action");
  expect(alerts.dismiss(firstId, "action")).toBeNull();
  expect(alerts.getSnapshot()?.title).toBe("Second");
});

test("noncancelable prompts cannot be dismissed by the backdrop or Android back button", () => {
  const alerts = createAppAlertQueue();
  const onDismiss = jest.fn();
  alerts.alert("Confirm attendance", "", undefined, { cancelable: false, onDismiss });
  expect(alerts.dismiss(alerts.getSnapshot()!.id, "cancel")).toBeNull();
  expect(onDismiss).not.toHaveBeenCalled();
  expect(alerts.getSnapshot()).not.toBeNull();
});

test("dismissal resolves cancelable permission flows without executing an action", () => {
  const alerts = createAppAlertQueue();
  const onDismiss = jest.fn();
  const proceed = jest.fn();
  alerts.alert("Use location?", "", [{ text: "Continue", onPress: proceed }], { cancelable: true, onDismiss });
  alerts.dismiss(alerts.getSnapshot()!.id, "cancel");
  expect(onDismiss).toHaveBeenCalledTimes(1);
  expect(proceed).not.toHaveBeenCalled();
  expect(alerts.getSnapshot()).toBeNull();
});

test("button presses don't trigger onDismiss or lose multiple photo-picker choices", () => {
  const alerts = createAppAlertQueue();
  const onDismiss = jest.fn();
  const buttons = [{ text: "Camera" }, { text: "Photos" }, { text: "Remove", style: "destructive" as const }, { text: "Cancel", style: "cancel" as const }];
  alerts.alert("Profile photo", "Choose a photo", buttons, { cancelable: true, onDismiss });
  expect(alerts.getSnapshot()?.buttons).toEqual(buttons);
  alerts.dismiss(alerts.getSnapshot()!.id, "action");
  expect(onDismiss).not.toHaveBeenCalled();
});

test("subscribers are notified of enqueue and dismissal and can unsubscribe", () => {
  const alerts = createAppAlertQueue();
  const listener = jest.fn();
  const unsubscribe = alerts.subscribe(listener);
  alerts.alert("Saved");
  expect(alerts.getSnapshot()?.buttons).toEqual([{ text: "OK" }]);
  alerts.dismiss(alerts.getSnapshot()!.id, "action");
  expect(listener).toHaveBeenCalledTimes(2);
  unsubscribe();
  alerts.alert("Other");
  expect(listener).toHaveBeenCalledTimes(2);
});
