import { useEffect, useState } from "react";
import { CardChecklist, ArrowRight, CheckCircleFill, ExclamationTriangle } from "react-bootstrap-icons";
import { useAppSelector } from "../../../hooks/useAppRedux";
import api from "../../../services/api/axios";
import Dropdown from "../../../components/ui/Dropdown";
import { BRANCH_OWNER } from "../../../services/api/endpoints/branchOwner.endpoints";
import {
  SectionCard, StatusBadge, BoEmptyState, PrimaryButton,
  Shimmer, inputStyle, label as labelStyle,
  usePagination, BoPagination,
} from "../components/BranchOwnerUI";

interface MembershipRow {
  id: string; name: string; price: number; sessionType: string; validFor: string;
  pricingType: string; includedServices: { serviceId: string; serviceName: string }[];
}

const fmtMoney = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function BranchOwnerMembershipSharingPage() {
  const salons = useAppSelector((s) => s.branchOwner.salons);

  const [sourceSalonId, setSourceSalonId] = useState("");
  const [destSalonId, setDestSalonId] = useState("");
  const [sourceMemberships, setSourceMemberships] = useState<MembershipRow[]>([]);
  const [destMemberships, setDestMemberships] = useState<MembershipRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copyBusy, setCopyBusy] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [copySuccess, setCopySuccess] = useState("");

  useEffect(() => {
    if (salons.length >= 2 && !sourceSalonId) setSourceSalonId(salons[0].id);
    if (salons.length >= 2 && !destSalonId) setDestSalonId(salons[1].id);
  }, [salons, sourceSalonId, destSalonId]);

  useEffect(() => {
    if (!sourceSalonId) return;
    setLoaded(false);
    api.get(BRANCH_OWNER.SALON_MEMBERSHIPS(sourceSalonId))
      .then((r) => setSourceMemberships(r.data?.data ?? []))
      .catch(() => setSourceMemberships([]))
      .finally(() => setLoaded(true));
    setSelectedIds([]);
  }, [sourceSalonId]);

  const loadDest = () => {
    if (!destSalonId) return;
    api.get(BRANCH_OWNER.SALON_MEMBERSHIPS(destSalonId))
      .then((r) => setDestMemberships(r.data?.data ?? []))
      .catch(() => setDestMemberships([]));
  };
  useEffect(loadDest, [destSalonId]);

  const salonName = (id: string) => salons.find((s) => s.id === id)?.name ?? id;

  async function handleCopy() {
    setCopyError(""); setCopySuccess("");
    if (!sourceSalonId || !destSalonId || selectedIds.length === 0) {
      setCopyError("Pick source, destination and at least one membership.");
      return;
    }
    if (sourceSalonId === destSalonId) {
      setCopyError("Source and destination salon must be different.");
      return;
    }
    setCopyBusy(true);
    try {
      for (const id of selectedIds) {
        await api.post(BRANCH_OWNER.MEMBERSHIP_COPY, {
          source_salon_id: sourceSalonId, dest_salon_id: destSalonId, membership_id: id,
        });
      }
      setCopySuccess(`Copied ${selectedIds.length} membership${selectedIds.length > 1 ? "s" : ""} to ${salonName(destSalonId)}.`);
      setSelectedIds([]);
      loadDest();
    } catch (err: any) {
      setCopyError(err?.response?.data?.error?.message || "Failed to copy one or more memberships.");
    } finally {
      setCopyBusy(false);
    }
  }

  const destPage = usePagination(destMemberships, 6);

  if (salons.length < 2) {
    return (
      <div style={{ padding: 28, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Membership Sharing</h1>
        <SectionCard title="">
          <BoEmptyState icon={<CardChecklist size={30} />} text="You need at least two salons to share membership plans." />
        </SectionCard>
      </div>
    );
  }

  return (
    <div style={{ padding: "26px 28px 44px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", maxWidth: 1280 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Membership Sharing</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>Copy a membership plan from one salon into another</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionCard title="Copy Membership Plan">
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 14, alignItems: "end", marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>From Branch</label>
              <Dropdown
                value={sourceSalonId}
                onChange={setSourceSalonId}
                options={salons.map((s) => ({ id: s.id, name: s.name }))}
                placeholder="Select branch…"
                style={inputStyle}
              />
            </div>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#eef2ff", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowRight size={15} />
            </div>
            <div>
              <label style={labelStyle}>To Branch</label>
              <Dropdown
                value={destSalonId}
                onChange={setDestSalonId}
                options={salons.map((s) => ({ id: s.id, name: s.name }))}
                placeholder="Select branch…"
                style={inputStyle}
              />
            </div>
          </div>

          <label style={labelStyle}>Membership Plans</label>
          {!loaded ? <Shimmer h={44} /> : sourceMemberships.length === 0 ? (
            <div style={{ fontSize: 13, color: "#94a3b8", padding: "10px 0" }}>No membership plans in this salon yet.</div>
          ) : (
            <Dropdown
              multiple
              value={selectedIds}
              options={sourceMemberships.map((m) => ({ id: m.id, name: `${m.name} — ${fmtMoney(m.price)} (${m.pricingType})` }))}
              onChange={(id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
              placeholder="Search and select membership plans…"
              style={inputStyle}
            />
          )}

          <div style={{ marginTop: 14, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <ExclamationTriangle size={13} style={{ color: "#d97706", marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#92400e" }}>
              Services linked to the plan are salon-specific and won't carry over — re-attach included services on the destination salon after copying.
            </span>
          </div>

          {copyError && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginTop: 14 }}>
              {copyError}
            </div>
          )}
          {copySuccess && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", color: "#16a34a", fontSize: 13, marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircleFill size={13} /> {copySuccess}
            </div>
          )}

          <div style={{ textAlign: "right", marginTop: 16 }}>
            <PrimaryButton onClick={handleCopy} disabled={copyBusy}>
              {copyBusy ? "Copying…" : `Copy ${selectedIds.length > 0 ? selectedIds.length : ""} Plan${selectedIds.length === 1 ? "" : "s"}`}
            </PrimaryButton>
          </div>
        </SectionCard>
      </div>

      <SectionCard title={`Membership Plans in ${salonName(destSalonId)}`} noPadding>
        {destMemberships.length === 0 ? (
          <BoEmptyState icon={<CardChecklist size={26} />} text="No membership plans in this salon yet." />
        ) : (<>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Name", "Price", "Type", "Session Type", "Valid For"].map((h) => (
                  <th key={h} style={{ padding: "10px 20px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {destPage.pageItems.map((m) => (
                <tr key={m.id} style={{ borderTop: "1px solid #f8fafc" }}>
                  <td style={{ padding: "11px 20px", fontWeight: 700, color: "#0f172a" }}>{m.name}</td>
                  <td style={{ padding: "11px 20px", color: "#0f172a", fontWeight: 600 }}>{fmtMoney(m.price)}</td>
                  <td style={{ padding: "11px 20px" }}><StatusBadge status={m.pricingType} /></td>
                  <td style={{ padding: "11px 20px", color: "#475569" }}>{m.sessionType}</td>
                  <td style={{ padding: "11px 20px", color: "#94a3b8" }}>{m.validFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <BoPagination {...destPage} />
        </>)}
      </SectionCard>
    </div>
  );
}
