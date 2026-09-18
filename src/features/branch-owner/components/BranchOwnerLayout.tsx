import { Outlet } from "react-router-dom";
import "../../dashboard/styles/DashboardPage.scss";
import BranchOwnerTopbar from "./BranchOwnerTopbar";
import BranchOwnerSidebar from "./BranchOwnerSidebar";

// Reuses the main site's .dashboard/.dashboard-body/.sidebar/.main shell
// (same SCSS file) so the Branch Owner portal reads as the same app —
// BranchOwnerTopbar/BranchOwnerSidebar are the Branch-Owner-specific
// content, not a different visual system.
export default function BranchOwnerLayout() {
  return (
    <div className="dashboard">
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
