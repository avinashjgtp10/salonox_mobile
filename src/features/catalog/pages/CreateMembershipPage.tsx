import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Check2, ChevronDown, PersonFill } from "react-bootstrap-icons";
import type { AppDispatch } from "../../../store/store";
import { createMembershipThunk, updateMembershipThunk } from "../../../middleware/membership/membership.thunk";
import { selectMembershipsSubmitting, selectMembershipsError } from "../../../store/selectors/membership.selectors";
import { clearMembershipError } from "../../../store/membershipSlice";
import { purchaseClientMembershipThunk } from "../../../middleware/clientMembership/clientMembership.thunk";
import type { ClientSearchResult } from "../../clients/components/ClientSearchInput";
import api from "../../../services/api/axios";
import "../styles/CreateMembershipPage.scss";

const VALIDITY_OPTIONS = [
  { label: "1 Month",   value: "1 month"  },
  { label: "3 Months",  value: "3 months" },
  { label: "6 Months",  value: "6 months" },
  { label: "12 Months", value: "1 year"   },
  { label: "Lifetime",  value: "lifetime" },
];

const PRIVILEGES = [
  { key: "priorityBooking",  label: "Priority Booking"       },
  { key: "birthdayOffer",    label: "Birthday Special Offer"  },
  { key: "exclusiveDeals",   label: "Exclusive Member Deals"  },
  { key: "freeConsultation", label: "Free Consultation"       },
  { key: "vipTag",           label: "VIP Customer Tag"        },
  { key: "earlyAccess",      label: "Early Access Offers"     },
];

const TIER_COLORS = ["#1a1a2e", "#b8860b", "#4a90d9", "#16a34a", "#8b5cf6"];
const TIER_LABELS = ["Standard", "Gold", "Diamond", "Emerald", "Platinum"];

const CreateMembershipPage: React.FC = () => {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const location   = useLocation();
  const dispatch   = useDispatch<AppDispatch>();

  // client passed from Memberships list page
  const locationClient                     = (location.state as any)?.client as ClientSearchResult | undefined;
  const [pageClient,   setPageClient]      = useState<ClientSearchResult | null>(locationClient ?? null);

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
  const [privileges,   setPrivileges]   = useState<Record<string, boolean>>(
    Object.fromEntries(PRIVILEGES.map(p => [p.key, true]))
  );
  const [description,  setDescription]  = useState("");
  const [errors,       setErrors]       = useState<Record<string, string>>({});

  const priceNum       = parseFloat(price)       || 0;
  const bonusCreditNum = parseFloat(bonusCredit) || 0;
  const walletValue    = useMemo(() => priceNum + bonusCreditNum, [priceNum, bonusCreditNum]);
  const validityLabel  = VALIDITY_OPTIONS.find(o => o.value === validity)?.label ?? validity;
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
    if (!id) return;
    api.get(`/api/v1/memberships/${id}`).then(res => {
      const d = res.data?.data ?? res.data;
      if (!d) return;
      setName(d.name ?? "");
      setPrice(String(d.price ?? ""));
      setValidity(d.validFor ?? "1 year");
      setDescription(d.description ?? "");
      const matchedColor = TIER_COLORS.includes(d.colour) ? d.colour : TIER_COLORS[1];
      setTierColor(matchedColor);
      try {
        const meta = JSON.parse(d.description ?? "{}");
        if (meta.bonusCredit)  setBonusCredit(String(meta.bonusCredit));
        if (meta.serviceDisc)  setServiceDisc(String(meta.serviceDisc));
        if (meta.productDisc)  setProductDisc(String(meta.productDisc));
        if (meta.rpMultiplier) setRpMultiplier(String(meta.rpMultiplier));
        if (meta.privileges)   setPrivileges(meta.privileges);
        if (meta.description)  setDescription(meta.description);
      } catch { /* plain text */ }
    }).catch(() => {});
  }, [id]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim())              e.name  = "Membership name is required";
    if (!priceNum || priceNum <= 0) e.price = "Price must be greater than 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const metaDescription = JSON.stringify({
      description,
      bonusCredit: bonusCreditNum,
      serviceDisc: parseFloat(serviceDisc) || 0,
      productDisc: parseFloat(productDisc) || 0,
      rpMultiplier: parseFloat(rpMultiplier) || 1,
      privileges,
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
      // Persist client association so the drawer can display who this was created for
      ...(pageClient ? {
        clientId:    String(pageClient.id),
        clientName:  `${pageClient.first_name} ${pageClient.last_name ?? ""}`.trim(),
        clientPhone: pageClient.phone_number || undefined,
      } : {}),
    };
    const result = id
      ? await dispatch(updateMembershipThunk({ id, data: payload }))
      : await dispatch(createMembershipThunk(payload));

    if (createMembershipThunk.fulfilled.match(result) || updateMembershipThunk.fulfilled.match(result)) {
      const savedMembership = (result as any).payload;
      const membershipId = savedMembership?.id || id;

      if (membershipId && pageClient) {
        // 1. Save to localStorage so the drawer can display the client immediately
        localStorage.setItem(`mem_client_${membershipId}`, JSON.stringify({
          id:    String(pageClient.id),
          name:  `${pageClient.first_name} ${pageClient.last_name ?? ""}`.trim(),
          phone: pageClient.phone_number || "",
        }));

        // 2. Create the actual ClientMembership record in the database so the
        //    New Appointment modal and client history can find it via the API.
        //    Only do this on CREATE (not on update, to avoid duplicate records).
        if (!id) {
          await dispatch(purchaseClientMembershipThunk({
            clientId:       String(pageClient.id),
            membershipId:   String(membershipId),
            membershipName: name.trim(),
            colour:         tierColor,
            totalSessions:  0,        // 0 = unlimited (wallet-based)
            pricePaid:      walletValue,
          }));

          // Also write a mem2:P: localStorage record so the calendar shows this
          // membership even when the API has other existing records for this client.
          // The calendar merges localStorage purchases when apiItems.length > 0.
          try {
            const cid = String(pageClient.id);
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
              clientName:     `${pageClient.first_name} ${pageClient.last_name ?? ""}`.trim(),
              mobile:         pageClient.phone_number || "",
              clientId:       cid,
            }));
            const idx: string[] = JSON.parse(localStorage.getItem(indexKey) || "[]");
            if (!idx.includes(ref)) { idx.push(ref); localStorage.setItem(indexKey, JSON.stringify(idx)); }
          } catch { /* ignore storage errors */ }
        }
      }

      navigate("/dashboard/catalog/memberships");
    }
  };

  return (
    <div className="cmp">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="cmp__header">
        <div>
          <h1 className="cmp__title">{id ? "Edit Membership" : "Create Membership"}</h1>
          <p className="cmp__subtitle">
            {id ? "Update the details of this membership plan" : "Set up a new membership plan for your clients"}
          </p>
        </div>
        <div className="cmp__header-actions">
          <button className="cmp__btn cmp__btn--outline" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button className="cmp__btn cmp__btn--dark" onClick={handleSave} disabled={submitting}>
            {submitting ? "Saving…" : id ? "Save Changes" : "Create Membership"}
          </button>
        </div>
      </div>

      {apiError && <div className="cmp__error-banner">{apiError}</div>}

      {/* ── Client card (when navigated from membership list) ─────────── */}
      {pageClient && (
        <div className="cmp__client-card">
          <div className="cmp__client-card-head">
            <div className="cmp__client-card-label">
              <PersonFill size={13} /> Client
            </div>
            <button
              className="cmp__btn cmp__btn--outline cmp__btn--sm"
              onClick={() => { setPageClient(null); navigate("/dashboard/catalog/memberships"); }}
            >
              Change Client
            </button>
          </div>
          <div className="cmp__client-info">
            <div className="cmp__client-avatar">
              {`${pageClient.first_name[0]}${pageClient.last_name?.[0] ?? ""}`.toUpperCase()}
            </div>
            <div>
              <span className="cmp__client-name">
                {`${pageClient.first_name} ${pageClient.last_name ?? ""}`.trim()}
              </span>
              {pageClient.phone_number && (
                <span className="cmp__client-phone">{pageClient.phone_number}</span>
              )}
            </div>
          </div>
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

            {/* Member Privileges */}
            <div className="cmp__card">
              <div className="cmp__card-head">
                <h3 className="cmp__card-title">Member Privileges</h3>
              </div>
              <div className="cmp__card-body">
                <div className="cmp__privileges">
                  {PRIVILEGES.map(p => (
                    <label
                      key={p.key}
                      className={`cmp__priv${privileges[p.key] ? " cmp__priv--on" : ""}`}
                      onClick={() => setPrivileges(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                    >
                      <span className={`cmp__priv-box${privileges[p.key] ? " cmp__priv-box--on" : ""}`}>
                        {privileges[p.key] && <Check2 size={11} />}
                      </span>
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* ── RIGHT: Preview ───────────────────────────────────────────── */}
          <div className="cmp__sidebar">
            <div className="cmp__sticky">

              {/* Summary */}
              <div className="cmp__preview-card">
                <h4 className="cmp__preview-title">Preview</h4>
                <div className="cmp__preview-rows">
                  <div className="cmp__preview-row">
                    <span>Customer Pays</span>
                    <strong>₹{priceNum.toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="cmp__preview-row">
                    <span>Bonus Credit</span>
                    <strong className="cmp__green">+₹{bonusCreditNum.toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="cmp__preview-row cmp__preview-row--total">
                    <span>Total Value</span>
                    <strong>₹{walletValue.toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="cmp__preview-divider" />
                  {parseFloat(serviceDisc) > 0 && (
                    <div className="cmp__preview-row">
                      <span>Service Discount</span>
                      <strong>{serviceDisc}%</strong>
                    </div>
                  )}
                  {parseFloat(productDisc) > 0 && (
                    <div className="cmp__preview-row">
                      <span>Product Discount</span>
                      <strong>{productDisc}%</strong>
                    </div>
                  )}
                  <div className="cmp__preview-row">
                    <span>Validity</span>
                    <strong>{validityLabel}</strong>
                  </div>
                </div>
              </div>

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
                      <span>Discount</span>   <span>{serviceDisc}%</span>
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

export default CreateMembershipPage;
