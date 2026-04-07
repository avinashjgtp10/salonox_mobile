import { Search, BarChart, Bell, BoxArrowRight } from "react-bootstrap-icons"

interface Props {
  onLogout: () => void
}

export default function DashboardTopbar({ onLogout }: Props) {
  return (
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
          onClick={onLogout}
          title="Logout"
        >
          <BoxArrowRight size={22} />
        </div>
      </div>
    </div>
  )
}
