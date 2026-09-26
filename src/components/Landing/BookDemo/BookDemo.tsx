import React, { useEffect, useState } from 'react';
import PhoneInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import {
  CountrySelectSearch,
  DEMO_EMAIL,
  DEMO_PHONE_DEFAULT_COUNTRY,
  Icon,
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
  nameTouched: boolean;
  nameError: string;
  emailTouched: boolean;
  emailError: string;
  emailOtp: string;
  emailOtpSent: boolean;
  emailOtpVerified: boolean;
  otpSending: boolean;
  otpVerifying: boolean;
  otpMessage: string;
  otpError: string;
  otpCooldown: number;
  otpSecondsRemaining: number;
  otpAttemptsRemaining: number;
  phoneCountry: import('react-phone-number-input').Country | undefined;
  phoneTouched: boolean;
  phoneError: string;
  salonTouched: boolean;
  salonError: string;
  cityTouched: boolean;
  cityError: string;
  locationsTouched: boolean;
  locationsError: string;
  handleDemoChange: (field: keyof Omit<DemoForm, 'phone'>) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleNameBlur: () => void;
  handleEmailBlur: () => void;
  handleSendEmailOtp: () => void;
  handleEmailOtpChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleVerifyEmailOtp: () => void;
  handleSalonBlur: () => void;
  handleCityBlur: () => void;
  handleLocationsBlur: () => void;
  handlePhoneChange: (value?: string) => void;
  handlePhoneBlur: () => void;
  handlePhoneCountryChange: (country?: import('react-phone-number-input').Country) => void;
  handleDemoSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

const BookDemo: React.FC<BookDemoProps> = ({
  demoForm,
  demoSubmitted,
  demoSubmitting,
  demoError,
  nameTouched,
  nameError,
  emailTouched,
  emailError,
  emailOtp,
  emailOtpSent,
  emailOtpVerified,
  otpSending,
  otpVerifying,
  otpMessage,
  otpError,
  otpCooldown,
  otpSecondsRemaining,
  otpAttemptsRemaining,
  phoneCountry,
  phoneTouched,
  phoneError,
  salonTouched,
  salonError,
  cityTouched,
  cityError,
  locationsTouched,
  locationsError,
  handleDemoChange,
  handleNameBlur,
  handleEmailBlur,
  handleSendEmailOtp,
  handleEmailOtpChange,
  handleVerifyEmailOtp,
  handleSalonBlur,
  handleCityBlur,
  handleLocationsBlur,
  handlePhoneChange,
  handlePhoneBlur,
  handlePhoneCountryChange,
  handleDemoSubmit,
}) => {
  const [isMobileBookDemo, setIsMobileBookDemo] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateBookDemoLayout = () => setIsMobileBookDemo(mediaQuery.matches);

    updateBookDemoLayout();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateBookDemoLayout);
      return () => mediaQuery.removeEventListener('change', updateBookDemoLayout);
    }

    mediaQuery.addListener(updateBookDemoLayout);
    return () => mediaQuery.removeListener(updateBookDemoLayout);
  }, []);

  return (
  <section id="book-demo" className="demo-section">
    <SectionTransition from="light" />
    <SectionArtwork variant="contact" />
    <div className="demo-visual-layer" aria-hidden="true">
      <img className="demo-salon-photo" src="/screenshots/salonox-salon-hero.webp" alt="" loading="lazy" />
      <img className="demo-dashboard-ghost" src="/screenshots/salonox-salon-hero.webp" alt="" loading="lazy" />
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
                <address>123 MG Road, Koregaon Park, Pune, Maharashtra 411001, India</address>
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

        </div>
      </Reveal>

      <Reveal delay={1} className={`demo-card-wrap${isMobileBookDemo ? ' demo-card-wrap--mobile' : ''}`}>
        <div className={`demo-card${isMobileBookDemo ? ' demo-card--mobile' : ''}`}>
          {demoSubmitted ? (
            <div className="demo-success">
              <span className="demo-success-icon"><Icon.Check /></span>
              <h3>Thanks — you're booked in!</h3>
              <p>A member of our team will reach out within 1 business day to confirm your demo.</p>
            </div>
          ) : (
            <>
              {isMobileBookDemo && (
                <div className="demo-mobile-intro">
                  <span className="demo-mobile-pill">Mobile booking</span>
                </div>
              )}
              <h3>Schedule a Free Demo</h3>
              <p>See SalonOX live in action and ask all your questions.</p>
              <form className="demo-form" onSubmit={handleDemoSubmit}>
                <label className="demo-field">
                  <span>Your Name <span className="demo-required" aria-label="required">*</span></span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Lee"
                    value={demoForm.name}
                    onChange={handleDemoChange('name')}
                    onBlur={handleNameBlur}
                    autoFocus={isMobileBookDemo}
                    className={nameTouched && nameError ? 'is-invalid' : ''}
                    aria-invalid={nameTouched && !!nameError}
                    aria-describedby={nameTouched && nameError ? 'demo-name-error' : undefined}
                  />
                  {nameTouched && nameError && (
                    <span className="demo-field-error" id="demo-name-error" role="alert">{nameError}</span>
                  )}
                </label>
                <div className="demo-field">
                  <span id="demo-email-label">Work Email <span className="demo-required" aria-label="required">*</span></span>
                  <div className="demo-email-control">
                    <input
                      type="email"
                      required
                      placeholder="name@gmail.com"
                      value={demoForm.email}
                      onChange={handleDemoChange('email')}
                      onBlur={handleEmailBlur}
                      className={emailTouched && emailError ? 'is-invalid' : ''}
                      aria-labelledby="demo-email-label"
                      aria-invalid={emailTouched && !!emailError}
                      aria-describedby={emailTouched && emailError ? 'demo-email-error' : undefined}
                    />
                    <button
                      type="button"
                      className={`demo-otp-action${emailOtpVerified ? ' is-verified' : ''}`}
                      onClick={handleSendEmailOtp}
                      disabled={otpSending || emailOtpVerified || otpCooldown > 0}
                    >
                      {emailOtpVerified
                        ? 'Verified'
                        : otpSending
                          ? 'Sending...'
                          : otpCooldown > 0
                            ? `Resend in ${otpCooldown}s`
                            : emailOtpSent
                              ? 'Resend OTP'
                              : 'Send OTP'}
                    </button>
                  </div>
                  {emailTouched && emailError && (
                    <span className="demo-field-error" id="demo-email-error" role="alert">{emailError}</span>
                  )}
                  {otpMessage && (
                    <span className={`demo-otp-message${emailOtpVerified ? ' is-verified' : ''}`} role="status">
                      {otpMessage}
                    </span>
                  )}
                  {otpError && <span className="demo-field-error" role="alert">{otpError}</span>}
                </div>
                {emailOtpSent && !emailOtpVerified && (
                  <div className="demo-field demo-otp-field">
                    <span id="demo-otp-label">Email OTP</span>
                    <div className="demo-email-control">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="6-digit OTP"
                        value={emailOtp}
                        onChange={handleEmailOtpChange}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleVerifyEmailOtp();
                          }
                        }}
                        aria-labelledby="demo-otp-label"
                        aria-invalid={!!otpError}
                      />
                      <button
                        type="button"
                        className="demo-otp-action"
                        onClick={handleVerifyEmailOtp}
                        disabled={otpVerifying || emailOtp.length !== 6 || otpSecondsRemaining <= 0 || otpAttemptsRemaining <= 0}
                      >
                        {otpVerifying ? 'Verifying...' : 'Verify OTP'}
                      </button>
                    </div>
                    {otpSecondsRemaining > 0 && (
                      <span className="demo-otp-hint">
                        Expires in {Math.floor(otpSecondsRemaining / 60)}:{String(otpSecondsRemaining % 60).padStart(2, '0')}
                        {otpAttemptsRemaining < 5 ? ` · ${otpAttemptsRemaining} attempts remaining` : ''}
                      </span>
                    )}
                  </div>
                )}
                {/* A `<div>`, not a `<label>` — the country dropdown below contains a
                    search input and clickable options, and a wrapping `<label>` forwards
                    clicks that bubble up to it from elsewhere inside onto its implicit
                    associated control (the country trigger button), reopening the dropdown
                    right after a selection. `aria-labelledby` keeps it accessibly labeled. */}
                <div className="demo-field">
                  <span id="demo-phone-label">Mobile Number <span className="demo-required" aria-label="required">*</span></span>
                  <PhoneInput
                    addInternationalOption={false}
                    country={phoneCountry}
                    defaultCountry={DEMO_PHONE_DEFAULT_COUNTRY}
                    flags={flags}
                    countrySelectComponent={CountrySelectSearch}
                    placeholder="9876543210"
                    value={demoForm.phone}
                    onChange={handlePhoneChange}
                    onCountryChange={handlePhoneCountryChange}
                    onBlur={handlePhoneBlur}
                    numberInputProps={{
                      required: true,
                      maxLength: phoneCountry === 'IN' ? 11 : undefined,
                    }}
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
                  <span>Salon Name <span className="demo-required" aria-label="required">*</span></span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. The Glow Room"
                    value={demoForm.salon}
                    onChange={handleDemoChange('salon')}
                    onBlur={handleSalonBlur}
                    className={salonTouched && salonError ? 'is-invalid' : ''}
                    aria-invalid={salonTouched && !!salonError}
                    aria-describedby={salonTouched && salonError ? 'demo-salon-error' : undefined}
                  />
                  {salonTouched && salonError && (
                    <span className="demo-field-error" id="demo-salon-error" role="alert">{salonError}</span>
                  )}
                </label>
                <label className="demo-field">
                  <span>City <span className="demo-required" aria-label="required">*</span></span>
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
                  <span>Locations <span className="demo-required" aria-label="required">*</span></span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    inputMode="numeric"
                    pattern="[1-9][0-9]*"
                    placeholder="e.g. 1"
                    value={demoForm.locations}
                    onChange={handleDemoChange('locations')}
                    onBlur={handleLocationsBlur}
                    className={locationsTouched && locationsError ? 'is-invalid' : ''}
                    aria-invalid={locationsTouched && !!locationsError}
                    aria-describedby={locationsTouched && locationsError ? 'demo-locations-error' : undefined}
                  />
                  {locationsTouched && locationsError && (
                    <span className="demo-field-error" id="demo-locations-error" role="alert">{locationsError}</span>
                  )}
                </label>
                {demoError && <p className="demo-error" role="alert">{demoError}</p>}
                <button type="submit" className="btn btn-primary btn-block" disabled={demoSubmitting || !emailOtpVerified}>
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
};

export default React.memo(BookDemo);
