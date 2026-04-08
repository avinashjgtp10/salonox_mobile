import { Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { logout } from "../../../store/authSlice";
import { getMySalonThunk } from "../../../middleware/salon/salon.thunk";
import "../styles/DashboardPage.scss";

import DashboardTopbar from "./DashboardTopbar";
import DashboardSidebar from "./DashboardSidebar";
import OnlineBookingSubSidebar from "./OnlineBookingSubSidebar";
import CatalogSubSidebar from "./CatalogSubSidebar";
import SalesSubSidebar from "./SalesSubSidebar";
import ClientsSubSidebar from "./ClientsSubSidebar";
import MarketingSubSidebar from "./MarketingSubSidebar";
import TeamSubSidebar from "./TeamSubSidebar";

export default function DashboardLayout() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(getMySalonThunk());
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="dashboard">
      <DashboardTopbar onLogout={handleLogout} />

      <div className="dashboard-body">
        <DashboardSidebar openMenu={openMenu} onMenuChange={setOpenMenu} />

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

        <main className={`main ${openMenu ? "shifted" : ""}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
