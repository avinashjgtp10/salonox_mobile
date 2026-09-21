import { Outlet } from "react-router-dom";
import "../../dashboard/styles/DashboardPage.scss";
import "../styles/BranchOwnerTheme.scss";
import BranchOwnerTopbar from "./BranchOwnerTopbar";
import BranchOwnerSidebar from "./BranchOwnerSidebar";

// Reuses the main site's .dashboard/.dashboard-body/.topbar/.main shell
// (same SCSS file) for the topbar/content — BranchOwnerSidebar itself is a
// fully bespoke fixed-position rail, not the shared .sidebar/.nav-btn rail,
// so BranchOwnerTheme.scss (scoped under "bo-portal") repositions .topbar/
// .main around whatever width it currently reports via --bo-sidebar-w.
export default function BranchOwnerLayout() {
  return (
    <div className="dashboard bo-portal">
      <BranchOwnerTopbar />
      <div className="dashboard-body">
        <BranchOwnerSidebar />
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
