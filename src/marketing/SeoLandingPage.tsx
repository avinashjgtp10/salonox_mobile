import { Link } from "react-router-dom";
import { WHATSAPP_DEMO_URL } from "../components/Landing/shared";
import { PLAN_PERIOD, PLANS } from "./seo.config";
import type { SeoPage } from "./seoPages";
import "./SeoLandingPage.scss";

// Same number as the landing page CTA; only the pre-filled message differs.
const whatsappUrl = (text: string) => `${WHATSAPP_DEMO_URL.split("?")[0]}?text=${encodeURIComponent(text)}`;

export function SeoLandingPage({ page }: { page: SeoPage }) {
  const place = page.city ? ` in ${page.city}` : "";
  const demoUrl = whatsappUrl(
    `Hi SalonOX Team, I am interested in SalonOX for my ${page.audienceSingular}${place}. Please share more details and schedule a demo.`,
  );

  return (
    <div className="seo-page">
      <header className="seo-header">
        <div className="seo-container seo-header-inner">
          <a href="/" aria-label="SalonOX home">
            <img src="/salonox-full-logo.webp" alt="SalonOX" width="140" height="45" />
          </a>
          <nav className="seo-nav" aria-label="Primary">
            <Link to="/login" className="seo-link">Log in</Link>
            <a href={demoUrl} className="seo-btn seo-btn--primary" target="_blank" rel="noopener noreferrer">
              Book a demo
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="seo-hero">
          <div className="seo-container">
            <h1>{page.h1}</h1>
            <p className="seo-lead">{page.intro}</p>
            <div className="seo-actions">
              <a href={demoUrl} className="seo-btn seo-btn--primary" target="_blank" rel="noopener noreferrer">
                Book a demo on WhatsApp
              </a>
              <a href="#pricing" className="seo-btn seo-btn--ghost">See pricing</a>
            </div>
          </div>
        </section>

        <section className="seo-section">
          <div className="seo-container">
            <h2>{`Problems ${page.audienceSingular} owners${place} run into`}</h2>
            <div className="seo-grid">
              {page.painPoints.map((p) => (
                <article key={p.title} className="seo-card">
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="seo-section seo-section--alt">
          <div className="seo-container">
            <h2>{`What SalonOX gives your ${page.audienceSingular}`}</h2>
            <div className="seo-grid">
              {page.features.map((f) => (
                <article key={f.title + f.body} className="seo-card">
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="seo-section" id="pricing">
          <div className="seo-container">
            <h2>Pricing</h2>
            {page.pricing === "plans" ? (
              <div className="seo-grid">
                {PLANS.map((plan) => (
                  <article key={plan.name} className="seo-card">
                    <h3>{plan.name}</h3>
                    <p className="seo-price">{`₹${plan.price.toLocaleString("en-IN")}`}<span className="seo-period">{PLAN_PERIOD.label}</span></p>
                    <p>{plan.description}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="seo-card">TODO: pricing for this market (AED) has not been decided yet.</p>
            )}
          </div>
        </section>

        <section className="seo-section seo-section--alt">
          <div className="seo-container">
            <h2>Frequently asked questions</h2>
            {page.faqs.map((f) => (
              <div key={f.q} className="seo-faq">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="seo-cta">
          <div className="seo-container">
            <h2>{`See SalonOX running in your ${page.audienceSingular}`}</h2>
            <a href={demoUrl} className="seo-btn seo-btn--primary" target="_blank" rel="noopener noreferrer">
              Book a demo on WhatsApp
            </a>
          </div>
        </section>
      </main>

      <footer className="seo-footer">
        <div className="seo-container">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <span suppressHydrationWarning>{`© ${new Date().getFullYear()} SalonOX`}</span>
        </div>
      </footer>
    </div>
  );
}
