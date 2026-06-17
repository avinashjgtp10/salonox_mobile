import { useState, useRef, useEffect } from "react";
import { Search, BoxSeam } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import { Button, Card, Pagination, Loader } from "../../../components/ui";
import { useListClientPackagesQuery } from "../../../services/api/endpoints/packages.endpoints";
import type { ClientPackage } from "../../../services/api/endpoints/packages.endpoints";
import "../styles/MembershipsPage.scss";

const STATUS_OPTIONS = ["All", "Active", "Completed", "Expired"];

function statusBadgeClass(status: string) {
  const s = status?.toLowerCase();
  if (s === "active")    return "badge-active";
  if (s === "completed") return "badge-completed";
  if (s === "expired")   return "badge-expired";
  return "badge-inactive";
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  if (dateStr === "2099-12-31") return "Never expires";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function PackagesSoldPage() {
  const navigate = useNavigate();

  const [searchTerm,   setSearchTerm]   = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage,  setCurrentPage]  = useState(1);
  const [pageSize,     setPageSize]     = useState(10);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isFetching, refetch } = useListClientPackagesQuery(
    { search: searchTerm || undefined, status: statusFilter !== "All" ? statusFilter : undefined, page: currentPage, limit: pageSize },
    { skip: false },
  );

  const packages: ClientPackage[] = data?.items ?? [];
  const total = data?.total ?? 0;

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

  return (
    <div className="memberships-page container-fluid">

      {/* ── HEADER ── */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="h4 fw-bold mb-1">Packages sold</h3>
          <p className="text-muted small mb-0">View all packages purchased by your clients.</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <Button variant="outline-dark" pill onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Refreshing…" : "Refresh"}
          </Button>
          <Button
            variant="dark"
            pill
            className="px-4 fw-bold"
            onClick={() => navigate("/dashboard/catalog/packages")}
          >
            Manage packages
          </Button>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="d-flex gap-3 align-items-center mb-4 flex-wrap">
        <div className="memberships-search" style={{ maxWidth: 320 }}>
          <Search size={14} className="memberships-search__icon" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search by client or package…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="memberships-search__input"
          />
        </div>

        <div className="d-flex gap-2">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`memberships-page-btn${statusFilter === s ? " active" : ""}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABLE ── */}
      {isLoading ? (
        <Card className="text-center py-5 border-0 rounded-4 shadow-sm d-flex align-items-center justify-content-center" style={{ minHeight: 300 }}>
          <Loader message="Loading packages…" className="py-5" />
        </Card>
      ) : packages.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-4 empty-state-card">
          <div className="d-flex flex-column align-items-center justify-content-center py-5">
            <div
              className="d-flex align-items-center justify-content-center mb-3"
              style={{ width: 60, height: 60, borderRadius: 15, background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              <BoxSeam size={28} className="text-white" />
            </div>
            <h5 className="fw-bold mb-1 text-dark">
              {searchTerm || statusFilter !== "All" ? "No packages found" : "No packages sold yet"}
            </h5>
            <p className="text-muted small mb-4 mx-auto" style={{ maxWidth: 380, textAlign: "center" }}>
              {searchTerm || statusFilter !== "All"
                ? "Try adjusting your search or filter."
                : "Create and sell packages to your clients from the Packages section."}
            </p>
            {!searchTerm && statusFilter === "All" && (
              <Button variant="outline-dark" pill className="px-4 fw-bold" onClick={() => navigate("/dashboard/catalog/packages")}>
                Go to Packages
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card noPadding className="border-0 shadow-sm rounded-4 overflow-hidden mb-4 p-0">
          <table className="memberships-table w-100">
            <thead>
              <tr>
                <th>Client</th>
                <th>Package</th>
                <th>Services</th>
                <th>Created</th>
                <th>Expiry</th>
                <th>Payment</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {packages.map(pkg => (
                <tr key={pkg.id} className="memberships-table-row">
                  <td>
                    <div className="fw-semibold" style={{ fontSize: 13 }}>{pkg.clientName}</div>
                    {pkg.mobile && <div className="text-muted" style={{ fontSize: 12 }}>{pkg.mobile}</div>}
                  </td>
                  <td>
                    <div className="fw-semibold" style={{ fontSize: 13 }}>{pkg.packageName}</div>
                    {pkg.category && <div className="text-muted" style={{ fontSize: 11 }}>{pkg.category}</div>}
                  </td>
                  <td>
                    <span className="text-muted small">
                      {pkg.services?.length ?? 0} service{(pkg.services?.length ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td><span className="small text-muted">{formatDate(pkg.createdDate)}</span></td>
                  <td><span className="small text-muted">{formatDate(pkg.expiryDate)}</span></td>
                  <td>
                    <span className="small" style={{ textTransform: "capitalize" }}>{pkg.paymentMethod?.replace("_", " ")}</span>
                  </td>
                  <td>
                    <span className={`memberships-status-badge ${statusBadgeClass(pkg.status)}`}>
                      {pkg.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="fw-bold small">₹{Number(pkg.totalAmount || 0).toFixed(2)}</div>
                    {Number(pkg.pendingAmount) > 0 && (
                      <div style={{ fontSize: 11, color: "#dc2626" }}>Due: ₹{Number(pkg.pendingAmount).toFixed(2)}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── PAGINATION ── */}
      {total > 0 && !isLoading && (
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={setCurrentPage}
          onPageSizeChange={sz => { setPageSize(sz); setCurrentPage(1); }}
          className="mt-4 mb-4"
        />
      )}
    </div>
  );
}
