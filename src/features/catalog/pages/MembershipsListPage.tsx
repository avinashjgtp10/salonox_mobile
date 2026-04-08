import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Search, Sliders, CardList } from "react-bootstrap-icons";
import MembershipFilterDrawer from "../components/MembershipFilterDrawer.tsx";
import "../styles/MembershipsListPage.scss";

// Mock data based on the provided images
const MOCK_MEMBERSHIPS = [
  {
    id: "1",
    name: "555",
    servicesCovered: "All services",
    validFor: "1 month",
    sessions: "5 sessions",
    price: 7777,
  },
];

const MembershipsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filters, setFilters] = useState({
    sessions: "Any number of sessions",
    payment: "All",
    validFor: "Any period",
    onlyAllServices: false,
  });

  const filteredMemberships = useMemo(() => {
    return MOCK_MEMBERSHIPS.filter((m) => {
      const matchesSearch = m.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      // Filter logic can be expanded here based on 'filters' state
      return matchesSearch;
    });
  }, [searchQuery, filters]);

  return (
    <div className="memberships-list-page">
      <header className="memberships-list-page__header">
        <div className="header-left">
          <h1>Memberships</h1>
        </div>
        <div className="header-actions">
          <div className="dropdown">
            <button className="btn-options" data-bs-toggle="dropdown">
              Options <ChevronDown size={14} />
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-3 py-2">
              <li>
                <button className="dropdown-item py-2 px-3 fw-medium">
                  View sold memberships
                </button>
              </li>
              <li>
                <button className="dropdown-item py-2 px-3 fw-medium">
                  Upsell settings
                </button>
              </li>
            </ul>
          </div>
          <button
            className="btn-add"
            onClick={() => navigate("/dashboard/catalog/memberships/create")}
          >
            Add
          </button>
        </div>
      </header>

      <div className="memberships-list-page__controls">
        <div className="search-box">
          <Search className="search-icon-abs" size={18} />
          <input
            type="text"
            placeholder="Search by membership name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          className="filter-btn"
          onClick={() => setShowFilterDrawer(true)}
        >
          Filters <Sliders size={16} />
        </button>
      </div>

      <main className="memberships-list-page__content">
        <table className="membership-table">
          <thead>
            <tr>
              <th>Membership name</th>
              <th>Valid for</th>
              <th>Sessions</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {filteredMemberships.length > 0 ? (
              filteredMemberships.map((m) => (
                <tr
                  key={m.id}
                  onClick={() =>
                    navigate(`/dashboard/catalog/memberships/${m.id}`)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <td className="membership-name-cell">
                    <div className="membership-icon">
                      <CardList size={20} />
                    </div>
                    <div className="name-info">
                      <span className="name">{m.name}</span>
                      <span className="services">{m.servicesCovered}</span>
                    </div>
                  </td>
                  <td>{m.validFor}</td>
                  <td>{m.sessions}</td>
                  <td className="price-cell">₹{m.price.toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-5">
                  No memberships found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </main>

      <footer className="memberships-list-page__pagination">
        <span className="page-info">1 of 1</span>
      </footer>

      {showFilterDrawer && (
        <MembershipFilterDrawer
          onClose={() => setShowFilterDrawer(false)}
          onApply={(newFilters) => setFilters(newFilters)}
          initialFilters={filters}
        />
      )}
    </div>
  );
};

export default MembershipsListPage;
