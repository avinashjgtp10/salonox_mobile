import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/JoinBusinessPage.scss";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { FiSearch, FiArrowLeft } from "react-icons/fi";
import api from "../../../services/api/axios";
import { SALON } from "../../../services/api/endpoints";
import OnboardingImagePanel from "../components/OnboardingImagePanel";

interface Business {
  id: string;
  business_name: string;
  address?: string;
}

export default function JoinBusinessPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (search.trim().length < 2) {
      setResults([]);
      setError("");
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(SALON.LIST, { params: { search: search.trim() } });
        const data: Business[] = res.data?.data ?? [];
        setResults(data);
        if (data.length === 0) setError("No businesses found. Try a different name.");
      } catch {
        setError("Could not search. Please try again.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const handleSelect = (biz: Business) => {
    navigate("/send-request", { state: { business: biz } });
  };

  return (
    <div className="container-fluid p-0 join-page">
      <div className="row g-0" style={{ minHeight: "calc(100vh - 64px)" }}>
        {/* LEFT SIDE */}
        <div className="col-lg-5 col-12 left-panel bg-white d-flex flex-column px-4 px-lg-5 position-relative">
          <button
            className="btn btn-light border rounded-circle position-absolute d-flex align-items-center justify-content-center"
            style={{ top: "24px", left: "24px", width: "40px", height: "40px", padding: 0, zIndex: 10 }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft size={16} />
          </button>

          <div className="flex-grow-1 d-flex align-items-center justify-content-center">
            <div className="w-100" style={{ maxWidth: "420px" }}>
              <h2 className="fw-bold mb-1" style={{ fontSize: "26px", color: "#111827" }}>
                Search for a business
              </h2>
              <p className="text-muted mb-4" style={{ fontSize: "14px" }}>
                Find a business to request login access to their workspace
              </p>

              <div className="position-relative mb-3">
                <FiSearch
                  className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                  style={{ zIndex: 2 }}
                />
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Search by business name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ height: "48px", borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "14px" }}
                  autoFocus
                />
              </div>

              {loading && (
                <div className="d-flex align-items-center text-muted mb-3" style={{ fontSize: "13px" }}>
                  <span className="spinner-border spinner-border-sm me-2" style={{ width: "14px", height: "14px" }} />
                  Searching...
                </div>
              )}

              {error && !loading && (
                <p className="text-muted" style={{ fontSize: "13px" }}>{error}</p>
              )}

              {results.length > 0 && (
                <div className="list-group">
                  {results.map((biz) => (
                    <button
                      key={biz.id}
                      className="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3"
                      style={{ borderRadius: "10px", marginBottom: "6px", border: "1px solid #e5e7eb", fontSize: "14px" }}
                      onClick={() => handleSelect(biz)}
                    >
                      <div>
                        <div className="fw-semibold" style={{ color: "#111827" }}>{biz.business_name}</div>
                        {biz.address && (
                          <small className="text-muted">{biz.address}</small>
                        )}
                      </div>
                      <span className="text-muted">→</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT IMAGE PANEL */}
        <OnboardingImagePanel
          quote={{
            text: "Joining a team on salonox is seamless. I was up and running on my first day.",
            author: "Maya S.",
            role: "Senior Stylist, Paris",
          }}
        />
      </div>
    </div>
  );
}
