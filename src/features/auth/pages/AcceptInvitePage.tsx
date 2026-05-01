import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Input, Button, PageLoader } from "../../../components/ui";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import "../styles/auth.scss";

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    password: "",
  });

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided.");
      setVerifying(false);
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await api.get(STAFF.VERIFY_TOKEN(token));
        const data = res.data?.data || res.data;
        if (!data.valid) {
          setError(data.expired ? "This invitation has expired." : "This invitation is invalid.");
        } else {
          setEmail(data.email || "");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to verify invitation token.");
      } finally {
        setVerifying(false);
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!formData.firstName.trim() || !formData.password) {
      toast.error("First name and password are required.");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    try {
      setLoading(true);
      await api.post(STAFF.ACCEPT_INVITATION, {
        token,
        first_name: formData.firstName,
        last_name: formData.lastName,
        password: formData.password,
      });

      toast.success("Invitation accepted successfully! You can now log in.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to accept invitation.");
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return <PageLoader fullHeight message="Verifying invitation..." />;
  }

  return (
    <div className="auth-layout">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-header">
            <div className="brand">
              <div className="logo" />
              <span>Salon Management</span>
            </div>
          </div>
          <div className="auth-body">
            <h1>Accept Invitation</h1>
            {error ? (
              <div className="error-state">
                <p>{error}</p>
                <Button variant="primary" onClick={() => navigate("/login")}>
                  Go to Login
                </Button>
              </div>
            ) : (
              <>
                <p className="subtitle">
                  Create your account to join the team with email <strong>{email}</strong>.
                </p>
                <form className="auth-form" onSubmit={handleSubmit}>
                  <div className="form-row">
                    <Input
                      label="First Name"
                      name="firstName"
                      placeholder="Jane"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                    />
                    <Input
                      label="Last Name (Optional)"
                      name="lastName"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                  </div>
                  <Input
                    label="Password"
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    block
                    loading={loading}
                    disabled={loading}
                  >
                    Accept &amp; Register
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="auth-right staff-auth-right">
        <div className="right-overlay">
          <h2>Welcome to the team!</h2>
          <p>Join us to easily manage your schedule and appointments.</p>
        </div>
      </div>
    </div>
  );
}
