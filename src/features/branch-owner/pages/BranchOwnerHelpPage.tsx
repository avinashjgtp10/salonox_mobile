import { useEffect, useMemo, useState } from "react";
import {
  Search, Calendar3, CreditCard, PeopleFill, Building, Box, CashCoin, BarChart, Sliders,
  ChevronDown, ChevronUp, Chat, EnvelopeFill, Bug, CheckCircleFill, X, ArrowLeft, ArrowUpRight,
} from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import Dropdown from "../../../components/ui/Dropdown";
import { fetchMySalonsThunk, submitBranchOwnerSupportTicketThunk } from "../../../middleware/branchOwner/branchOwner.thunk";

interface QuickHelpCategory {
  key: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  intro: string;
  links: { label: string; to: string }[];
}

// Only links to routes that actually exist in this portal (see
// BranchOwnerRoutes.tsx) — Appointments has no dedicated branch-owner page
// (it's managed inside each salon's own dashboard via Enter Salon), and
// "Reports" here means the export button on Staff Performance, not a
// separate Reports page, so both are described rather than linked to
// something that doesn't exist.
const QUICK_HELP: QuickHelpCategory[] = [
  {
    key: "appointments", icon: <Calendar3 size={20} />, label: "Appointments", desc: "Manage bookings",
    intro: "Appointments are managed inside each salon's own dashboard, not from this portal. Use Enter Salon from My Salons to open a salon and manage its bookings directly.",
    links: [{ label: "My Salons", to: "/branch-owner/salons" }],
  },
  {
    key: "payments", icon: <CreditCard size={20} />, label: "Payments", desc: "Payments & bills",
    intro: "Review every payment recorded across the salons you manage — invoice number, method, status, and date — with search and filters.",
    links: [{ label: "Payments", to: "/branch-owner/payments" }],
  },
  {
    key: "staff", icon: <PeopleFill size={20} />, label: "Staff", desc: "Staff & access",
    intro: "See staff across every assigned salon in one list and customize individual permission overrides.",
    links: [{ label: "Staff & Permissions", to: "/branch-owner/staff-permissions" }, { label: "Staff Performance", to: "/branch-owner/staff-performance" }],
  },
  {
    key: "salons", icon: <Building size={20} />, label: "Salons & Branches", desc: "Manage branches",
    intro: "View every salon assigned to you, enter a salon's own dashboard, reset its owner's password, or remove it.",
    links: [{ label: "My Salons", to: "/branch-owner/salons" }],
  },
  {
    key: "inventory", icon: <Box size={20} />, label: "Inventory", desc: "Stock & transfers",
    intro: "See stock levels across branches and transfer products between the salons you manage.",
    links: [{ label: "Inventory & Stock Transfer", to: "/branch-owner/inventory" }],
  },
  {
    key: "finance", icon: <CashCoin size={20} />, label: "Finance", desc: "Revenue & costs",
    intro: "A revenue, commission, and cash-management overview across every salon you manage, with a per-salon breakdown.",
    links: [{ label: "Multi-Branch Finance", to: "/branch-owner/finance" }],
  },
  {
    key: "reports", icon: <BarChart size={20} />, label: "Reports", desc: "Performance",
    intro: "There's no separate Reports page in this portal yet — Staff Performance and Payments both let you export the current view as CSV, Excel, or PDF from their Download button.",
    links: [{ label: "Staff Performance", to: "/branch-owner/staff-performance" }, { label: "Payments", to: "/branch-owner/payments" }],
  },
  {
    key: "settings", icon: <Sliders size={20} />, label: "Settings", desc: "Account & preferences",
    intro: "Manage your profile, password, notifications, preferences, subscription overview, and account.",
    links: [{ label: "Settings", to: "/branch-owner/settings" }],
  },
];

const POPULAR = ["Payments", "Appointments", "Staff", "Inventory", "Reports"];

const GETTING_STARTED = [
  { title: "Create your salon", desc: "Add salon details and branch information" },
  { title: "Add staff", desc: "Create staff accounts and assign roles" },
  { title: "Add services", desc: "Configure your services and pricing" },
  { title: "Set up payments", desc: "Configure payment methods" },
  { title: "Start taking appointments", desc: "Manage bookings and customer visits" },
];

interface FaqItem { question: string; answer: string; tags: string[] }

const FAQS: FaqItem[] = [
  { question: "How do I add a new salon?", answer: "Salons are assigned to you by the super admin. Once assigned, it appears automatically under My Salons — there's no self-service way to add one yet.", tags: ["salons"] },
  { question: "How do I add staff members?", answer: "Staff are added from inside a salon's own dashboard by its owner. As a branch owner you can view and manage the permissions of existing staff from Staff & Permissions, but adding new staff isn't available from this portal yet.", tags: ["staff"] },
  { question: "How do I customize staff permissions?", answer: "Go to Staff & Permissions → find the staff member in the combined list → click Customize → toggle the permissions you want to change → Save Changes.", tags: ["staff"] },
  { question: "How is appointment payment recorded?", answer: "Payments are recorded inside each salon's own booking flow. You can review every payment across your salons from the Payments page, including its invoice number, method, and status.", tags: ["payments", "appointments"] },
  { question: "How can I transfer stock between branches?", answer: "Go to Inventory & Stock Transfer → pick a source and destination salon → choose the product and quantity → confirm the transfer. Stock is moved immediately once confirmed.", tags: ["inventory"] },
  { question: "How is staff commission calculated?", answer: "Commission is calculated per salon based on that salon's own commission rules, then rolled up into the Staff Performance page so you can see revenue and commission earned per staff member across every branch.", tags: ["staff", "finance"] },
  { question: "How can I view branch revenue?", answer: "Multi-Branch Finance gives you a revenue and commission overview across every salon you manage, with a per-salon breakdown and cash management summary.", tags: ["finance"] },
  { question: "How can I generate reports?", answer: "Staff Performance and Payments both support exporting the current view as CSV, Excel, or PDF using the Download button in the page header.", tags: ["reports"] },
];

const ISSUE_TYPES = ["Payment Problem", "Appointment Issue", "Staff / Permissions", "Inventory / Stock", "Reports", "Something else"];

const SYSTEM_COMPONENTS = [
  { name: "Payments", status: "operational" as const },
  { name: "Appointments", status: "operational" as const },
  { name: "Notifications", status: "operational" as const },
  { name: "Reports", status: "operational" as const },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>{children}</div>;
}

function CategoryDetailPanel({ category, faqs, onBack, onOpenFaq }: {
  category: QuickHelpCategory; faqs: FaqItem[]; onBack: () => void; onOpenFaq: (question: string) => void;
}) {
  const navigate = useNavigate();
  const related = faqs.filter((f) => f.tags.includes(category.key));

  return (
    <div style={{ padding: "0 28px 56px" }}>
      <button
        onClick={onBack}
        style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: "#6366f1", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "24px 0 20px" }}
      >
        <ArrowLeft size={14} /> Back to Help
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: "#eef2ff", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{category.icon}</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{category.label}</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>{category.desc}</p>
        </div>
      </div>

      <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.65, maxWidth: 640, margin: "18px 0 26px" }}>{category.intro}</p>

      {category.links.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 32 }}>
          {category.links.map((link) => (
            <button
              key={link.to}
              onClick={() => navigate(link.to)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: "1.5px solid #6366f1", background: "#eef2ff", color: "#6366f1", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Go to {link.label} <ArrowUpRight size={13} />
            </button>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <div>
          <SectionLabel>Related Questions</SectionLabel>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            {related.map((faq, i) => (
              <button
                key={faq.question}
                onClick={() => onOpenFaq(faq.question)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                  padding: "15px 22px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                  borderTop: i > 0 ? "1px solid #f1f5f9" : "none",
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>{faq.question}</span>
                <ArrowUpRight size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReportIssueModal({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const salons = useAppSelector((s) => s.branchOwner.salons);
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [salonId, setSalonId] = useState("");
  const [description, setDescription] = useState("");
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { dispatch(fetchMySalonsThunk()); }, [dispatch]);
  useEffect(() => {
    if (salons.length > 0 && !salonId) setSalonId(salons[0].id);
  }, [salons, salonId]);

  const handleSubmit = async () => {
    if (!salonId) { setError("Select a salon to report the issue against."); return; }
    if (!description.trim()) { setError("Please describe what happened."); return; }
    setError("");
    setSubmitting(true);
    const r = await dispatch(submitBranchOwnerSupportTicketThunk({
      salonId, subject: issueType, category: issueType.toLowerCase().replace(/[^a-z]+/g, "_"), message: description.trim(),
    }));
    setSubmitting(false);
    if (submitBranchOwnerSupportTicketThunk.fulfilled.match(r)) {
      setSubmitted(true);
    } else {
      setError((r.payload as string) || "Failed to submit issue. Please try again.");
    }
  };

  if (submitted) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "32px 28px", maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f0fdf4", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <CheckCircleFill size={22} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 6 }}>Issue reported</div>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Our support team will get back to you shortly.</p>
          <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer" }}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 14, padding: "24px 28px", maxWidth: 460, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a" }}>Report an Issue</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8" }}><X size={18} /></button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Issue Type *</label>
          <Dropdown
            value={issueType}
            onChange={setIssueType}
            options={ISSUE_TYPES.map((t) => ({ id: t, name: t }))}
            searchable={false}
            style={{ width: "100%", padding: "10px 13px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13.5, background: "#fff" }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened…"
            rows={4}
            style={{ width: "100%", padding: "10px 13px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13.5, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Salon / Branch *</label>
          <Dropdown
            value={salonId}
            onChange={setSalonId}
            options={salons.map((s) => ({ id: s.id, name: s.name }))}
            placeholder="Select salon…"
            searchable={false}
            style={{ width: "100%", padding: "10px 13px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13.5, background: "#fff" }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Screenshot</label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, border: "1.5px dashed #cbd5e1", fontSize: 12.5, color: "#64748b", cursor: "pointer" }}>
            {fileName || "Upload screenshot"}
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
          </label>
          {fileName && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Attachments aren't uploaded yet — described in the message instead.</div>}
        </div>

        {error && <div style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={submitting} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "1.5px solid #e2e8f0", background: "#fff", color: "#374151", cursor: submitting ? "not-allowed" : "pointer" }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", background: "#6366f1", color: "#fff", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? "Submitting…" : "Submit Issue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BranchOwnerHelpPage() {
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState<QuickHelpCategory | null>(null);

  const filteredFaqs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter((f) => f.question.toLowerCase().includes(q) || f.tags.some((t) => t.includes(q)));
  }, [search]);

  if (activeCategory) {
    return (
      <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", maxWidth: 1100, margin: "0 auto" }}>
        <CategoryDetailPanel
          category={activeCategory}
          faqs={FAQS}
          onBack={() => setActiveCategory(null)}
          onOpenFaq={(question) => {
            setActiveCategory(null);
            setSearch("");
            const idx = FAQS.findIndex((f) => f.question === question);
            setOpenFaq(idx);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", maxWidth: 1100, margin: "0 auto", padding: "0 0 56px" }}>

      {/* Header + Search */}
      <div style={{ textAlign: "center", padding: "40px 28px 36px", background: "linear-gradient(180deg, #eef2ff 0%, #ffffff 100%)", borderRadius: "0 0 24px 24px", marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Help &amp; Support</div>
        <h1 style={{ margin: "0 0 20px", fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>How can we help you?</h1>
        <div style={{ position: "relative", maxWidth: 560, margin: "0 auto" }}>
          <Search size={15} style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search for help, e.g. "How to customize staff permissions?"'
            style={{ width: "100%", padding: "14px 18px 14px 44px", borderRadius: 14, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff", boxShadow: "0 4px 16px rgba(15,23,42,0.06)" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap", marginTop: 16, fontSize: 12.5 }}>
          <span style={{ color: "#94a3b8" }}>Popular:</span>
          {POPULAR.map((p) => (
            <button
              key={p}
              onClick={() => setSearch(p)}
              style={{ padding: "4px 12px", borderRadius: 20, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 28px" }}>

        {/* Quick Help Categories */}
        <section style={{ marginBottom: 44 }}>
          <SectionLabel>Quick Help</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            {QUICK_HELP.map((c) => (
              <button
                key={c.key}
                onClick={() => setActiveCategory(c)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, textAlign: "left",
                  padding: "18px 18px", borderRadius: 14, border: "1px solid #e2e8f0", background: "#fff",
                  cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 18px rgba(99,102,241,0.12)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eef2ff", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>{c.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{c.label}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{c.desc}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Getting Started */}
        <section style={{ marginBottom: 44 }}>
          <SectionLabel>Getting Started</SectionLabel>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "24px 26px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {GETTING_STARTED.map((step, i) => (
                <div key={step.title} style={{ display: "flex", gap: 16, padding: "14px 0", borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#eef2ff", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{step.title}</div>
                    <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 2 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <button style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: "1.5px solid #6366f1", background: "#eef2ff", color: "#6366f1", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              View Setup Guide →
            </button>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: 44 }}>
          <SectionLabel>Frequently Asked Questions</SectionLabel>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            {filteredFaqs.length === 0 ? (
              <div style={{ padding: "32px 26px", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>No results for "{search}".</div>
            ) : (
              filteredFaqs.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={faq.question} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                        padding: "16px 26px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{faq.question}</span>
                      {isOpen ? <ChevronUp size={15} style={{ color: "#6366f1", flexShrink: 0 }} /> : <ChevronDown size={15} style={{ color: "#94a3b8", flexShrink: 0 }} />}
                    </button>
                    {isOpen && (
                      <div style={{ padding: "0 26px 18px", fontSize: 13.5, color: "#64748b", lineHeight: 1.6 }}>{faq.answer}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Contact Support */}
        <section style={{ marginBottom: 44 }}>
          <SectionLabel>Still Need Help?</SectionLabel>
          <p style={{ margin: "-6px 0 16px", fontSize: 13, color: "#94a3b8" }}>Our support team is here to help.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 14 }}>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "#f0fdf4", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}><Chat size={16} /></div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Chat with Support</div>
              </div>
              <div style={{ fontSize: 12.5, color: "#94a3b8", marginBottom: 14 }}>Get help from our team</div>
              <button disabled title="Live chat isn't available yet" style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#e2e8f0", color: "#94a3b8", fontSize: 12.5, fontWeight: 700, cursor: "not-allowed", marginBottom: 12 }}>
                Start Chat
              </button>
              <div style={{ fontSize: 12.5, color: "#374151", paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                Or call us: <a href="tel:+919503302647" style={{ color: "#16a34a", fontWeight: 700, textDecoration: "none" }}>+91 95033 02647</a>
              </div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}><EnvelopeFill size={15} /></div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Email Support</div>
              </div>
              <div style={{ fontSize: 12.5, color: "#94a3b8", marginBottom: 14 }}>We'll get back to you</div>
              <a
                href="mailto:support@salonox.com"
                style={{ display: "inline-block", padding: "8px 16px", borderRadius: 8, border: "none", background: "#eef2ff", color: "#6366f1", fontSize: 12.5, fontWeight: 700, textDecoration: "none", marginBottom: 12 }}
              >
                Contact Us
              </a>
              <div style={{ fontSize: 12.5, color: "#374151", paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                <a href="mailto:support@salonox.com" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>support@salonox.com</a>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Support availability: Mon–Sat, 9 AM–7 PM</div>
        </section>

        {/* Report a Problem */}
        <section style={{ marginBottom: 44 }}>
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#fff", color: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Bug size={18} /></div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Report a Problem</div>
                <div style={{ fontSize: 12.5, color: "#9a5b13" }}>Found something that's not working?</div>
              </div>
            </div>
            <button
              onClick={() => setShowReportModal(true)}
              style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#ea580c", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Report an Issue
            </button>
          </div>
        </section>

        {/* System Status */}
        <section>
          <SectionLabel>System Status</SectionLabel>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <CheckCircleFill size={14} style={{ color: "#16a34a" }} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#16a34a" }}>All systems operational</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              {SYSTEM_COMPONENTS.map((c) => (
                <div key={c.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: "#374151" }}>
                  <span>{c.name}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#16a34a", fontWeight: 600, fontSize: 12 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
                    Operational
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>

      {showReportModal && <ReportIssueModal onClose={() => setShowReportModal(false)} />}
    </div>
  );
}
