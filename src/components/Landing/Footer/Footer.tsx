import React from 'react';
import {
  Link } from 'react-router-dom';
import {
  Icon,
  WHATSAPP_DEMO_URL,
} from '../shared';
import { SOCIAL } from '../../../marketing/seo.config';

type FooterProps = {
  scrollToSection: (id: string) => (event: React.MouseEvent<HTMLElement>) => void;
  handleContentRouteClick: (path: string) => (event: React.MouseEvent<HTMLAnchorElement>) => void;
  handleContactUsClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
};

const Footer: React.FC<FooterProps> = ({
  scrollToSection,
  handleContentRouteClick,
  handleContactUsClick,
}) => (
  <footer className="footer">
    <div className="container">
      <div className="footer-top">
        <div className="footer-brand">
          <p>The all-in-one platform for salons and spas to book, manage, and grow with confidence.</p>
          <div className="footer-social">
            <a href={SOCIAL.instagram} aria-label="Instagram" target="_blank" rel="noopener noreferrer"><Icon.Instagram /></a>
            <a
              href={WHATSAPP_DEMO_URL}
              aria-label="WhatsApp"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon.WhatsApp />
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h5>Product</h5>
          <ul>
            <li><a href="#features" onClick={scrollToSection('features')}>Scheduling</a></li>
            <li><a href="#features" onClick={scrollToSection('features')}>Payments</a></li>
            <li><a href="#features" onClick={scrollToSection('features')}>Marketing</a></li>
            <li><a href="#pricing" onClick={scrollToSection('pricing')}>Pricing</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h5>Company</h5>
          <ul>
            <li><Link to="/about" onClick={handleContentRouteClick('/about')}>About</Link></li>
            <li><a href="#book-demo" onClick={handleContactUsClick}>Contact Us</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h5>Resources</h5>
          <ul>
            <li><a href="#">Help center</a></li>
            <li><a href="#">Blog</a></li>
            <li><a href="#">API docs</a></li>
            <li><a href="#">Community</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h5>Legal</h5>
          <ul>
            <li><Link to="/terms" onClick={handleContentRouteClick('/terms')}>Terms & Conditions</Link></li>
            <li><Link to="/privacy" onClick={handleContentRouteClick('/privacy')}>Privacy Policy</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p suppressHydrationWarning>&copy; {new Date().getFullYear()} SalonOX. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default React.memo(Footer);
