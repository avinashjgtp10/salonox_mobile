import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { useState } from "react"
import { useDispatch } from "react-redux"
import { logout } from "../../../store/authSlice"
import "../styles/DashboardPage.scss"

import OnlineBookingSubSidebar from "./OnlineBookingSubSidebar"
import CatalogSubSidebar from "./CatalogSubSidebar"
import SalesSubSidebar from "./SalesSubSidebar"
import ClientsSubSidebar from "./ClientsSubSidebar"
import MarketingSubSidebar from "./MarketingSubSidebar"
import TeamSubSidebar from "./TeamSubSidebar"

import {
  House,
  Calendar,
  Tag,
  EmojiSmile,
  Book,
  Person,
  Megaphone,
  People,
  GraphUpArrow,
  Grid3x3Gap,
  Gear,
  QuestionCircle,
  Search,
  BarChart,
  Bell,
  BoxArrowRight
} from "react-bootstrap-icons"

export default function DashboardLayout() {

  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const handleLogout = () => {
    dispatch(logout())
    navigate("/login")
  }

  return (
    <div className="dashboard">

      {/* ================= TOPBAR ================= */}
      <div className="topbar">
        <h2 className="brand">salonox</h2>

        <div className="topbar-right">
          <button className="activate-btn">Activate plan</button>
          <Search size={20} />
          <BarChart size={20} />

          <div className="notification">
            <Bell size={20} />
            <span className="badge">3</span>
          </div>

          <div className="profile">SJ</div>

          <div 
            className="logout-btn" 
            style={{ cursor: "pointer", marginLeft: "15px", display: "flex", alignItems: "center", color: "#6c757d" }} 
            onClick={handleLogout}
            title="Logout"
          >
            <BoxArrowRight size={22} />
          </div>
        </div>
      </div>

      {/* ================= BODY ================= */}
      <div className="dashboard-body">

        {/* ================= SIDEBAR ================= */}
        <aside className="sidebar">

          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              isActive ? "nav-btn route-active" : "nav-btn"
            }
            onClick={() => setOpenMenu(null)}
          >
            <House size={26} />
            <span className="nav-label">Home</span>
          </NavLink>

          <NavLink
            to="calendar"
            className={({ isActive }) =>
              isActive ? "nav-btn route-active" : "nav-btn"
            }
            onClick={() => setOpenMenu(null)}
          >
            <Calendar size={26} />
            <span className="nav-label">Calendar</span>
          </NavLink>

          {/* SALES */}
          <div
            className={`nav-btn ${openMenu === "sales" ? "menu-active" : ""}`}
            onClick={() => {
              setOpenMenu("sales")
              navigate("/dashboard/sales")
            }}
          >
            <Tag size={26} />
            <span className="nav-label">Sales</span>
          </div>

          {/* CLIENTS */}
          <div
            className={`nav-btn ${openMenu === "clients" ? "menu-active" : ""}`}
            onClick={() =>
              setOpenMenu(openMenu === "clients" ? null : "clients")
            }
          >
            <EmojiSmile size={26} />
            <span className="nav-label">Clients</span>
          </div>

          {/* CATALOG */}
          <div
            className={`nav-btn ${openMenu === "catalog" ? "menu-active" : ""}`}
            onClick={() =>
              setOpenMenu(openMenu === "catalog" ? null : "catalog")
            }
          >
            <Book size={26} />
            <span className="nav-label">Catalog</span>
          </div>

          {/* ONLINE BOOKING */}
          <div
            className={`nav-btn ${openMenu === "onlineBooking" ? "menu-active" : ""}`}
            onClick={() =>
              setOpenMenu(
                openMenu === "onlineBooking" ? null : "onlineBooking"
              )
            }
          >
            <Person size={26} />
            <span className="nav-label">Online booking</span>
          </div>

          {/* MARKETING */}
          <div
            className={`nav-btn ${openMenu === "marketing" ? "menu-active" : ""}`}
            onClick={() =>
              setOpenMenu(openMenu === "marketing" ? null : "marketing")
            }
          >
            <Megaphone size={26} />
            <span className="nav-label">Marketing</span>
          </div>

          {/* TEAM */}
          <div
            className={`nav-btn ${openMenu === "team" ? "menu-active" : ""}`}
            onClick={() =>
              setOpenMenu(openMenu === "team" ? null : "team")
            }
          >
            <People size={26} />
            <span className="nav-label">Team</span>
          </div>

          <NavLink
            to="analytics"
            className={({ isActive }) =>
              isActive ? "nav-btn route-active" : "nav-btn"
            }
            onClick={() => setOpenMenu(null)}
          >
            <GraphUpArrow size={26} />
            <span className="nav-label">Analytics</span>
          </NavLink>

          <NavLink
            to="apps"
            className={({ isActive }) =>
              isActive ? "nav-btn route-active" : "nav-btn"
            }
            onClick={() => setOpenMenu(null)}
          >
            <Grid3x3Gap size={26} />
            <span className="nav-label">Apps</span>
          </NavLink>

          <div className="nav-spacer" />

          <NavLink
            to="settings"
            className={({ isActive }) =>
              isActive ? "nav-btn route-active" : "nav-btn"
            }
            onClick={() => setOpenMenu(null)}
          >
            <Gear size={26} />
            <span className="nav-label">Settings</span>
          </NavLink>

          <NavLink
            to="help"
            className={({ isActive }) =>
              isActive ? "nav-btn route-active" : "nav-btn"
            }
            onClick={() => setOpenMenu(null)}
          >
            <QuestionCircle size={26} />
            <span className="nav-label">Help</span>
          </NavLink>

        </aside>

        {/* ================= SUB SIDEBAR ================= */}
        {openMenu === "sales" && (
          <SalesSubSidebar onClose={() => setOpenMenu(null)} />
        )}

        {openMenu === "clients" && (
          <ClientsSubSidebar onClose={() => setOpenMenu(null)} />
        )}

        {openMenu === "catalog" && (
          <CatalogSubSidebar onClose={() => setOpenMenu(null)} />
        )}

        {openMenu === "onlineBooking" && (
          <OnlineBookingSubSidebar onClose={() => setOpenMenu(null)} />
        )}

        {openMenu === "marketing" && (
          <MarketingSubSidebar onClose={() => setOpenMenu(null)} />
        )}

        {openMenu === "team" && (
          <TeamSubSidebar onClose={() => setOpenMenu(null)} />
        )}

        {/* ================= MAIN ================= */}
        <main className={`main ${openMenu ? "shifted" : ""}`}>
          <Outlet />
        </main>

      </div>
    </div>
  )
}