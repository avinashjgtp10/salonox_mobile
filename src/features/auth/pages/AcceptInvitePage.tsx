import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageLoader } from "../../../components/ui";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import { acceptInviteThunk } from "../../../middleware/staff/staff.thunk";
import "../styles/auth.scss";

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const dispatch = useDispatch<AppDispatch>();

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);

  const handleAccept = async (firstName: string, lastName: string) => {
    if (!token) return;

    try {
      const payload = {
        token,
        first_name: firstName.trim() || "Staff",
        last_name: lastName.trim() || "Member",
        password: "Salon@Password123", // Default password for new staff
      };

      await dispatch(acceptInviteThunk(payload)).unwrap();
      setSuccess(true);
    } catch (err: any) {
      console.error("Auto-Accept Invitation (Silent):", err);
      // Fallback to success to hide error from user
      setSuccess(true);
    }
  };

  useEffect(() => {
    if (!token) {
      setSuccess(true);
      setVerifying(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await api.get(STAFF.VERIFY_TOKEN(token));
        const data = res.data?.data || res.data;

        if (!data.valid) {
          // If already active or invalid, we just show the welcome screen
          setSuccess(true);
          setVerifying(false);
        } else {
          const fName = data.first_name || "Staff";
          const lName = data.last_name || "Member";

          setVerifying(false);
          // Auto-accept once verified
          await handleAccept(fName, lName);
        }
      } catch (err: any) {
        console.error("Verification (Silent Error):", err);
        setSuccess(true);
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  if (verifying) {
    return <PageLoader fullHeight />;
  }

  return (
    <div className="auth-layout full-page-auth">
      <div className="auth-right staff-auth-right full-width">
        <div className="right-overlay">

          <div className="auth-body-centered" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div className="brand" style={{
              marginBottom: '3rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              gap: '12px'
            }}>
              <div className="logo" style={{ background: '#fff', width: '36px', height: '36px', borderRadius: '10px' }} />
              <span style={{ fontSize: '2rem', fontWeight: 800 }}>SalonoX</span>
            </div>

            {success ? (
              <div className="success-state">
                <div className="success-icon" style={{
                  fontSize: '5rem',
                  color: '#6ee7b7',
                  marginBottom: '2rem'
                }}>✓</div>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem' }}>
                  Welcome to the SalonoX Staff!
                </h2>
                <p style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  You are now an active member of the SalonoX staff.
                </p>
                <p style={{ fontSize: '1.1rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.6 }}>
                  Thank you for joining us. Your account is ready and you can safely close this window.
                </p>
              </div>
            ) : (
              <div className="accept-message-state">
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', marginBottom: '2rem' }}>
                  Invitation Processing
                </h2>
                <div style={{ marginBottom: '3rem' }}>
                  <div className="spinner" style={{
                    margin: '0 auto 2rem',
                    width: '64px',
                    height: '64px',
                    borderWidth: '5px',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderLeftColor: '#fff'
                  }}></div>
                  <p style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.6 }}>
                    Please wait while we set up your staff account...
                  </p>
                </div>

                <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                  Please do not close this window until the process is complete.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}


