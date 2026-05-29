import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import "../styles/LegalPage.scss";

interface LegalSection {
  icon: string;
  title: string;
  content: React.ReactNode;
}

interface LegalPageLayoutProps {
  badge: string;
  title: string;
  subtitle: string;
  sections: LegalSection[];
  contactEmail: string;
}

export default function LegalPageLayout({
  badge,
  title,
  subtitle,
  sections,
  contactEmail,
}: LegalPageLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="legal-root">
      {/* ── Hero ── */}
      <div className="legal-hero">
        <div className="legal-hero__orb legal-hero__orb--1" />
        <div className="legal-hero__orb legal-hero__orb--2" />

        {/* Top bar: back button left, brand right */}
        <div className="legal-hero__topbar">
          <button className="legal-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Back
          </button>
          <div className="legal-brand">
            <span className="legal-brand__gem" />
            salonox
          </div>
        </div>

        {/* Centered content */}
        <div className="legal-hero__inner">
          <div className="legal-badge">
            <span className="legal-badge__dot" />
            {badge}
          </div>

          <h1 className="legal-hero__title">{title}</h1>
          <p className="legal-hero__sub">{subtitle}</p>
          <div className="legal-gold-line" />
        </div>
      </div>

      {/* ── Updated date ── */}
      <div className="legal-meta">
        <span>Last updated: <strong>May 20, 2026</strong></span>
      </div>

      {/* ── Sections ── */}
      <div className="legal-body">
        {sections.map((sec, i) => (
          <div className="legal-section" key={i}>
            <div className="legal-section__icon">{sec.icon}</div>
            <div className="legal-section__body">
              <div className="legal-section__num">0{i + 1}</div>
              <h2 className="legal-section__title">{sec.title}</h2>
              <div className="legal-section__text">{sec.content}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer CTA ── */}
      <div className="legal-footer">
        <div className="legal-footer__card">
          <h3>Questions or concerns?</h3>
          <p>Our team is happy to help clarify anything in this document.<br />Reach out anytime.</p>
          <a href={`mailto:${contactEmail}`}>
            <Mail size={15} /> {contactEmail}
          </a>
        </div>
      </div>
    </div>
  );
}
