import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/JoinBusinessPage.scss";
import "../styles/onboarding-shared.scss";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { FiSearch } from "react-icons/fi";
import api from "../../../services/api/axios";
import { SALON } from "../../../services/api/endpoints";
import OnboardingImagePanel from "../components/OnboardingImagePanel";
import OnboardingPageWrapper from "../components/OnboardingPageWrapper";
import OnboardingBackButton from "../components/OnboardingBackButton";

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
    <OnboardingPageWrapper className="join-page">
      {/* LEFT SIDE */}
      <div className="col-lg-5 col-12 left-panel bg-white d-flex flex-column px-4 px-lg-5 position-relative">
        <OnboardingBackButton />

        <div className="flex-grow-1 d-flex align-items-center justify-content-center">
          <div className="ob-content-max">
            <h2 className="ob-heading mb-1">Search for a business</h2>
            <p className="ob-subtext mb-4">
              Find a business to request login access to their workspace
            </p>

            <div className="position-relative mb-3">
              <FiSearch className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted ob-search-icon" />
              <input
                type="text"
                className="ob-input ps-5"
                placeholder="Search by business name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {loading && (
              <div className="d-flex align-items-center text-muted mb-3 ob-loading-text">
                <span className="spinner-border spinner-border-sm me-2 ob-spinner-sm" />
                Searching...
              </div>
            )}

            {error && !loading && (
              <p className="text-muted ob-loading-text">{error}</p>
            )}

            {results.length > 0 && (
              <div className="list-group">
                {results.map((biz) => (
                  <button
                    key={biz.id}
                    className="ob-biz-list-item list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3"
                    onClick={() => handleSelect(biz)}
                  >
                    <div>
                      <div className="ob-biz-name">{biz.business_name}</div>
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
    </OnboardingPageWrapper>
  );
}
