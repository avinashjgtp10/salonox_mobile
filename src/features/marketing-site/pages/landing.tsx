import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { type Country } from 'react-phone-number-input';
import {
  getCountryCallingCode,
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
} from 'libphonenumber-js';
import api from '../../../services/api/axios';
import { DEMO_REQUESTS } from '../../../services/api/endpoints';
import 'react-phone-number-input/style.css';
import '../../../components/Landing/styles/main.scss';
import {
  AboutContent,
  countryName,
  DEMO_EMAIL,
  DEMO_PHONE_DEFAULT_COUNTRY,
  DEMO_SUBMIT_URL,
  DEMO_VIDEO_EMBED_URL,
  EMAIL_REGEX,
  FeatureProductPreview,
  Icon,
  LANDING_SECTION_IDS,
  PrivacyContent,
  TermsContent,
  WHATSAPP_DEMO_URL,
  type DemoForm,
  type WhyFeature,
} from '../../../components/Landing/shared';
import Hero from '../../../components/Landing/Hero/Hero';
import WhySalonOX from '../../../components/Landing/WhySalonOX/WhySalonOX';
import Features from '../../../components/Landing/Features/Features';
import MultiBranch from '../../../components/Landing/MultiBranch/MultiBranch';
import HowItWorks from '../../../components/Landing/HowItWorks/HowItWorks';
import Reviews from '../../../components/Landing/Reviews/Reviews';
import Pricing from '../../../components/Landing/Pricing/Pricing';
import MobileApp from '../../../components/Landing/MobileApp/MobileApp';
import BookDemo from '../../../components/Landing/BookDemo/BookDemo';
import Footer from '../../../components/Landing/Footer/Footer';

const DEMO_NOTIFICATION_TIME_ZONE = 'Asia/Kolkata';
const EMAIL_LOCAL_HAS_LETTER_REGEX = /\p{L}/u;
const EMAIL_DOMAIN_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const DEMO_NAME_REGEX = /^[\p{L}\s]+$/u;
const DEMO_SALON_REGEX = /^[\p{L}\p{N}\s&.,'’()/-]+$/u;
const DEMO_CITY_REGEX = /^[\p{L}\s.'’-]+$/u;

type DemoNotificationRow = {
  field: string;
  information: string;
};

const escapeEmailHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDemoSubmittedOn = (date: Date) => {
  const dateParts = new Intl.DateTimeFormat('en-IN', {
    timeZone: DEMO_NOTIFICATION_TIME_ZONE,
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).formatToParts(date);

  const timeParts = new Intl.DateTimeFormat('en-IN', {
    timeZone: DEMO_NOTIFICATION_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).formatToParts(date);

  const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';

  const submittedDate = `${part(dateParts, 'day')} ${part(dateParts, 'month')} ${part(dateParts, 'year')}`;
  const submittedTime = `${part(timeParts, 'hour')}:${part(timeParts, 'minute')} ${part(timeParts, 'dayPeriod').toUpperCase()} IST`;

  return {
    date: submittedDate,
    time: submittedTime,
    display: `${submittedDate} • ${submittedTime}`,
    timeZone: DEMO_NOTIFICATION_TIME_ZONE,
  };
};

const isRealLookingDemoEmail = (value: string) => {
  if (!EMAIL_REGEX.test(value)) return false;

  const [localPart, domainPart] = value.split('@');
  const domainLabels = domainPart.split('.');

  return (
    !!localPart &&
    EMAIL_LOCAL_HAS_LETTER_REGEX.test(localPart) &&
    !localPart.startsWith('.') &&
    !localPart.endsWith('.') &&
    !localPart.includes('..') &&
    domainLabels.length >= 2 &&
    domainLabels.every((label) => EMAIL_DOMAIN_LABEL_REGEX.test(label)) &&
    domainLabels[domainLabels.length - 1].length >= 2
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const stringFromUnknown = (value: unknown) => {
  if (Array.isArray(value)) return stringFromUnknown(value[0]);
  return typeof value === 'string' ? value : '';
};

const buildDemoNotificationEmail = (rows: DemoNotificationRow[]) => {
  const tableRows = rows.map(({ field, information }) => `
    <tr>
      <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#475569;font-size:14px;font-weight:700;">${escapeEmailHtml(field)}</td>
      <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:14px;font-weight:600;">${escapeEmailHtml(information)}</td>
    </tr>
  `).join('');

  const textRows = rows.map(({ field, information }) => `${field}: ${information}`).join('\n');

  return {
    subject: 'New Demo Booking Received',
    heading: 'New Demo Booking Received',
    subtitle: 'A new demo request has been submitted through the SalonOX website.',
    footer: 'This enquiry was submitted from the SalonOX website.',
    text: `New Demo Booking Received\n\nA new demo request has been submitted through the SalonOX website.\n\n${textRows}\n\nThis enquiry was submitted from the SalonOX website.`,
    html: `
      <!doctype html>
      <html>
        <body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,Arial,sans-serif;color:#0F172A;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8FAFC;padding:32px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:24px;overflow:hidden;box-shadow:0 24px 70px rgba(15,23,42,0.10);">
                  <tr>
                    <td style="padding:28px 32px;background:linear-gradient(135deg,#ECFDF5 0%,#FFFFFF 58%,#F8FAFC 100%);">
                      <table role="presentation" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,#7C3AED,#10B981);color:#FFFFFF;text-align:center;font-size:22px;font-weight:900;line-height:42px;">△</td>
                          <td style="padding-left:12px;color:#0F172A;font-size:24px;font-weight:900;letter-spacing:-0.04em;">Salon<span style="color:#10B981;">OX</span></td>
                        </tr>
                      </table>
                      <h1 style="margin:28px 0 8px;color:#0F172A;font-size:28px;line-height:1.2;font-weight:900;letter-spacing:-0.04em;">New Demo Booking Received</h1>
                      <p style="margin:0;color:#64748B;font-size:15px;line-height:1.65;">A new demo request has been submitted through the SalonOX website.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:28px 32px 8px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;border-collapse:separate;border-spacing:0;">
                        <thead>
                          <tr>
                            <th align="left" style="padding:14px 18px;background:#F1F5F9;color:#0F172A;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;">Field</th>
                            <th align="left" style="padding:14px 18px;background:#F1F5F9;color:#0F172A;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;">Information</th>
                          </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:22px 32px 30px;color:#64748B;font-size:13px;line-height:1.6;">
                      This enquiry was submitted from the SalonOX website.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };
};

const appendFormSubmitField = (formData: FormData, field: string, value: string) => {
  formData.append(field, value.trim());
};

// The scroll-lock effect (mobileOpen/selectedWhyFeature/videoModalMounted) hides overflow
// on BOTH <html> and <body> with !important. Nav clicks flip mobileOpen synchronously and
// then call scrollIntoView in the same tick, but that effect's cleanup only runs on the
// next commit — so without this, the page is still scroll-locked at the moment scrollIntoView
// fires and the browser silently no-ops the scroll. Called eagerly, in sync, before scrolling.
const unlockPageScrollForNavigation = () => {
  document.documentElement.style.setProperty('overflow-y', 'auto', 'important');
  document.body.style.setProperty('overflow', 'visible', 'important');
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('top');
  const [navScrollOffset, setNavScrollOffset] = useState(88);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedWhyFeature, setSelectedWhyFeature] = useState<WhyFeature | null>(null);
  const [videoModalMounted, setVideoModalMounted] = useState(false);
  const [videoModalClosing, setVideoModalClosing] = useState(false);
  const [videoIframeSrc, setVideoIframeSrc] = useState('');
  const videoModalRef = useRef<HTMLDivElement | null>(null);
  const videoTriggerRef = useRef<HTMLElement | null>(null);
  const videoCloseTimerRef = useRef<number | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const navBurgerRef = useRef<HTMLButtonElement | null>(null);
  const scrollStateFrameRef = useRef<number | null>(null);
  const scrolledRef = useRef(false);
  const isTermsPage = location.pathname === '/terms';
  const isPrivacyPage = location.pathname === '/privacy';
  const isAboutPage = location.pathname === '/about';
  const isContentPage = isTermsPage || isPrivacyPage || isAboutPage;

  const handleHeroPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || event.pointerType === 'touch') return;

    const hero = heroRef.current;
    if (!hero) return;

    const bounds = hero.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;

    hero.style.setProperty('--hero-parallax-x', `${(x * 3).toFixed(2)}px`);
    hero.style.setProperty('--hero-parallax-y', `${(y * 3).toFixed(2)}px`);
    hero.style.setProperty('--hero-dashboard-x', `${(x * 2).toFixed(2)}px`);
    hero.style.setProperty('--hero-dashboard-y', `${(y * 2).toFixed(2)}px`);
  }, []);

  const resetHeroParallax = useCallback(() => {
    const hero = heroRef.current;
    if (!hero) return;

    hero.style.setProperty('--hero-parallax-x', '0px');
    hero.style.setProperty('--hero-parallax-y', '0px');
    hero.style.setProperty('--hero-dashboard-x', '0px');
    hero.style.setProperty('--hero-dashboard-y', '0px');
  }, []);

  const openVideoModal = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();

    if (videoCloseTimerRef.current !== null) {
      window.clearTimeout(videoCloseTimerRef.current);
      videoCloseTimerRef.current = null;
    }

    videoTriggerRef.current = event.currentTarget;
    setVideoModalClosing(false);
    setVideoIframeSrc(DEMO_VIDEO_EMBED_URL);
    setVideoModalMounted(true);
  }, []);

  const closeVideoModal = useCallback(() => {
    if (!videoModalMounted || videoModalClosing) return;

    // Clearing the source immediately stops playback while the shell animates out.
    setVideoIframeSrc('');
    setVideoModalClosing(true);
    videoCloseTimerRef.current = window.setTimeout(() => {
      setVideoModalMounted(false);
      setVideoModalClosing(false);
      videoCloseTimerRef.current = null;
      videoTriggerRef.current?.focus();
    }, 300);
  }, [videoModalClosing, videoModalMounted]);

  useEffect(() => () => {
    if (videoCloseTimerRef.current !== null) {
      window.clearTimeout(videoCloseTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const root = document.getElementById('root');
    const pageNodes = [document.documentElement, document.body, root].filter(
      (node): node is HTMLElement => Boolean(node)
    );

    pageNodes.forEach((node) => node.classList.add('landing-page-active'));

    return () => {
      pageNodes.forEach((node) => {
        node.classList.remove('landing-page-active');
        node.style.removeProperty('overflow');
      });
    };
  }, []);

  // The dashboard shell forces `overflow: hidden !important` + `height: 100%`
  // on html/body/#root (src/index.css) so its own panes can own scrolling.
  // That rule is global, so on this page it also clips #root to the viewport
  // and disables window scrolling. Restore natural height/scrolling while
  // this page is mounted, using `important` so it wins over the stylesheet
  // rule, and put everything back on unmount so the dashboard is unaffected.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const targets = [html, body, root].filter((el): el is HTMLElement => !!el);

    const prev = targets.map((el) => ({
      el,
      overflow: el.style.getPropertyValue('overflow'),
      overflowPriority: el.style.getPropertyPriority('overflow'),
      height: el.style.getPropertyValue('height'),
      heightPriority: el.style.getPropertyPriority('height'),
    }));

    html.style.setProperty('overflow-x', 'hidden', 'important');
    html.style.setProperty('overflow-y', 'auto', 'important');
    body.style.setProperty('overflow', 'visible', 'important');
    body.style.setProperty('height', 'auto', 'important');
    root?.style.setProperty('overflow', 'visible', 'important');
    root?.style.setProperty('height', 'auto', 'important');

    return () => {
      prev.forEach(({ el, overflow, overflowPriority, height, heightPriority }) => {
        if (overflow) el.style.setProperty('overflow', overflow, overflowPriority);
        else el.style.removeProperty('overflow');
        el.style.removeProperty('overflow-x');
        el.style.removeProperty('overflow-y');
        if (height) el.style.setProperty('height', height, heightPriority);
        else el.style.removeProperty('height');
      });
    };
  }, []);

  useEffect(() => {
    const updateScrolledState = () => {
      scrollStateFrameRef.current = null;
      const nextScrolled = window.scrollY > 24;

      if (scrolledRef.current !== nextScrolled) {
        scrolledRef.current = nextScrolled;
        setScrolled(nextScrolled);
      }
    };

    const onScroll = () => {
      if (scrollStateFrameRef.current !== null) return;
      scrollStateFrameRef.current = window.requestAnimationFrame(updateScrolledState);
    };

    updateScrolledState();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (scrollStateFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollStateFrameRef.current);
        scrollStateFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const shouldLockPageScroll = mobileOpen || selectedWhyFeature || videoModalMounted;

    html.style.setProperty('overflow-x', 'hidden', 'important');
    html.style.setProperty('overflow-y', shouldLockPageScroll ? 'hidden' : 'auto', 'important');
    body.style.setProperty('overflow', shouldLockPageScroll ? 'hidden' : 'visible', 'important');

    return () => {
      html.style.removeProperty('overflow-x');
      html.style.removeProperty('overflow-y');
      body.style.removeProperty('overflow');
      body.style.removeProperty('overflow-x');
      body.style.removeProperty('overflow-y');
    };
  }, [mobileOpen, selectedWhyFeature, videoModalMounted]);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const closeDrawerOnDesktop = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) setMobileOpen(false);
    };

    closeDrawerOnDesktop(desktopQuery);
    desktopQuery.addEventListener('change', closeDrawerOnDesktop);
    return () => desktopQuery.removeEventListener('change', closeDrawerOnDesktop);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    const closeDrawerOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMobileOpen(false);
      window.requestAnimationFrame(() => navBurgerRef.current?.focus());
    };

    document.addEventListener('keydown', closeDrawerOnEscape);
    return () => document.removeEventListener('keydown', closeDrawerOnEscape);
  }, [mobileOpen]);

  useEffect(() => {
    if (!videoModalMounted || videoModalClosing) return;

    const modal = videoModalRef.current;
    window.requestAnimationFrame(() => modal?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeVideoModal();
        return;
      }

      if (event.key !== 'Tab' || !modal) return;

      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], iframe, [tabindex]:not([tabindex="-1"]):not([data-video-focus-guard])'
        )
      ).filter((element) => !element.hasAttribute('disabled'));

      if (focusable.length === 0) {
        event.preventDefault();
        modal.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === modal)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [closeVideoModal, videoModalClosing, videoModalMounted]);

  useEffect(() => {
    if (!selectedWhyFeature || videoModalMounted) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedWhyFeature(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedWhyFeature, videoModalMounted]);

  const getNavOffset = useCallback(() => {
    const page = document.querySelector<HTMLElement>('.salonox-landing');
    const configuredGap = page
      ? Number.parseFloat(window.getComputedStyle(page).getPropertyValue('--nav-scroll-gap'))
      : Number.NaN;
    const gap = Number.isFinite(configuredGap) ? configuredGap : 16;
    return (navRef.current?.getBoundingClientRect().height ?? 72) + gap;
  }, []);

  const focusSectionHeading = useCallback((section: HTMLElement) => {
    const focusTarget = section.querySelector<HTMLElement>('h1, h2') ?? section;
    const hadTabIndex = focusTarget.hasAttribute('tabindex');

    if (!hadTabIndex) focusTarget.setAttribute('tabindex', '-1');
    focusTarget.focus({ preventScroll: true });

    if (!hadTabIndex) {
      focusTarget.addEventListener('blur', () => focusTarget.removeAttribute('tabindex'), { once: true });
    }
  }, []);

  const scrollToId = useCallback(
    (id: string, options: { updateHash?: boolean; moveFocus?: boolean } = {}) => {
      const section = document.getElementById(id);
      if (!section) return;

      const { updateHash = true, moveFocus = true } = options;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (updateHash) {
        const nextHash = `#${id}`;
        if (window.location.hash === nextHash) {
          window.history.replaceState(window.history.state, '', nextHash);
        } else {
          window.history.pushState(window.history.state, '', nextHash);
        }
      }

      // #book-demo's own content (contact info, office map) sits above the actual
      // form in the section's mobile single-column layout, so aligning the section's
      // top edge to the header leaves the "Schedule a Free Demo" card scrolled out of
      // view below the fold. Scroll to the card itself when it's present; fall back to
      // the section for every other target (and for the section's own focus target).
      const scrollTarget = id === 'book-demo'
        ? section.querySelector<HTMLElement>('.demo-card') ?? section
        : section;

      scrollTarget.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
        inline: 'nearest',
      });

      if (moveFocus) focusSectionHeading(section);
    },
    [focusSectionHeading]
  );

  const scrollToIdSettled = useCallback((id: string) => scrollToId(id), [scrollToId]);

  // Handles direct hashes, browser back/forward, refreshes, and navigation
  // from the content routes without allowing the browser's default anchor jump.
  useEffect(() => {
    if (isContentPage || !location.hash) return;

    const id = decodeURIComponent(location.hash.slice(1));
    scrollToId(id, { updateHash: false, moveFocus: false });
  }, [isContentPage, location.hash, scrollToId]);

  useEffect(() => {
    const nav = navRef.current;
    const page = document.querySelector<HTMLElement>('.salonox-landing');
    if (!nav || !page) return;

    const updateOffset = () => {
      const offset = getNavOffset();
      setNavScrollOffset((current) => Math.abs(current - offset) > 0.5 ? offset : current);
      page.style.setProperty('--nav-scroll-offset', `${offset}px`);
    };

    updateOffset();
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateOffset);
    resizeObserver?.observe(nav);
    window.addEventListener('resize', updateOffset, { passive: true });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateOffset);
    };
  }, [getNavOffset]);

  useEffect(() => {
    if (isContentPage || typeof IntersectionObserver === 'undefined') return;

    const sections = LANDING_SECTION_IDS
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section))
      .sort((a, b) => a.offsetTop - b.offsetTop);
    if (sections.length === 0) return;

    const updateActiveSection = () => {
      const activationLine = navScrollOffset + Math.min(window.innerHeight * 0.12, 120);
      let current = sections[0].id;

      sections.forEach((section) => {
        if (section.getBoundingClientRect().top <= activationLine) current = section.id;
      });

      setActiveSection(current);
    };

    const observer = new IntersectionObserver(updateActiveSection, {
      rootMargin: `-${Math.ceil(navScrollOffset)}px 0px -55% 0px`,
      threshold: [0, 0.01, 0.25, 0.5],
    });

    sections.forEach((section) => observer.observe(section));
    updateActiveSection();

    return () => observer.disconnect();
  }, [isContentPage, navScrollOffset]);

  const scrollToSection = useCallback(
    (id: string) => (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault();

      setMobileOpen(false);
      setSelectedWhyFeature(null);
      unlockPageScrollForNavigation();

      if (isContentPage) {
        navigate(`/#${id}`);
        return;
      }

      scrollToIdSettled(id);
    },
    [isContentPage, navigate, scrollToIdSettled]
  );

  const handleBookDemoNavigation = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      scrollToSection('book-demo')(e);
    },
    [scrollToSection]
  );

  const jumpToSection = useCallback(
    (id: string) => {
      setSelectedWhyFeature(null);
      setMobileOpen(false);
      unlockPageScrollForNavigation();

      if (isContentPage) {
        navigate(`/#${id}`);
        return;
      }

      scrollToIdSettled(id);
    },
    [isContentPage, navigate, scrollToIdSettled]
  );

  const handleContentRouteClick = useCallback(
    (path: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      setMobileOpen(false);
      setSelectedWhyFeature(null);
      unlockPageScrollForNavigation();

      if (location.pathname === path) {
        e.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        });
        return;
      }

      e.preventDefault();
      navigate(path);

      window.scrollTo({
        top: 0,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    },
    [location.pathname, navigate]
  );

  const handleContactUsClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      setMobileOpen(false);
      setSelectedWhyFeature(null);
      unlockPageScrollForNavigation();

      if (location.pathname === '/') {
        scrollToIdSettled('book-demo');
        return;
      }

      navigate('/#book-demo');
    },
    [location.pathname, navigate, scrollToIdSettled]
  );

  const [demoForm, setDemoForm] = useState<DemoForm>({
    name: '',
    email: '',
    phone: '',
    salon: '',
    city: '',
    locations: '',
    agreed: false,
  });
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [demoError, setDemoError] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<Country | undefined>(DEMO_PHONE_DEFAULT_COUNTRY);
  const [phoneError, setPhoneError] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [cityError, setCityError] = useState('');
  const [cityTouched, setCityTouched] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [salonError, setSalonError] = useState('');
  const [salonTouched, setSalonTouched] = useState(false);
  const [locationsError, setLocationsError] = useState('');
  const [locationsTouched, setLocationsTouched] = useState(false);

  const handleDemoChange = useCallback(
    (field: keyof Omit<DemoForm, 'phone'>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target instanceof HTMLInputElement && e.target.type === 'checkbox'
        ? e.target.checked
        : field === 'name'
          ? e.target.value.replace(/[^\p{L}\s]/gu, '')
        : field === 'locations'
          ? e.target.value.replace(/[^\d]/g, '')
          : e.target.value;

      setDemoForm((prev) => ({ ...prev, [field]: value }));
      setDemoError('');
    },
    []
  );

  const handleCityBlur = useCallback(() => {
    setCityTouched(true);
  }, []);

  const handleNameBlur = useCallback(() => {
    setNameTouched(true);
  }, []);

  const handleEmailBlur = useCallback(() => {
    setEmailTouched(true);
  }, []);

  const handleSalonBlur = useCallback(() => {
    setSalonTouched(true);
  }, []);

  const handleLocationsBlur = useCallback(() => {
    setLocationsTouched(true);
  }, []);

  const validatePhone = useCallback((value: string, country: Country | undefined) => {
    if (!value) return 'Mobile number is required.';
    const selectedCountryName = country ? countryName(country) : 'the selected country';
    if (!isPossiblePhoneNumber(value)) return 'Enter a complete mobile number.';
    const phoneNumber = parsePhoneNumberFromString(value, country);
    if (!phoneNumber || !phoneNumber.isValid() || !isValidPhoneNumber(value, country)) {
      return `Enter a valid mobile number for ${selectedCountryName}.`;
    }
    if (country && phoneNumber.country && phoneNumber.country !== country) {
      return `Enter a mobile number that matches ${selectedCountryName}.`;
    }
    if (country === 'IN' && phoneNumber.nationalNumber.length !== 10) {
      return 'Please enter a valid 10-digit mobile number.';
    }
    const numberType = phoneNumber.getType();
    if (numberType && numberType !== 'MOBILE' && numberType !== 'FIXED_LINE_OR_MOBILE') {
      return `Enter a valid mobile number for ${selectedCountryName}.`;
    }
    return '';
  }, []);

  const validateCity = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'City is required.';
    if (trimmed.length < 2 || trimmed.length > 100 || !DEMO_CITY_REGEX.test(trimmed)) {
      return 'Please enter a valid city name (2-100 characters).';
    }
    return '';
  }, []);

  const validateName = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Your name is required.';
    if (trimmed.length < 2 || trimmed.length > 50 || !DEMO_NAME_REGEX.test(trimmed)) {
      return 'Please enter a valid name (2-50 characters, letters and spaces only).';
    }
    return '';
  }, []);

  const validateEmail = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Work email is required.';
    if (!isRealLookingDemoEmail(trimmed)) return 'Please enter a valid email address.';
    return '';
  }, []);

  const validateSalon = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Salon name is required.';
    if (trimmed.length < 2 || trimmed.length > 100 || !DEMO_SALON_REGEX.test(trimmed)) {
      return 'Please enter a valid salon name (2-100 characters).';
    }
    return '';
  }, []);

  const validateLocations = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!/^[1-9]\d*$/.test(trimmed)) {
      return 'Locations must be a whole number greater than or equal to 1.';
    }
    return '';
  }, []);

  const mapDemoBackendErrorToField = useCallback((error: unknown) => {
    const errorRecord = isRecord(error) ? error : {};
    const response = isRecord(errorRecord.response) ? errorRecord.response : {};
    const responseData = isRecord(response.data) ? response.data : {};
    const errorData = isRecord(responseData.error) ? responseData.error : {};
    const rawMessage =
      stringFromUnknown(errorData.message) ||
      stringFromUnknown(responseData.message) ||
      stringFromUnknown(errorRecord.message) ||
      '';
    const message = String(rawMessage || '').toLowerCase();
    const fields = responseData.errors ?? errorData.errors ?? {};
    const fieldEntries = Array.isArray(fields) ? fields : Object.entries(fields);

    for (const entry of fieldEntries) {
      const entryRecord = isRecord(entry) ? entry : {};
      const field = Array.isArray(entry) ? String(entry[0]).toLowerCase() : stringFromUnknown(entryRecord.field).toLowerCase();
      const fieldMessage = Array.isArray(entry)
        ? stringFromUnknown(entry[1]) || rawMessage
        : stringFromUnknown(entryRecord.message) || rawMessage;

      if (field.includes('email')) return { field: 'email', message: fieldMessage || 'Please enter a valid email address.' };
      if (field.includes('phone') || field.includes('mobile')) return { field: 'phone', message: fieldMessage || 'Please enter a valid 10-digit mobile number.' };
      if (field.includes('salon')) return { field: 'salon', message: fieldMessage || 'Please enter a valid salon name (2-100 characters).' };
      if (field.includes('city')) return { field: 'city', message: fieldMessage || 'Please enter a valid city name (2-100 characters).' };
      if (field.includes('location')) return { field: 'locations', message: fieldMessage || 'Locations must be a whole number greater than or equal to 1.' };
      if (field.includes('name')) return { field: 'name', message: fieldMessage || 'Please enter a valid name (2-50 characters, letters and spaces only).' };
    }

    if (message.includes('email') && (message.includes('exist') || message.includes('registered') || message.includes('duplicate'))) {
      return { field: 'email', message: 'This email is already registered.' };
    }
    if (message.includes('email')) return { field: 'email', message: 'Please enter a valid email address.' };
    return null;
  }, []);

  // Re-runs off committed state (not handler closures) so a country switch —
  // which renormalizes the stored E.164 value on its own render cycle — always
  // gets validated against the pairing that actually lands, never a stale one.
  useEffect(() => {
    if (!phoneTouched) return;
    setPhoneError(validatePhone(demoForm.phone, phoneCountry));
  }, [demoForm.phone, phoneCountry, phoneTouched, validatePhone]);

  useEffect(() => {
    if (!cityTouched) return;
    setCityError(validateCity(demoForm.city));
  }, [demoForm.city, cityTouched, validateCity]);

  useEffect(() => {
    if (!nameTouched) return;
    setNameError(validateName(demoForm.name));
  }, [demoForm.name, nameTouched, validateName]);

  useEffect(() => {
    if (!emailTouched) return;
    setEmailError(validateEmail(demoForm.email));
  }, [demoForm.email, emailTouched, validateEmail]);

  useEffect(() => {
    if (!salonTouched) return;
    setSalonError(validateSalon(demoForm.salon));
  }, [demoForm.salon, salonTouched, validateSalon]);

  useEffect(() => {
    if (!locationsTouched) return;
    setLocationsError(validateLocations(demoForm.locations));
  }, [demoForm.locations, locationsTouched, validateLocations]);

  const handlePhoneChange = useCallback((value?: string) => {
    let nextPhone = value || '';
    if (phoneCountry === 'IN' && nextPhone) {
      const phoneNumber = parsePhoneNumberFromString(nextPhone, phoneCountry);
      if (phoneNumber && phoneNumber.nationalNumber.length > 10) {
        nextPhone = `+${getCountryCallingCode(phoneCountry)}${phoneNumber.nationalNumber.slice(0, 10)}`;
      }
    }

    setDemoForm((prev) => ({ ...prev, phone: nextPhone }));
    setDemoError('');

    const selectedCountryName = phoneCountry ? countryName(phoneCountry) : 'the selected country';
    const phoneLengthError = nextPhone ? validatePhoneNumberLength(nextPhone, phoneCountry) : undefined;

    if (phoneLengthError === 'TOO_LONG' || phoneLengthError === 'INVALID_LENGTH') {
      setPhoneTouched(true);
      setPhoneError(`Enter a valid mobile number for ${selectedCountryName}.`);
      return;
    }

    if (phoneTouched) {
      setPhoneError(validatePhone(nextPhone, phoneCountry));
      return;
    }

    setPhoneError('');
  }, [phoneCountry, phoneTouched, validatePhone]);

  const handlePhoneBlur = useCallback(() => {
    setPhoneTouched(true);
  }, []);

  const handlePhoneCountryChange = useCallback((country?: Country) => {
    if (!country) return;
    setPhoneCountry(country);
  }, []);

  const handleDemoSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formElement = e.currentTarget;

      const nameValidationError = validateName(demoForm.name);
      const emailValidationError = validateEmail(demoForm.email);
      const phoneValidationError = validatePhone(demoForm.phone, phoneCountry);
      const salonValidationError = validateSalon(demoForm.salon);
      const cityValidationError = validateCity(demoForm.city);
      const locationsValidationError = validateLocations(demoForm.locations);

      if (
        nameValidationError ||
        emailValidationError ||
        phoneValidationError ||
        salonValidationError ||
        cityValidationError ||
        locationsValidationError
      ) {
        setNameTouched(true);
        setNameError(nameValidationError);
        setEmailTouched(true);
        setEmailError(emailValidationError);
        setPhoneTouched(true);
        setPhoneError(phoneValidationError);
        setSalonTouched(true);
        setSalonError(salonValidationError);
        setCityTouched(true);
        setCityError(cityValidationError);
        setLocationsTouched(true);
        setLocationsError(locationsValidationError);
        window.requestAnimationFrame(() => {
          const firstInvalid = formElement.querySelector<HTMLElement>('[aria-invalid="true"] input, input[aria-invalid="true"], .PhoneInput--invalid input');
          firstInvalid?.focus();
          firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        return;
      }

      setDemoSubmitting(true);
      setDemoError('');

      try {
        const submittedAt = new Date();
        const submittedOn = formatDemoSubmittedOn(submittedAt);
        const notificationRows: DemoNotificationRow[] = [
          { field: 'Name', information: demoForm.name },
          { field: 'Work Email', information: demoForm.email },
          { field: 'Phone Number', information: demoForm.phone },
          { field: 'Salon Name', information: demoForm.salon },
          { field: 'City', information: demoForm.city },
          { field: 'Number of Locations', information: demoForm.locations },
          { field: 'Submitted On', information: submittedOn.display },
        ];

        const notificationEmail = buildDemoNotificationEmail(notificationRows);

        const formSubmitData = new FormData();
        appendFormSubmitField(formSubmitData, '_subject', notificationEmail.subject);
        appendFormSubmitField(formSubmitData, '_template', 'table');
        appendFormSubmitField(formSubmitData, '_captcha', 'false');
        appendFormSubmitField(formSubmitData, '_replyto', demoForm.email);
        appendFormSubmitField(formSubmitData, '_autoresponse', 'Thank you for booking a SalonOX demo. Our team will contact you shortly.');
        appendFormSubmitField(formSubmitData, 'Name', demoForm.name);
        appendFormSubmitField(formSubmitData, 'Work Email', demoForm.email);
        appendFormSubmitField(formSubmitData, 'Phone Number', demoForm.phone);
        appendFormSubmitField(formSubmitData, 'Salon Name', demoForm.salon);
        appendFormSubmitField(formSubmitData, 'City', demoForm.city);
        appendFormSubmitField(formSubmitData, 'Number of Locations', demoForm.locations);
        appendFormSubmitField(formSubmitData, 'Submitted On', submittedOn.display);
        appendFormSubmitField(formSubmitData, 'Source', 'SalonOX website');

        const formSubmitResponse = await fetch(DEMO_SUBMIT_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
          },
          body: formSubmitData,
        });

        if (!formSubmitResponse.ok) {
          const errorText = await formSubmitResponse.text().catch(() => '');
          console.error('SalonOX demo email notification failed', {
            status: formSubmitResponse.status,
            statusText: formSubmitResponse.statusText,
            response: errorText,
            endpoint: DEMO_SUBMIT_URL,
            recipient: DEMO_EMAIL,
          });
          throw new Error(`Email notification failed with status ${formSubmitResponse.status}`);
        }

        await api.post(DEMO_REQUESTS.CREATE, {
          name: demoForm.name,
          email: demoForm.email,
          phone: demoForm.phone,
          salonName: demoForm.salon,
          city: demoForm.city,
          locationsCount: demoForm.locations,
          submittedAt: submittedAt.toISOString(),
          submittedOn: submittedOn.display,
          submittedOnDate: submittedOn.date,
          submittedOnTime: submittedOn.time,
          submittedTimeZone: submittedOn.timeZone,
          source: 'SalonOX website',
          notification: {
            to: 'support@salonox.com',
            replyTo: demoForm.email,
            subject: notificationEmail.subject,
            heading: notificationEmail.heading,
            subtitle: notificationEmail.subtitle,
            footer: notificationEmail.footer,
            tableHeaders: {
              field: 'Field',
              information: 'Information',
            },
            rows: notificationRows,
            html: notificationEmail.html,
            text: notificationEmail.text,
          },
        });

        setDemoSubmitted(true);
      } catch (error) {
        console.error('SalonOX demo booking submission failed', error);
        const fieldError = mapDemoBackendErrorToField(error);
        if (fieldError) {
          if (fieldError.field === 'name') {
            setNameTouched(true);
            setNameError(fieldError.message);
          } else if (fieldError.field === 'email') {
            setEmailTouched(true);
            setEmailError(fieldError.message);
          } else if (fieldError.field === 'phone') {
            setPhoneTouched(true);
            setPhoneError(fieldError.message);
          } else if (fieldError.field === 'salon') {
            setSalonTouched(true);
            setSalonError(fieldError.message);
          } else if (fieldError.field === 'city') {
            setCityTouched(true);
            setCityError(fieldError.message);
          } else if (fieldError.field === 'locations') {
            setLocationsTouched(true);
            setLocationsError(fieldError.message);
          }
          return;
        }
        setDemoError('We could not send your demo request. Please try again or email support@salonox.com.');
      } finally {
        setDemoSubmitting(false);
      }
    },
    [demoForm, phoneCountry, validateName, validateEmail, validatePhone, validateSalon, validateCity, validateLocations, mapDemoBackendErrorToField]
  );

  return (
    <div className="salonox-landing">
      {/* ============================== NAVBAR ============================== */}
      <nav ref={navRef} className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
        <div className="container nav-inner">
          <a href="#top" className="nav-logo" onClick={scrollToSection('top')}>
            <img src="/salonox-full-logo.png" alt="SalonOX" className="logo-full" width="210" height="68" />
          </a>

          <ul className="nav-links">
            <li><a className={`nav-link${activeSection === 'why-salonox' ? ' is-active' : ''}`} aria-current={activeSection === 'why-salonox' ? 'location' : undefined} href="#why-salonox" onClick={scrollToSection('why-salonox')}>Why SalonOX</a></li>
            <li><a className={`nav-link${activeSection === 'features' ? ' is-active' : ''}`} aria-current={activeSection === 'features' ? 'location' : undefined} href="#features" onClick={scrollToSection('features')}>Features</a></li>
            <li><a className={`nav-link${activeSection === 'multi-branch' ? ' is-active' : ''}`} aria-current={activeSection === 'multi-branch' ? 'location' : undefined} href="#multi-branch" onClick={scrollToSection('multi-branch')}>Multi-Branch</a></li>
            <li><a className={`nav-link nav-link-btn${activeSection === 'how' ? ' is-active' : ''}`} aria-current={activeSection === 'how' ? 'location' : undefined} href="#how" onClick={scrollToSection('how')}>How it works</a></li>
            <li><a className={`nav-link${activeSection === 'testimonials' ? ' is-active' : ''}`} aria-current={activeSection === 'testimonials' ? 'location' : undefined} href="#testimonials" onClick={scrollToSection('testimonials')}>Reviews</a></li>
            <li><a className={`nav-link${activeSection === 'pricing' ? ' is-active' : ''}`} aria-current={activeSection === 'pricing' ? 'location' : undefined} href="#pricing" onClick={scrollToSection('pricing')}>Pricing</a></li>
          </ul>

          <div className="nav-actions">
            <Link to="/login" className="btn btn-ghost btn-sm nav-desktop-cta">Log in</Link>
            <a href="#book-demo" className={`btn btn-primary btn-sm nav-desktop-cta${activeSection === 'book-demo' ? ' is-active' : ''}`} aria-current={activeSection === 'book-demo' ? 'location' : undefined} onClick={handleBookDemoNavigation}>Book Demo</a>
            <button
              ref={navBurgerRef}
              className={`nav-burger ${mobileOpen ? 'is-open' : ''}`}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              onClick={() => {
                if (window.matchMedia('(max-width: 1023px)').matches) setMobileOpen((v) => !v);
              }}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </nav>

      {/* ============================== MOBILE DRAWER ============================== */}
      <div className={`mobile-drawer ${mobileOpen ? 'is-open' : ''}`} onClick={() => setMobileOpen(false)}>
        <div className="mobile-drawer-panel" onClick={(e) => e.stopPropagation()}>
          <div className="mobile-drawer-header">
            <a href="#top" className="nav-logo" onClick={scrollToSection('top')}>
              <img src="/salonox-full-logo.png" alt="SalonOX" className="logo-full" width="190" height="61" />
            </a>
            <button type="button" className="mobile-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
              <span />
              <span />
            </button>
          </div>
          <a href="#why-salonox" className={`mobile-link${activeSection === 'why-salonox' ? ' is-active' : ''}`} aria-current={activeSection === 'why-salonox' ? 'location' : undefined} onClick={scrollToSection('why-salonox')}>Why SalonOX</a>
          <a href="#features" className={`mobile-link${activeSection === 'features' ? ' is-active' : ''}`} aria-current={activeSection === 'features' ? 'location' : undefined} onClick={scrollToSection('features')}>Features</a>
          <a href="#multi-branch" className={`mobile-link${activeSection === 'multi-branch' ? ' is-active' : ''}`} aria-current={activeSection === 'multi-branch' ? 'location' : undefined} onClick={scrollToSection('multi-branch')}>Multi-Branch</a>
          <a href="#how" className={`mobile-link${activeSection === 'how' ? ' is-active' : ''}`} aria-current={activeSection === 'how' ? 'location' : undefined} onClick={scrollToSection('how')}>How it works</a>
          <a href="#testimonials" className={`mobile-link${activeSection === 'testimonials' ? ' is-active' : ''}`} aria-current={activeSection === 'testimonials' ? 'location' : undefined} onClick={scrollToSection('testimonials')}>Reviews</a>
          <a href="#pricing" className={`mobile-link${activeSection === 'pricing' ? ' is-active' : ''}`} aria-current={activeSection === 'pricing' ? 'location' : undefined} onClick={scrollToSection('pricing')}>Pricing</a>
          <div className="mobile-cta">
            <Link to="/login" className="btn btn-ghost btn-block" onClick={() => setMobileOpen(false)}>Log in</Link>
            <a href="#book-demo" className={`btn btn-primary btn-block${activeSection === 'book-demo' ? ' is-active' : ''}`} aria-current={activeSection === 'book-demo' ? 'location' : undefined} onClick={handleBookDemoNavigation}>Book Demo</a>
          </div>
        </div>
      </div>

      {isContentPage ? (
        isTermsPage ? <TermsContent /> : isPrivacyPage ? <PrivacyContent /> : <AboutContent onNavigateToBookDemo={handleBookDemoNavigation} />
      ) : (
        <>
      <Hero
        heroRef={heroRef}
        onPointerMove={handleHeroPointerMove}
        onPointerLeave={resetHeroParallax}
        scrollToSection={scrollToSection}
        openVideoModal={openVideoModal}
      />

      <WhySalonOX onSelectFeature={setSelectedWhyFeature} />

      <Features />

      <MultiBranch />

      <HowItWorks scrollToSection={scrollToSection} />

      <Reviews />

      <Pricing />

      <MobileApp />

      <BookDemo
        demoForm={demoForm}
        demoSubmitted={demoSubmitted}
        demoSubmitting={demoSubmitting}
        demoError={demoError}
        nameTouched={nameTouched}
        nameError={nameError}
        emailTouched={emailTouched}
        emailError={emailError}
        phoneCountry={phoneCountry}
        phoneTouched={phoneTouched}
        phoneError={phoneError}
        salonTouched={salonTouched}
        salonError={salonError}
        cityTouched={cityTouched}
        cityError={cityError}
        locationsTouched={locationsTouched}
        locationsError={locationsError}
        handleDemoChange={handleDemoChange}
        handleNameBlur={handleNameBlur}
        handleEmailBlur={handleEmailBlur}
        handleSalonBlur={handleSalonBlur}
        handleCityBlur={handleCityBlur}
        handleLocationsBlur={handleLocationsBlur}
        handlePhoneChange={handlePhoneChange}
        handlePhoneBlur={handlePhoneBlur}
        handlePhoneCountryChange={handlePhoneCountryChange}
        handleDemoSubmit={handleDemoSubmit}
      />

        </>
      )}

      <Footer
        scrollToSection={scrollToSection}
        handleContentRouteClick={handleContentRouteClick}
        handleContactUsClick={handleContactUsClick}
      />

      {selectedWhyFeature && (
        <div
          className="feature-modal-backdrop"
          aria-hidden={videoModalMounted || undefined}
          onClick={() => setSelectedWhyFeature(null)}
        >
          <div
            className="feature-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="why-feature-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="feature-modal-close"
              aria-label="Close feature details"
              onClick={() => setSelectedWhyFeature(null)}
            >
              <span />
              <span />
            </button>

            <div className="feature-modal-visual" aria-hidden="true">
              <div className="feature-modal-visual-card">
                <FeatureProductPreview feature={selectedWhyFeature} />
              </div>
            </div>

            <div className="feature-modal-copy">
              <span className="feature-modal-kicker">{selectedWhyFeature.tag}</span>
              <h3 id="why-feature-modal-title">{selectedWhyFeature.modalTitle}</h3>
              <p>{selectedWhyFeature.modalDesc}</p>

              <ul className="feature-modal-benefits">
                {selectedWhyFeature.benefits.map((benefit) => (
                  <li key={benefit}>
                    <span><Icon.Check /></span>
                    {benefit}
                  </li>
                ))}
              </ul>

              <div className="feature-modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={openVideoModal}
                  aria-haspopup="dialog"
                >
                  <Icon.Play /> Watch Demo
                </button>
                <button type="button" className="btn btn-primary" onClick={() => jumpToSection('book-demo')}>
                  Book Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {videoModalMounted && (
        <div
          className={`video-modal-backdrop ${videoModalClosing ? 'is-closing' : ''}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeVideoModal();
          }}
        >
          <div
            ref={videoModalRef}
            className={`video-modal ${videoModalClosing ? 'is-closing' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="salonox-demo-video-title"
            tabIndex={-1}
          >
            <div className="video-modal-header">
              <div>
                <span>SalonOX Product Tour</span>
                <h2 id="salonox-demo-video-title">See SalonOX in action</h2>
              </div>
              <button
                type="button"
                className="video-modal-close"
                aria-label="Close demo video"
                onClick={closeVideoModal}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="video-modal-player">
              {videoIframeSrc && (
                <iframe
                  src={videoIframeSrc}
                  title="SalonOX product demo video"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
            <span
              className="video-modal-focus-guard"
              data-video-focus-guard
              tabIndex={0}
              aria-hidden="true"
              onFocus={() => videoModalRef.current?.querySelector<HTMLButtonElement>('.video-modal-close')?.focus()}
            />
          </div>
        </div>
      )}

      <a
        href={WHATSAPP_DEMO_URL}
        className="floating-whatsapp-cta"
        aria-label="Chat with SalonOX on WhatsApp"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="floating-whatsapp-cta__icon" aria-hidden="true">
          <Icon.WhatsApp />
        </span>
      </a>
    </div>
  );
};

export default LandingPage;
