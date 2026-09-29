import { useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchPublicDigitalMenuThunk } from "../../../middleware/digitalMenu/digitalMenu.thunk";

// The digital menu's own read-only price-list UI was removed — the menu and
// the booking page show the same catalogue, so a QR code landing on a page
// nobody can book from was a dead end. This route now always sends the scan
// straight to the salon's public booking page instead.
export default function PublicDigitalMenuPage() {
  const { token } = useParams<{ token: string }>();
  const dispatch = useAppDispatch();
  const { publicMenu, publicLoading, publicError } = useAppSelector((s) => s.digitalMenu);

  useEffect(() => {
    if (token) dispatch(fetchPublicDigitalMenuThunk(token));
  }, [token, dispatch]);

  if (publicMenu?.booking_slug) {
    return <Navigate to={`/book/${publicMenu.booking_slug}`} replace />;
  }

  if (publicLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  // No booking_slug to redirect to — the link is invalid/expired, or the
  // salon hasn't published online booking. There's no menu UI left to fall
  // back to, so this is the only thing left to show.
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", textAlign: "center", padding: 24 }}>
      <div>
        <h3>Booking unavailable</h3>
        <p>{publicError || "This link is invalid or the salon hasn't set up online booking yet."}</p>
      </div>
    </div>
  );
}
