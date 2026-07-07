import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFeaturesDropdownOpen, setIsFeaturesDropdownOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const dropdownRef = useRef<HTMLLIElement>(null);

  // Scroll listener for active link highlighting
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const sections = ['features', 'solutions', 'pricing', 'faq', 'contact'];
      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const sectionHeight = el.offsetHeight;
          const sectionTop = el.offsetTop - 120; // offset for sticky header
          if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            setActiveSection(sectionId);
            return;
          }
        }
      }
      setActiveSection('');
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Click outside to close features dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFeaturesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMenu = () => {
    setIsMobileMenuOpen(false);
    setIsFeaturesDropdownOpen(false);
  };

  return (
    <header className="navbar-header">
      <div className="container navbar-container">
        <a href="#" className="logo" id="nav-logo" onClick={closeMenu}>
          <img
            src={require('@/assets/images/logo.png')}
            alt="SalonOX Logo"
            className="logo-icon"
            height="40"
          />
          <span className="logo-text">Salonox</span>
        </a>

        <button
          className="mobile-menu-btn"
          aria-label={isMobileMenuOpen ? 'Close Menu' : 'Open Menu'}
          aria-expanded={isMobileMenuOpen}
          onClick={toggleMobileMenu}
          id="mobile-menu-toggle"
        >
          <svg
            className="hamburger"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d={isMobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M3 12H21'}
              stroke="#243B34"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {!isMobileMenuOpen && (
              <>
                <path d="M3 6H21" stroke="#243B34" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 18H21" stroke="#243B34" strokeWidth="2" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>

        <nav className={`nav-menu ${isMobileMenuOpen ? 'active' : ''}`} id="nav-menu">
          <ul className="nav-list">
            <li
              ref={dropdownRef}
              className={`nav-item-dropdown ${isFeaturesDropdownOpen ? 'open' : ''}`}
              id="features-dropdown-item"
            >
              <span
                className="nav-link nav-link-dropdown"
                tabIndex={0}
                id="features-dropdown-trigger"
                aria-expanded={isFeaturesDropdownOpen}
                onClick={() => setIsFeaturesDropdownOpen(!isFeaturesDropdownOpen)}
              >
                Features
                <svg
                  className="dropdown-arrow"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 9L12 15L18 9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              <div
                className="dropdown-panel"
                id="features-dropdown-panel"
                role="menu"
                style={{ display: isFeaturesDropdownOpen ? 'block' : 'none' }}
              >
                <div className="dropdown-header">All Features</div>
                <div className="dropdown-grid">
                  <a href="#features" className="dropdown-item" role="menuitem" onClick={closeMenu}>
                    <span className="dropdown-item-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3.01 4.9 3.01 6L3 20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V9H19V20ZM7 11H12V16H7V11Z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    <span>
                      <span className="dropdown-item-title">Appointment Scheduling</span>
                      <span className="dropdown-item-desc">Smart calendar, online booking &amp; waitlists</span>
                    </span>
                  </a>
                  <a href="#features" className="dropdown-item" role="menuitem" onClick={closeMenu}>
                    <span className="dropdown-item-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    <span>
                      <span className="dropdown-item-title">POS &amp; Billing</span>
                      <span className="dropdown-item-desc">Payments, tips, discounts &amp; digital receipts</span>
                    </span>
                  </a>
                  <a href="#features" className="dropdown-item" role="menuitem" onClick={closeMenu}>
                    <span className="dropdown-item-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 2 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    <span>
                      <span className="dropdown-item-title">Customer CRM</span>
                      <span className="dropdown-item-desc">Client history, formulas &amp; preference cards</span>
                    </span>
                  </a>
                  <a href="#features" className="dropdown-item" role="menuitem" onClick={closeMenu}>
                    <span className="dropdown-item-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    <span>
                      <span className="dropdown-item-title">Staff Management</span>
                      <span className="dropdown-item-desc">Shifts, commissions &amp; attendance tracking</span>
                    </span>
                  </a>
                  <a href="#features" className="dropdown-item" role="menuitem" onClick={closeMenu}>
                    <span className="dropdown-item-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    <span>
                      <span className="dropdown-item-title">Inventory Management</span>
                      <span className="dropdown-item-desc">Low-stock alerts &amp; vendor purchase orders</span>
                    </span>
                  </a>
                  <a href="#features" className="dropdown-item" role="menuitem" onClick={closeMenu}>
                    <span className="dropdown-item-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.817 9.817 0 0 0 12.04 2zm4.82 13.99c-.27.76-1.34 1.38-1.85 1.43-.51.05-1.01.07-2.9-.66-2.42-.93-3.96-3.39-4.08-3.55-.12-.16-.97-1.29-.97-2.46 0-1.17.61-1.75.83-1.99.22-.24.49-.3.65-.3s.33 0 .46.01c.15.01.35-.06.55.42.2.49.69 1.68.75 1.8.06.12.1.27.02.43-.08.16-.12.26-.24.4-.12.14-.26.31-.37.42-.12.12-.25.25-.11.49.14.24.63 1.03 1.35 1.67.93.83 1.71 1.09 1.95 1.21.24.12.38.1.52-.06.14-.16.61-.71.77-.95.16-.24.33-.2.55-.12.22.08 1.41.67 1.65.79.24.12.4.18.46.28.06.11.06.63-.21 1.39z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    <span>
                      <span className="dropdown-item-title">WhatsApp Marketing</span>
                      <span className="dropdown-item-desc">Automated reminders, offers &amp; review requests</span>
                    </span>
                  </a>
                  <a href="#features" className="dropdown-item" role="menuitem" onClick={closeMenu}>
                    <span className="dropdown-item-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    <span>
                      <span className="dropdown-item-title">Memberships &amp; Loyalty</span>
                      <span className="dropdown-item-desc">Packages, points programs &amp; gift cards</span>
                    </span>
                  </a>
                  <a href="#features" className="dropdown-item" role="menuitem" onClick={closeMenu}>
                    <span className="dropdown-item-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    <span>
                      <span className="dropdown-item-title">Reports &amp; Analytics</span>
                      <span className="dropdown-item-desc">Real-time sales, staff &amp; retention reports</span>
                    </span>
                  </a>
                  <a href="#features" className="dropdown-item" role="menuitem" onClick={closeMenu}>
                    <span className="dropdown-item-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 7V3H2v18h20V7H12zm-6 12H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm6 12h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm8 12h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    <span>
                      <span className="dropdown-item-title">Multi-Branch Management</span>
                      <span className="dropdown-item-desc">Central control for all your locations</span>
                    </span>
                  </a>
                </div>
              </div>
            </li>
            <li>
              <a
                href="#solutions"
                className={`nav-link ${activeSection === 'solutions' ? 'active-nav-link' : ''}`}
                onClick={closeMenu}
              >
                Multi-Branch
              </a>
            </li>
            <li>
              <a href="#" className="nav-link" onClick={closeMenu}>
                Why Salonox
              </a>
            </li>
            <li>
              <a
                href="#pricing"
                className={`nav-link ${activeSection === 'pricing' ? 'active-nav-link' : ''}`}
                onClick={closeMenu}
              >
                Pricing
              </a>
            </li>
            <li>
              <a
                href="#faq"
                className={`nav-link ${activeSection === 'faq' ? 'active-nav-link' : ''}`}
                onClick={closeMenu}
              >
                FAQ
              </a>
            </li>
          </ul>
          <div className="nav-cta">
            <Link href="/login" asChild>
              <a className="nav-signin" onClick={closeMenu}>
                Sign In
              </a>
            </Link>
            <a href="#contact" className="btn btn-primary nav-btn" onClick={closeMenu}>
              Book Free Demo
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
