import { useEffect, useMemo, useState } from "react";
import Modal from "../../../components/ui/Modal";
import { Button, Input } from "../../../components/ui";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import {
  fetchCampaignByIdThunk,
  fetchCampaignContactsThunk,
  resendCampaignThunk,
} from "../../../middleware/marketing/marketing.thunk";
import { useOnce } from "../../../hooks/useOnce";
import "../styles/SendCampaignModal.scss";
import "../styles/ResendCampaignModal.scss";

interface Props {
  show: boolean;
  onClose: () => void;
  campaignId: string | number;
  campaignName: string;
  totalContacts: number;
  /** Called after a successful resend so the caller can refresh its list. */
  onResent?: () => void;
}

// Pulls the unique {{n}} slots out of an approved template's body text — the
// only thing WhatsApp allows a resend to actually change is the value that
// fills each of these, never the surrounding wording itself.
function extractVariableSlots(bodyText: string): number[] {
  const matches = bodyText.match(/\{\{(\d+)\}\}/g) ?? [];
  const unique = new Set(matches.map((m) => parseInt(m.replace(/[{}]/g, ""), 10)));
  return Array.from(unique).sort((a, b) => a - b);
}

export default function ResendCampaignModal({
  show, onClose, campaignId, campaignName, totalContacts, onResent,
}: Props) {
  const dispatch = useAppDispatch();
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const [templateBody, setTemplateBody] = useState<string>("");
  const [clientNames,  setClientNames]  = useState<string[]>([]);
  const [loadingInfo,  setLoadingInfo]  = useState(false);
  const [values,       setValues]       = useState<Record<string, string>>({});

  // Fresh load every time the modal opens for a (possibly different)
  // campaign — never carries over the previous campaign's template/values.
  useEffect(() => {
    if (!show) return;
    setTemplateBody("");
    setClientNames([]);
    setValues({});
    setLoadingInfo(true);
    (async () => {
      try {
        const [campaign, contactsPage] = await Promise.all([
          dispatch(fetchCampaignByIdThunk(campaignId)).unwrap(),
          dispatch(fetchCampaignContactsThunk({ id: campaignId, page: 1, limit: 20 })).unwrap(),
        ]);
        setTemplateBody(campaign.template_body ?? "");
        setClientNames(
          (contactsPage.contacts ?? []).map((c: any) => c.name?.trim() || c.phone)
        );
      } catch {
        showError("Failed to load the original campaign's details");
      } finally {
        setLoadingInfo(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, campaignId]);

  const slots = useMemo(() => extractVariableSlots(templateBody), [templateBody]);

  const previewText = useMemo(() => {
    if (!templateBody) return "";
    return templateBody.replace(/\{\{(\d+)\}\}/g, (_match, n) => {
      const v = values[n];
      return v && v.trim() ? v : `[Variable ${n}]`;
    });
  }, [templateBody, values]);

  const [handleResend, sending] = useOnce(async () => {
    const result = await dispatch(resendCampaignThunk({ id: campaignId, variables: values }));
    if (resendCampaignThunk.fulfilled.match(result)) {
      showSuccess(`"${campaignName}" resent to ${totalContacts.toLocaleString()} contact${totalContacts === 1 ? "" : "s"}`);
      onResent?.();
      onClose();
    } else {
      showError((result.payload as string) ?? "Failed to resend campaign");
    }
  });

  return (
    <Modal
      show={show}
      onClose={onClose}
      title="Resend Campaign"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button variant="success" loading={sending} disabled={sending || loadingInfo} onClick={handleResend}>
            ↻ Resend to {totalContacts.toLocaleString()} contact{totalContacts === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      {overlay}
      <div className="scm-body">
        <div className="scm-count">
          Resending <strong>"{campaignName}"</strong> to the same{" "}
          <strong>{totalContacts.toLocaleString()}</strong> contact{totalContacts === 1 ? "" : "s"} it originally went to.
        </div>

        {loadingInfo ? (
          <p className="scm-hint">Loading original campaign details…</p>
        ) : (
          <>
            {clientNames.length > 0 && (
              <div className="scm-field">
                <label className="scm-label">Clients (review)</label>
                <div className="rcm-client-list">
                  {clientNames.map((n, i) => <span key={i} className="rcm-client-chip">{n}</span>)}
                  {totalContacts > clientNames.length && (
                    <span className="rcm-client-chip rcm-client-chip--more">
                      +{(totalContacts - clientNames.length).toLocaleString()} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {slots.length > 0 && (
              <div className="scm-field">
                <label className="scm-label">Update Offer / Discount / Coupon</label>
                <div className="rcm-var-grid">
                  {slots.map((n) => (
                    <Input
                      key={n}
                      placeholder={`Variable ${n}`}
                      value={values[String(n)] ?? ""}
                      containerClass="mb-0"
                      onChange={(e) => setValues((prev) => ({ ...prev, [String(n)]: e.target.value }))}
                    />
                  ))}
                </div>
                <p className="scm-hint">
                  These fill the approved template's own placeholders — the wording itself can't change,
                  only these values. The original campaign is untouched; this sends as a new resend.
                </p>
              </div>
            )}

            {templateBody && (
              <div className="scm-field">
                <label className="scm-label">Message Preview</label>
                <div className="scm-wa-bubble">
                  <p>{previewText}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
