import { useState } from "react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { deleteInboxConversationsThunk } from "@/middleware/inbox/inbox.thunk";
import { useAppDispatch } from "@/store/hooks";

export function DeleteChatsModal({ phones, onClose, onDeleted }: {
  phones: string[]; onClose: () => void; onDeleted: () => void;
}) {
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);
  return <ConfirmationModal visible title={phones.length === 1 ? "Delete chat?" : `Delete ${phones.length} chats?`}
    description="These chats and all their messages will be permanently deleted from your salon inbox, including the web app. This cannot be undone."
    cancelLabel="Cancel" confirmLabel="Delete" error={error} onCancel={onClose}
    onConfirm={async () => {
      setError(null);
      const result = await dispatch(deleteInboxConversationsThunk(phones));
      if (deleteInboxConversationsThunk.fulfilled.match(result)) onDeleted();
      else setError(result.payload?.message ?? "Unable to delete chats. Please try again.");
    }} />;
}
