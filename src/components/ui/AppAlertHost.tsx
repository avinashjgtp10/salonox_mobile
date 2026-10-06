import { useSyncExternalStore } from "react";
import { appAlert } from "@/services/appAlert";
import { ConfirmationModal } from "./ConfirmationModal";

export function AppAlertHost() {
  const request = useSyncExternalStore(appAlert.subscribe, appAlert.getSnapshot, appAlert.getSnapshot);
  if (!request) return null;
  const cancel = () => { appAlert.dismiss(request.id, "cancel"); };
  return <ConfirmationModal
    key={request.id}
    visible
    title={request.title}
    description={request.message}
    cancelable={Boolean(request.options?.cancelable)}
    cancelLabel="Cancel"
    confirmLabel="OK"
    onCancel={cancel}
    onConfirm={() => undefined}
    actions={request.buttons.map(button => ({
      label: button.text ?? "OK",
      variant: button.style ?? "default",
      onPress: () => {
        if (appAlert.dismiss(request.id, "action")) return button.onPress?.();
      },
    }))}
  />;
}
