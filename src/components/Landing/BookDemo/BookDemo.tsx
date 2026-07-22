import React from 'react';
import PhoneInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import {
  CountrySelectSearch,
  DEMO_EMAIL,
  DEMO_PHONE_DEFAULT_COUNTRY,
  Icon,
  OFFICE_MAP_EMBED_URL,
  OFFICE_MAP_URL,
  Reveal,
  SectionArtwork,
  SectionTransition,
  type DemoForm,
} from '../shared';

type BookDemoProps = {
  demoForm: DemoForm;
  demoSubmitted: boolean;
  demoSubmitting: boolean;
  demoError: string;
  phoneTouched: boolean;
  phoneError: string;
  cityTouched: boolean;
  cityError: string;
  handleDemoChange: (field: keyof Omit<DemoForm, 'phone'>) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleCityBlur: () => void;
  handlePhoneChange: (value?: string) => void;
  handlePhoneBlur: () => void;
  handlePhoneCountryChange: (country?: import('react-phone-number-input').Country) => void;
  handleDemoSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

const BookDemo: React.FC<BookDemoProps> = ({ demoForm, demoSubmitted, demoSubmitting, demoError, phoneTouched, phoneError, cityTouched, cityError, handleDemoChange, handleCityBlur, handlePhoneChange, handlePhoneBlur, handlePhoneCountryChange, handleDemoSubmit }) => (
  <section id="book-demo" className="demo-section">
    <SectionTransition from="light" />
    <SectionArtwork variant="contact" />
    <div className="demo-visual-layer" aria-hidden="true">
      <img className="demo-salon-photo" src="/screenshots/salonox-salon-hero.png" alt="" loading="lazy" />
      <img className="demo-dashboard-ghost" src="/screenshots/salonox-salon-hero.png" alt="" loading="lazy" />
      <svg className="demo-connector-map" viewBox="0 0 1440 760" preserveAspectRatio="none" focusable="false">
        <path d="M550 150 C650 225 485 315 560 410 C650 520 815 410 920 500" />
        <path d="M760 135 C850 225 1010 160 1080 70" />
        <path d="M595 515 C730 590 850 555 1010 625" />
      </svg>
      <span className="demo-pin demo-pin--a"><Icon.Location /></span>
      <span className="demo-pin demo-pin--b"><Icon.Location /></span>
      <span className="demo-pin demo-pin--c"><Icon.Location /></span>
      <span className="demo-pin demo-pin--d"><Icon.Location /></span>
      <div className="demo-floating-card demo-floating-card--scheduled">
        <span><Icon.Calendar /></span>
        <p><strong>Demo Scheduled</strong><em>We'll connect with you soon!</em></p>
        <i />
      </div>
      <div className="demo-floating-card demo-floating-card--revenue">
        <span><Icon.TrendingUp /></span>
        <p><em>Monthly Revenue</em><strong>₹2,45,000</strong><small>↑ 18.6% vs last month</small></p>
      </div>
      <div className="demo-floating-card demo-floating-card--salons">
        <span><Icon.Users /></span>
        <p><em>Happy Salons</em><strong>2,450+</strong><small>and growing</small></p>
      </div>
      <div className="demo-floating-card demo-floating-card--duration">
        <span><Icon.Calendar /></span>
        <p><strong>30 Minutes</strong><em>Live Demo</em></p>
      </div>
      <div className="demo-floating-card demo-floating-card--secure">
        <span><Icon.Shield /></span>
        <p><strong>No Credit Card</strong><em>Required</em></p>
      </div>
      <div className="demo-floating-card demo-floating-card--consult">
        <span><Icon.MessageCircle /></span>
        <p><strong>Free Consultation</strong><em>For Your Salon</em></p>
      </div>
    </div>
    <div className="container demo-grid">
      <Reveal className="demo-copy">
        <h2>Ready to Grow Your Salon <span>Business?</span></h2>
        <p>Everything you need to manage and scale your salon operations from one platform.</p>
        <div className="demo-contact">
          <a href={`mailto:${DEMO_EMAIL}`} className="demo-contact-row">
            <span className="demo-contact-icon"><Icon.Mail /></span>
            {DEMO_EMAIL}
          </a>
          <a href="tel:+919503302647" className="demo-contact-row">
            <span className="demo-contact-icon"><Icon.Phone /></span>
            +91 9503302647
          </a>
        </div>

        <div className="office-location-card">
          <div className="office-location-content">
            <span className="office-location-icon" aria-hidden="true"><Icon.Location /></span>
            <div className="office-location-copy">
              <span className="office-location-label">Visit Our Office</span>
              <a
                href={OFFICE_MAP_URL}
                className="office-address-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <h3>SalonOX Tech</h3>
                <address>JI Tower, 107, near Lakme Academy, Baramati, Maharashtra 413102</address>
              </a>
              <a
                href={OFFICE_MAP_URL}
                className="btn btn-primary office-location-button"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Directions <Icon.Arrow />
              </a>
            </div>
          </div>

          <div className="office-map-wrap">
            <iframe
              src={OFFICE_MAP_EMBED_URL}
              title="SalonOX Tech office location on Google Maps"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <a
              href={OFFICE_MAP_URL}
              className="office-map-click-target"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open SalonOX Tech office location on Google Maps"
            />
            <a
              href={OFFICE_MAP_URL}
              className="office-map-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Google Maps <Icon.Arrow />
            </a>
          </div>
        </div>
      </Reveal>

      <Reveal delay={1} className="demo-card-wrap">
        <div className="demo-card">
          {demoSubmitted ? (
            <div className="demo-success">
              <span className="demo-success-icon"><Icon.Check /></span>
              <h3>Thanks — you're booked in!</h3>
              <p>A member of our team will reach out within 1 business day to confirm your demo.</p>
            </div>
          ) : (
            <>
              <h3>Schedule a Free Demo</h3>
              <p>See SalonOX live in action and ask all your questions.</p>
              <form className="demo-form" onSubmit={handleDemoSubmit}>
                <label className="demo-field">
                  <span>Your Name</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Lee"
                    value={demoForm.name}
                    onChange={handleDemoChange('name')}
                  />
                </label>
                <label className="demo-field">
                  <span>Work Email</span>
                  <input
                    type="email"
                    required
                    placeholder="you@yoursalon.com"
                    value={demoForm.email}
                    onChange={handleDemoChange('email')}
                  />
                </label>
                {/* A `<div>`, not a `<label>` — the country dropdown below contains a
                    search input and clickable options, and a wrapping `<label>` forwards
                    clicks that bubble up to it from elsewhere inside onto its implicit
                    associated control (the country trigger button), reopening the dropdown
                    right after a selection. `aria-labelledby` keeps it accessibly labeled. */}
                <div className="demo-field">
                  <span id="demo-phone-label">Mobile Number</span>
                  <PhoneInput
                    addInternationalOption={false}
                    defaultCountry={DEMO_PHONE_DEFAULT_COUNTRY}
                    flags={flags}
                    countrySelectComponent={CountrySelectSearch}
                    placeholder="9876543210"
                    value={demoForm.phone}
                    onChange={handlePhoneChange}
                    onCountryChange={handlePhoneCountryChange}
                    onBlur={handlePhoneBlur}
                    numberInputProps={{ required: true }}
                    className={phoneTouched && phoneError ? 'PhoneInput--invalid' : ''}
                    aria-labelledby="demo-phone-label"
                    aria-invalid={phoneTouched && !!phoneError}
                    aria-describedby={phoneTouched && phoneError ? 'demo-phone-error' : undefined}
                  />
                  {phoneTouched && phoneError && (
                    <span className="demo-field-error" id="demo-phone-error" role="alert">{phoneError}</span>
                  )}
                </div>
                <label className="demo-field">
                  <span>Salon Name</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. The Glow Room"
                    value={demoForm.salon}
                    onChange={handleDemoChange('salon')}
                  />
                </label>
                <label className="demo-field">
                  <span>City</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai"
                    value={demoForm.city}
                    onChange={handleDemoChange('city')}
                    onBlur={handleCityBlur}
                    className={cityTouched && cityError ? 'is-invalid' : ''}
                    aria-invalid={cityTouched && !!cityError}
                    aria-describedby={cityTouched && cityError ? 'demo-city-error' : undefined}
                  />
                  {cityTouched && cityError && (
                    <span className="demo-field-error" id="demo-city-error" role="alert">{cityError}</span>
                  )}
                </label>
                <label className="demo-field">
                  <span>Locations</span>
                  <select required value={demoForm.locations} onChange={handleDemoChange('locations')}>
                    <option value="" disabled>Select locations count</option>
                    <option value="1">1 location</option>
                    <option value="2-5">2–5 locations</option>
                    <option value="6-15">6–15 locations</option>
                    <option value="16+">16+ locations</option>
                  </select>
                </label>
                {demoError && <p className="demo-error" role="alert">{demoError}</p>}
                <button type="submit" className="btn btn-primary btn-block" disabled={demoSubmitting}>
                  {demoSubmitting ? 'Sending...' : 'Schedule Demo'}
                </button>
                <label className="demo-consent">
                  <input
                    type="checkbox"
                    required
                    checked={demoForm.agreed}
                    onChange={handleDemoChange('agreed')}
                  />
                  <span>By checking, you agree to receive follow-up emails regarding SalonOX product demos.</span>
                </label>
          </form>
            </>
          )}
        </div>
      </Reveal>
    </div>
    <div className="container demo-trust-strip" aria-label="Demo benefits">
      <span><i><Icon.Calendar /></i><strong>Live Product Demo</strong><em>See SalonOX in action</em></span>
      <span><i><Icon.MessageCircle /></i><strong>Ask Anything</strong><em>Get answers instantly</em></span>
      <span><i><Icon.Spark /></i><strong>Tailored for You</strong><em>Solution for your salon</em></span>
      <span><i><Icon.Check /></i><strong>No Commitment</strong><em>Absolutely free</em></span>
    </div>
  </section>
);

export default React.memo(BookDemo);
