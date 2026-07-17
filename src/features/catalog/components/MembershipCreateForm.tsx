// src/features/catalog/components/MembershipCreateForm.tsx
//
// Standalone, prop-driven membership creation/edit form — extracted from
// CreateMembershipPage.tsx so it can be embedded directly in a modal (the
// Calendar's "Sell Membership" popup) as well as rendered on the routed
// Catalog page, mirroring PackageCreateForm.tsx's shape exactly.
import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Check2, ChevronDown, PersonFill } from "react-bootstrap-icons";
import type { AppDispatch } from "../../../store/store";
import { createMembershipThunk, updateMembershipThunk } from "../../../middleware/membership/membership.thunk";
import { selectMembershipsSubmitting, selectMembershipsError } from "../../../store/selectors/membership.selectors";
import { clearMembershipError } from "../../../store/membershipSlice";
import { purchaseClientMembershipThunk } from "../../../middleware/clientMembership/clientMembership.thunk";
import type { ClientSearchResult } from "../../clients/components/ClientSearchInput";
import ClientSelectorWithAdd from "../../../components/packages/ClientSelectorWithAdd";
import api from "../../../services/api/axios";
import { PaymentMethodPicker, type PaymentSplitEntry } from "../../../components/shared/PaymentMethodPicker";
import { buildMethodLabel } from "../../bookings/utils/paymentUtils";
import type { SingleMethod } from "../../bookings/types/payment.types";
import "../styles/CreateMembershipPage.scss";

const SINGLE_METHODS: SingleMethod[] = ["Cash", "Card", "UPI"];

const VALIDITY_OPTIONS = [
  { label: "1 Month",   value: "1 month"  },
  { label: "3 Months",  value: "3 months" },
  { label: "6 Months",  value: "6 months" },
  { label: "12 Months", value: "1 year"   },
  { label: "Lifetime",  value: "lifetime" },
];

const TIER_COLORS = ["#1a1a2e", "#b8860b", "#4a90d9", "#16a34a", "#8b5cf6"];
const TIER_LABELS = ["Standard", "Gold", "Diamond", "Emerald", "Platinum"];

interface Props {
  /** Existing membership id — when set, edits that membership instead of creating a new one. */
  editId?: string;
  selectedClient: ClientSearchResult | null;
  onClientChange: (client: ClientSearchResult | null) => void;
  onCancel: () => void;
  onSaved: (result: { membershipId: string; name: string }) => void;
}

const MembershipCreateForm: React.FC<Props> = ({
  editId, selectedClient, onClientChange, onCancel, onSaved,
}) => {
  const dispatch = useDispatch<AppDispatch>();

  const submitting = useSelector(selectMembershipsSubmitting);
  const apiError   = useSelector(selectMembershipsError);
  const salonId    = useSelector((s: any) => s.salon?.currentSalon?.id);

  useEffect(() => () => { dispatch(clearMembershipError()); }, [dispatch]);

  const [name,         setName]         = useState("");
  const [price,        setPrice]        = useState("");
  const [validity,     setValidity]     = useState("1 year");
  const [status,       setStatus]       = useState<"active" | "inactive">("active");
  const [bonusCredit,  setBonusCredit]  = useState("");
  const [serviceDisc,  setServiceDisc]  = useState("");
  const [productDisc,  setProductDisc]  = useState("");
  const [rpMultiplier, setRpMultiplier] = useState("0");
  const [tierColor,    setTierColor]    = useState(TIER_COLORS[0]);
  const [description,  setDescription]  = useState("");
  // Wallet redemption is services-only by default — this opts the membership's
  // pooled wallet balance into also covering products at checkout, the same
  // generic pooled-credit mechanism already used for services.
  const [appliesToProducts, setAppliesToProducts] = useState(false);
  const [errors,       setErrors]       = useState<Record<string, string>>({});

  // Only relevant for the immediate-purchase flow (selectedClient set, creating not editing).
  const [paymentMode,    setPaymentMode]    = useState<"single" | "split">("single");
  const [singleMethod,   setSingleMethod]   = useState<SingleMethod | null>(null);
  const [splitEntries,   setSplitEntries]   = useState<PaymentSplitEntry[]>([]);
  const [payMethodError, setPayMethodError] = useState(false);
  const [partialAmtInput, setPartialAmtInput] = useState("");
  const [printAfterPayment, setPrintAfterPayment] = useState(false);

  const priceNum       = parseFloat(price)       || 0;
  const bonusCreditNum = parseFloat(bonusCredit) || 0;
  const walletValue    = useMemo(() => priceNum + bonusCreditNum, [priceNum, bonusCreditNum]);
  const tierLabel      = TIER_LABELS[TIER_COLORS.indexOf(tierColor)] ?? "Premium";

  const validTillDate = useMemo(() => {
    const d = new Date();
    if      (validity === "1 month")  d.setMonth(d.getMonth() + 1);
    else if (validity === "3 months") d.setMonth(d.getMonth() + 3);
    else if (validity === "6 months") d.setMonth(d.getMonth() + 6);
    else if (validity === "1 year")   d.setFullYear(d.getFullYear() + 1);
    else if (validity === "lifetime") d.setFullYear(d.getFullYear() + 50);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }, [validity]);

  useEffect(() => {
    if (!editId) return;
    api.get(`/api/v1/memberships/${editId}`).then(res => {
      const d = res.data?.data ?? res.data;
      if (!d) return;
      setName(d.name ?? "");
      setPrice(String(d.price ?? ""));
      setValidity(d.validFor ?? "1 year");
      setDescription(d.description ?? "");
      const matchedColor = TIER_COLORS.includes(d.colour) ? d.colour : TIER_COLORS[1];
      setTierColor(matchedColor);
      setAppliesToProducts(!!d.appliesToProducts);
      try {
        const meta = JSON.parse(d.description ?? "{}");
        if (meta.bonusCredit)  setBonusCredit(String(meta.bonusCredit));
        if (meta.serviceDisc)  setServiceDisc(String(meta.serviceDisc));
        if (meta.productDisc)  setProductDisc(String(meta.productDisc));
        if (meta.rpMultiplier) setRpMultiplier(String(meta.rpMultiplier));
        if (meta.description)  setDescription(meta.description);
      } catch { /* plain text */ }
    }).catch(() => {});
  }, [editId]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim())              e.name  = "Membership name is required";
    if (!priceNum || priceNum <= 0) e.price = "Price must be greater than 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    // Immediate-purchase flow (create + pre-selected client) needs a payment
    // method before we can record the sale — same requirement as SellMembershipModal.
    const isImmediatePurchase = !editId && !!selectedClient;
    if (isImmediatePurchase) {
      if (paymentMode === "single" && !singleMethod) {
        setPayMethodError(true);
        return;
      }
      const splitTotal = splitEntries.reduce((sum, ent) => sum + (parseFloat(ent.amount) || 0), 0);
      if (paymentMode === "split" && splitTotal < walletValue) {
        setPayMethodError(true);
        return;
      }
      setPayMethodError(false);
    }
    const metaDescription = JSON.stringify({
      description,
      bonusCredit: bonusCreditNum,
      serviceDisc: parseFloat(serviceDisc) || 0,
      productDisc: parseFloat(productDisc) || 0,
      rpMultiplier: parseFloat(rpMultiplier) || 1,
    });
    const payload = {
      name: name.trim(),
      description: metaDescription,
      includedServices: [],
      sessionType: "unlimited",
      validFor: validity,
      price: priceNum,
      taxRate: undefined,
      colour: tierColor,
      enableOnlineSales: true,
      enableOnlineRedemption: true,
      termsAndConditions: undefined,
      appliesToProducts,
      // Persist client association so the drawer can display who this was created for
      ...(selectedClient ? {
        clientId:    String(selectedClient.id),
        clientName:  `${selectedClient.first_name} ${selectedClient.last_name ?? ""}`.trim(),
        clientPhone: selectedClient.phone_number || undefined,
      } : {}),
    };
    const result = editId
      ? await dispatch(updateMembershipThunk({ id: editId, data: payload }))
      : await dispatch(createMembershipThunk(payload));

    if (createMembershipThunk.fulfilled.match(result) || updateMembershipThunk.fulfilled.match(result)) {
      const savedMembership = (result as any).payload;
      const membershipId = savedMembership?.id || editId;

      if (membershipId && selectedClient) {
        // 1. Save to localStorage so the drawer can display the client immediately
        localStorage.setItem(`mem_client_${membershipId}`, JSON.stringify({
          id:    String(selectedClient.id),
          name:  `${selectedClient.first_name} ${selectedClient.last_name ?? ""}`.trim(),
          phone: selectedClient.phone_number || "",
        }));

        // 2. Create the actual ClientMembership record in the database so the
        //    New Appointment modal and client history can find it via the API.
        //    Only do this on CREATE (not on update, to avoid duplicate records).
        if (!editId) {
          const splitMap: Record<string, number> = paymentMode === "split"
            ? splitEntries.reduce((acc, ent) => {
                const amt = parseFloat(ent.amount) || 0;
                if (amt > 0) acc[ent.method] = (acc[ent.method] || 0) + amt;
                return acc;
              }, {} as Record<string, number>)
            : {};
          const methodLabel = buildMethodLabel(paymentMode, singleMethod, splitMap);
          await dispatch(purchaseClientMembershipThunk({
            clientId:       String(selectedClient.id),
            membershipId:   String(membershipId),
            membershipName: name.trim(),
            colour:         tierColor,
            totalSessions:  0,        // 0 = unlimited (wallet-based)
            pricePaid:      walletValue,
            paymentMethod:  methodLabel,
            splitDetails:   paymentMode === "split" ? splitMap : undefined,
          }));

          // Also write a mem2:P: localStorage record so the calendar shows this
          // membership even when the API has other existing records for this client.
          // The calendar merges localStorage purchases when apiItems.length > 0.
          try {
            const cid = String(selectedClient.id);
            const ref = String(membershipId);
            const sid = salonId || "g";
            const purchaseKey = `mem2:P:${sid}:${cid}:${ref}`;
            const indexKey    = `mem2:I:${sid}:${cid}`;
            localStorage.setItem(purchaseKey, JSON.stringify({
              membershipName: name.trim(),
              pricePaid:      walletValue,
              colour:         tierColor,
              membershipId:   ref,
              purchasedAt:    new Date().toISOString(),
              clientName:     `${selectedClient.first_name} ${selectedClient.last_name ?? ""}`.trim(),
              mobile:         selectedClient.phone_number || "",
              clientId:       cid,
            }));
            const idx: string[] = JSON.parse(localStorage.getItem(indexKey) || "[]");
            if (!idx.includes(ref)) { idx.push(ref); localStorage.setItem(indexKey, JSON.stringify(idx)); }
          } catch { /* ignore storage errors */ }
        }
      }

      onSaved({ membershipId: String(membershipId ?? ""), name: name.trim() });
    }
  };

  return (
    <div className="cmp">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="cmp__header">
        <div>
          <h1 className="cmp__title">{editId ? "Edit Membership" : "Create Membership"}</h1>
          <p className="cmp__subtitle">
            {editId ? "Update the details of this membership plan" : "Set up a new membership plan for your clients"}
          </p>
        </div>
      </div>

      {apiError && <div className="cmp__error-banner">{apiError}</div>}

      {/* ── Client card ──────────────────────────────────────────────────── */}
      {!editId && (
        <div className="cmp__client-card">
          <div className="cmp__client-card-head">
            <div className="cmp__client-card-label">
              <PersonFill size={13} /> Client
            </div>
            {selectedClient && (
              <button
                className="cmp__btn cmp__btn--outline cmp__btn--sm"
                onClick={() => onClientChange(null)}
              >
                Change Client
              </button>
            )}
          </div>
          {selectedClient ? (
            <div className="cmp__client-info">
              <div className="cmp__client-avatar">
                {`${selectedClient.first_name[0]}${selectedClient.last_name?.[0] ?? ""}`.toUpperCase()}
              </div>
              <div>
                <span className="cmp__client-name">
                  {`${selectedClient.first_name} ${selectedClient.last_name ?? ""}`.trim()}
                </span>
                {selectedClient.phone_number && (
                  <span className="cmp__client-phone">{selectedClient.phone_number}</span>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: "4px 0" }}>
              <ClientSelectorWithAdd onSelect={c => onClientChange(c)} placeholder="Search client by name or mobile…" />
            </div>
          )}
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="cmp__body">
        <div className="cmp__layout">

          {/* ── LEFT ────────────────────────────────────────────────────── */}
          <div className="cmp__form">

            {/* Membership Details */}
            <div className="cmp__card">
              <div className="cmp__card-head">
                <h3 className="cmp__card-title">Membership Details</h3>
              </div>
              <div className="cmp__card-body">
                <div className="cmp__grid2">

                  <div className="cmp__field">
                    <label className="cmp__label">Membership Name <span className="cmp__req">*</span></label>
                    <input
                      className={`cmp__input${errors.name ? " cmp__input--err" : ""}`}
                      placeholder="e.g. Gold Membership"
                      value={name}
                      onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: "" })); }}
                    />
                    {errors.name && <p className="cmp__err">{errors.name}</p>}
                  </div>

                  <div className="cmp__field">
                    <label className="cmp__label">Membership Price <span className="cmp__req">*</span></label>
                    <div className="cmp__pfx-wrap">
                      <span className="cmp__pfx">₹</span>
                      <input
                        type="number" min={0} step={1}
                        className={`cmp__input cmp__input--pfx${errors.price ? " cmp__input--err" : ""}`}
                        placeholder="0"
                        value={price}
                        onChange={e => { setPrice(e.target.value); setErrors(p => ({ ...p, price: "" })); }}
                        onKeyDown={(e) => { if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault(); }}
                      />
                    </div>
                    {errors.price && <p className="cmp__err">{errors.price}</p>}
                  </div>

                  <div className="cmp__field">
                    <label className="cmp__label">Validity</label>
                    <div className="cmp__sel-wrap">
                      <select className="cmp__select" value={validity} onChange={e => setValidity(e.target.value)}>
                        {VALIDITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <ChevronDown size={13} className="cmp__sel-icon" />
                    </div>
                  </div>

                  <div className="cmp__field">
                    <label className="cmp__label">Status</label>
                    <div className="cmp__pills">
                      {(["active", "inactive"] as const).map(s => (
                        <label key={s} className={`cmp__pill${status === s ? " cmp__pill--on" : ""}`}>
                          <input type="radio" hidden checked={status === s} onChange={() => setStatus(s)} />
                          <span className="cmp__pill-dot" />
                          {s === "active" ? "Active" : "Inactive"}
                        </label>
                      ))}
                    </div>
                  </div>

                </div>

                <div className="cmp__field cmp__field--mt">
                  <label className="cmp__label">Membership Tier</label>
                  <div className="cmp__tiers">
                    {TIER_COLORS.map((c, i) => (
                      <button
                        key={c} type="button"
                        className={`cmp__tier${tierColor === c ? " cmp__tier--on" : ""}`}
                        style={{ "--tc": c } as React.CSSProperties}
                        onClick={() => setTierColor(c)}
                      >
                        <span className="cmp__tier-dot" style={{ background: c }} />
                        {TIER_LABELS[i]}
                        {tierColor === c && <Check2 size={11} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Membership Benefits */}
            <div className="cmp__card">
              <div className="cmp__card-head">
                <h3 className="cmp__card-title">Membership Benefits</h3>
              </div>
              <div className="cmp__card-body">
                <div className="cmp__grid2">

                  <div className="cmp__field">
                    <label className="cmp__label">Bonus Credit</label>
                    <div className="cmp__pfx-wrap">
                      <span className="cmp__pfx">₹</span>
                      <input
                        type="number" min={0} step={100}
                        className="cmp__input cmp__input--pfx"
                        placeholder="0"
                        value={bonusCredit}
                        onChange={e => setBonusCredit(e.target.value)}
                      />
                    </div>
                    <p className="cmp__hint">Extra wallet credit on purchase</p>
                  </div>

                  <div className="cmp__field">
                    <label className="cmp__label">Total Wallet Value</label>
                    <div className="cmp__computed">
                      <span className="cmp__computed-pfx">₹</span>
                      <span className="cmp__computed-val">{walletValue.toLocaleString("en-IN")}</span>
                      <span className="cmp__computed-tag">Auto</span>
                    </div>
                  </div>

                  <div className="cmp__field">
                    <label className="cmp__label">Service Discount</label>
                    <div className="cmp__sfx-wrap">
                      <input
                        type="number" min={0} max={100} step={1}
                        className="cmp__input cmp__input--sfx"
                        placeholder="0"
                        value={serviceDisc}
                        onChange={e => setServiceDisc(e.target.value)}
                      />
                      <span className="cmp__sfx">%</span>
                    </div>
                  </div>

                  <div className="cmp__field">
                    <label className="cmp__label">Product Discount</label>
                    <div className="cmp__sfx-wrap">
                      <input
                        type="number" min={0} max={100} step={1}
                        className="cmp__input cmp__input--sfx"
                        placeholder="0"
                        value={productDisc}
                        onChange={e => setProductDisc(e.target.value)}
                      />
                      <span className="cmp__sfx">%</span>
                    </div>
                  </div>

                  <div className="cmp__field">
                    <label className="cmp__label" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={appliesToProducts}
                        onChange={e => setAppliesToProducts(e.target.checked)}
                      />
                      Redeem Wallet on Products
                    </label>
                    <p className="cmp__hint">Allow this membership's wallet balance to also be used for product purchases, not just services</p>
                  </div>

                  <div className="cmp__field">
                    <label className="cmp__label">Reward Points Multiplier</label>
                    <div className="cmp__sfx-wrap">
                      <input
                        type="number" min={1} max={10} step={0.5}
                        className="cmp__input cmp__input--sfx"
                        placeholder="1"
                        value={rpMultiplier}
                        onChange={e => setRpMultiplier(e.target.value)}
                      />
                      <span className="cmp__sfx">x</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Payment method (immediate-purchase flow only) */}
            {!editId && selectedClient && (
              <div className="cmp__card">
                <div className="cmp__card-head">
                  <h3 className="cmp__card-title">Payment Method</h3>
                </div>
                <div className="cmp__card-body">
                  <PaymentMethodPicker
                    methods={SINGLE_METHODS}
                    paymentMode={paymentMode}
                    onSetPaymentMode={setPaymentMode}
                    singleMethod={singleMethod}
                    onSetSingleMethod={(m) => { setSingleMethod(m as SingleMethod); setPayMethodError(false); }}
                    splitEntries={splitEntries}
                    onSetSplitEntries={setSplitEntries}
                    payMethodError={payMethodError}
                    totalToCollect={walletValue}
                    partialAmtInput={partialAmtInput}
                    onSetPartialAmt={setPartialAmtInput}
                    printAfterPayment={printAfterPayment}
                    onTogglePrint={setPrintAfterPayment}
                    showDueRow={false}
                    showPrintOption={false}
                  />
                </div>
              </div>
            )}

            {/* ── Actions ───────────────────────────────────────────────── */}
            <div className="cmp__form-actions">
              <button className="cmp__btn cmp__btn--outline" onClick={onCancel}>
                Cancel
              </button>
              <button className="cmp__btn cmp__btn--dark" onClick={handleSave} disabled={submitting}>
                {submitting ? "Saving…" : editId ? "Save Changes" : "Create Membership"}
              </button>
            </div>

          </div>

          {/* ── RIGHT: Preview ───────────────────────────────────────────── */}
          <div className="cmp__sidebar">
            <div className="cmp__sticky">

              {/* Membership card */}
              <div className="cmp__mc" style={{ "--mc": tierColor } as React.CSSProperties}>
                <div className="cmp__mc-header">
                  <span className="cmp__mc-tier">{tierLabel} Membership</span>
                  <span className="cmp__mc-badge">{status === "active" ? "Active" : "Inactive"}</span>
                </div>
                <p className="cmp__mc-name">{name || "Membership Name"}</p>
                <div className="cmp__mc-rows">
                  <div className="cmp__mc-row">
                    <span>Paid Amount</span>  <span>₹{priceNum.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="cmp__mc-row">
                    <span>Wallet Value</span> <span>₹{walletValue.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="cmp__mc-row">
                    <span>Used Amount</span>  <span>₹0</span>
                  </div>
                  <div className="cmp__mc-row cmp__mc-row--hi">
                    <span>Balance</span>      <span>₹{walletValue.toLocaleString("en-IN")}</span>
                  </div>
                  {parseFloat(serviceDisc) > 0 && (
                    <div className="cmp__mc-row">
                      <span>Service Discount</span>   <span>{serviceDisc}%</span>
                    </div>
                  )}
                  {parseFloat(productDisc) > 0 && (
                    <div className="cmp__mc-row">
                      <span>Product Discount</span>   <span>{productDisc}%</span>
                    </div>
                  )}
                  <div className="cmp__mc-row">
                    <span>Valid Till</span>   <span>{validTillDate}</span>
                  </div>
                </div>
                <button className="cmp__mc-renew">Renew Membership</button>
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default MembershipCreateForm;
