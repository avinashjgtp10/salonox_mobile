import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ThreeDotsVertical,
} from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import "./SuppliersListPage.scss";

interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
}

const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: "1",
    name: "Beauty Care Inc",
    contact: "Anita Sharma",
    email: "anita@beautycare.com",
    phone: "+91 98765 43210",
  },
  {
    id: "2",
    name: "Style Brands",
    contact: "Rahul Mehta",
    email: "rahul@stylebrands.com",
    phone: "+91 87654 32109",
  },
  {
    id: "3",
    name: "ProHair Ltd",
    contact: "Sneha Patel",
    email: "sneha@prohair.in",
    phone: "+91 76543 21098",
  },
  {
    id: "4",
    name: "Luxe Beauty",
    contact: "Priya Nair",
    email: "priya@luxebeauty.com",
    phone: "+44 7911 123456",
  },
  {
    id: "5",
    name: "GlowSkin Co",
    contact: "Amit Singh",
    email: "amit@glowskin.co",
    phone: "+1 555 234 5678",
  },
  {
    id: "6",
    name: "NailArt Pro",
    contact: "Divya Kapoor",
    email: "divya@nailartpro.com",
    phone: "+91 65432 10987",
  },
  {
    id: "7",
    name: "ColorMix India",
    contact: "Suresh Joshi",
    email: "suresh@colormix.in",
    phone: "+91 54321 09876",
  },
  {
    id: "8",
    name: "HairTech World",
    contact: "Meena Gupta",
    email: "meena@hairtech.com",
    phone: "+61 412 345 678",
  },
  {
    id: "9",
    name: "Pure Naturals",
    contact: "Lakshmi Iyer",
    email: "lakshmi@purenaturals.in",
    phone: "+91 43210 98765",
  },
  {
    id: "10",
    name: "Salon Essentials",
    contact: "Vikram Rao",
    email: "vikram@salonessentials.com",
    phone: "+971 50 123 4567",
  },
  {
    id: "11",
    name: "Glam Supply Co",
    contact: "Pooja Reddy",
    email: "pooja@glamsupply.com",
    phone: "+91 32109 87654",
  },
  {
    id: "12",
    name: "CutEdge Supplies",
    contact: "Karan Verma",
    email: "karan@cutedge.in",
    phone: "+91 21098 76543",
  },
];

const ITEMS_PER_PAGE = 8;

const SuppliersListPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(
    () =>
      MOCK_SUPPLIERS.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.contact.toLowerCase().includes(search.toLowerCase()) ||
          s.email.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  useEffect(() => setCurrentPage(1), [search]);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="suppliers-list-page">
      {/* HEADER */}
      <header className="suppliers-list-page__header">
        <div>
          <h1>
            Suppliers
            <span className="count-badge">{filtered.length}</span>
          </h1>
          <p>
            Add and manage details of your suppliers. <a href="#">Learn more</a>
          </p>
        </div>
        <button
          className="btn-add"
          onClick={() => navigate("/dashboard/catalog/inventory/suppliers/new")}
        >
          Add
        </button>
      </header>

      {/* SEARCH */}
      <div className="suppliers-list-page__toolbar">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search suppliers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE */}
      {paginated.length > 0 ? (
        <div className="table-responsive">
          <table className="suppliers-table">
            <thead>
              <tr>
                <th>Supplier name</th>
                <th>Contact person</th>
                <th>Email</th>
                <th>Phone</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((s) => (
                <tr
                  key={s.id}
                  className="cursor-pointer"
                  onClick={() =>
                    navigate(`/dashboard/catalog/inventory/suppliers/${s.id}`)
                  }
                >
                  <td className="fw-semibold">{s.name}</td>
                  <td>{s.contact}</td>
                  <td className="text-secondary">{s.email}</td>
                  <td className="text-secondary">{s.phone}</td>
                  <td
                    className="actions-cell"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button className="btn-icon">
                      <ThreeDotsVertical size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🚚</div>
          <h3>No suppliers yet</h3>
          <p>
            <a
              href="#"
              onClick={() =>
                navigate("/dashboard/catalog/inventory/suppliers/new")
              }
            >
              Click here to add a supplier now.
            </a>
          </p>
        </div>
      )}

      {/* PAGINATION */}
      {filtered.length > 0 && (
        <div className="suppliers-list-page__pagination">
          <button
            className="pag-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft size={15} />
          </button>
          <span className="pag-label">
            {currentPage} of {totalPages}
          </span>
          <button
            className="pag-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SuppliersListPage;
