import { useEffect, useState } from "react";
import { BoxSeam, ArrowRight, CheckCircleFill } from "react-bootstrap-icons";
import { useAppSelector } from "../../../hooks/useAppRedux";
import api from "../../../services/api/axios";
import Dropdown from "../../../components/ui/Dropdown";
import { BRANCH_OWNER } from "../../../services/api/endpoints/branchOwner.endpoints";
import {
  SectionCard, BoEmptyState, PrimaryButton,
  Shimmer, inputStyle, label as labelStyle,
  usePagination, BoPagination,
} from "../components/BranchOwnerUI";

interface PackageServiceRow { serviceName: string; totalSessions: number; price: number; }
interface PackageRow {
  id: string; name: string; basePrice: number; discount: number;
  neverExpires: boolean; expiryMonths: number | null;
  services: PackageServiceRow[];
}

const fmtMoney = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function BranchOwnerPackageSharingPage() {
  const salons = useAppSelector((s) => s.branchOwner.salons);

  const [sourceSalonId, setSourceSalonId] = useState("");
  const [destSalonId, setDestSalonId] = useState("");
  const [sourcePackages, setSourcePackages] = useState<PackageRow[]>([]);
  const [destPackages, setDestPackages] = useState<PackageRow[]>([]);
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
    api.get(BRANCH_OWNER.SALON_PACKAGES(sourceSalonId))
      .then((r) => setSourcePackages(r.data?.data ?? []))
      .catch(() => setSourcePackages([]))
      .finally(() => setLoaded(true));
    setSelectedIds([]);
  }, [sourceSalonId]);

  const loadDest = () => {
    if (!destSalonId) return;
    api.get(BRANCH_OWNER.SALON_PACKAGES(destSalonId))
      .then((r) => setDestPackages(r.data?.data ?? []))
      .catch(() => setDestPackages([]));
  };
  useEffect(loadDest, [destSalonId]);

  const salonName = (id: string) => salons.find((s) => s.id === id)?.name ?? id;

  async function handleCopy() {
    setCopyError(""); setCopySuccess("");
    if (!sourceSalonId || !destSalonId || selectedIds.length === 0) {
      setCopyError("Pick source, destination and at least one package.");
      return;
    }
    if (sourceSalonId === destSalonId) {
      setCopyError("Source and destination salon must be different.");
      return;
    }
    setCopyBusy(true);
    try {
      for (const id of selectedIds) {
        await api.post(BRANCH_OWNER.PACKAGE_COPY, {
          source_salon_id: sourceSalonId, dest_salon_id: destSalonId, template_id: id,
        });
      }
      setCopySuccess(`Copied ${selectedIds.length} package${selectedIds.length > 1 ? "s" : ""} to ${salonName(destSalonId)}.`);
      setSelectedIds([]);
      loadDest();
    } catch (err: any) {
      setCopyError(err?.response?.data?.error?.message || "Failed to copy one or more packages.");
    } finally {
      setCopyBusy(false);
    }
  }

  const destPage = usePagination(destPackages, 6);

  if (salons.length < 2) {
    return (
      <div style={{ padding: 28, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Package Sharing</h1>
        <SectionCard title="">
          <BoEmptyState icon={<BoxSeam size={30} />} text="You need at least two salons to share package templates." />
        </SectionCard>
      </div>
    );
  }

  return (
    <div style={{ padding: "26px 28px 44px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", maxWidth: 1280 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Package Sharing</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>Copy a service package template from one salon into another</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionCard title="Copy Package Template">
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

          <label style={labelStyle}>Package Templates</label>
          {!loaded ? <Shimmer h={44} /> : sourcePackages.length === 0 ? (
            <div style={{ fontSize: 13, color: "#94a3b8", padding: "10px 0" }}>No package templates in this salon yet.</div>
          ) : (
            <Dropdown
              multiple
              value={selectedIds}
              options={sourcePackages.map((p) => ({ id: p.id, name: `${p.name} — ${fmtMoney(p.basePrice)} (${p.services.length} service${p.services.length === 1 ? "" : "s"})` }))}
              onChange={(id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
              placeholder="Search and select package templates…"
              style={inputStyle}
            />
          )}

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
              {copyBusy ? "Copying…" : `Copy ${selectedIds.length > 0 ? selectedIds.length : ""} Package${selectedIds.length === 1 ? "" : "s"}`}
            </PrimaryButton>
          </div>
        </SectionCard>
      </div>

      <SectionCard title={`Package Templates in ${salonName(destSalonId)}`} noPadding>
        {destPackages.length === 0 ? (
          <BoEmptyState icon={<BoxSeam size={26} />} text="No package templates in this salon yet." />
        ) : (<>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Name", "Base Price", "Discount", "Services", "Expiry"].map((h) => (
                  <th key={h} style={{ padding: "10px 20px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {destPage.pageItems.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid #f8fafc" }}>
                  <td style={{ padding: "11px 20px", fontWeight: 700, color: "#0f172a" }}>{p.name}</td>
                  <td style={{ padding: "11px 20px", color: "#0f172a", fontWeight: 600 }}>{fmtMoney(p.basePrice)}</td>
                  <td style={{ padding: "11px 20px", color: "#475569" }}>{p.discount > 0 ? fmtMoney(p.discount) : "—"}</td>
                  <td style={{ padding: "11px 20px", color: "#475569" }}>{p.services.length}</td>
                  <td style={{ padding: "11px 20px", color: "#94a3b8" }}>{p.neverExpires ? "Never" : p.expiryMonths ? `${p.expiryMonths} mo` : "—"}</td>
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
