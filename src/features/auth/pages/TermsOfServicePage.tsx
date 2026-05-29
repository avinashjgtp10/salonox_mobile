import LegalPageLayout from "../components/LegalPageLayout";

const sections = [
  {
    icon: "📜",
    title: "Acceptance of Terms",
    content: (
      <>
        By accessing or using the Salonox platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service. These terms apply to all visitors, users, and others who access or use the service.
      </>
    ),
  },
  {
    icon: "💻",
    title: "Description of Service",
    content: (
      <>
        Salonox provides a cloud-based salon management platform that includes appointment scheduling, staff management, billing, customer management, and analytics tools. We reserve the right to modify or discontinue the service at any time with or without notice.
      </>
    ),
  },
  {
    icon: "👤",
    title: "Account Registration",
    content: (
      <>
        To use certain features of our service, you must register for an account. You agree to:
        <ul>
          <li>Provide accurate, current, and complete information during registration</li>
          <li>Maintain and promptly update your account information</li>
          <li>Keep your password secure and confidential</li>
          <li>Accept responsibility for all activities that occur under your account</li>
          <li>Notify us immediately of any unauthorised use of your account</li>
        </ul>
      </>
    ),
  },
  {
    icon: "🚫",
    title: "Acceptable Use",
    content: (
      <>
        You agree not to use the Salonox platform to:
        <ul>
          <li>Violate any applicable laws or regulations</li>
          <li>Infringe the rights of any third party</li>
          <li>Transmit any harmful, offensive, or disruptive content</li>
          <li>Attempt to gain unauthorised access to any part of the platform</li>
          <li>Interfere with or disrupt the integrity or performance of the service</li>
        </ul>
      </>
    ),
  },
  {
    icon: "💳",
    title: "Subscription and Billing",
    content: (
      <>
        Salonox offers a free 7-day trial followed by a paid subscription. Subscription fees are billed in advance on a monthly or annual basis and are non-refundable. We reserve the right to change subscription fees upon reasonable notice.
      </>
    ),
  },
  {
    icon: "©️",
    title: "Intellectual Property",
    content: (
      <>
        The Salonox platform, including all content, features, and functionality, is owned by Salonox Technologies Pvt. Ltd. and is protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works without our prior written consent.
      </>
    ),
  },
  {
    icon: "🔚",
    title: "Termination",
    content: (
      <>
        We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties, or for any other reason at our sole discretion.
      </>
    ),
  },
  {
    icon: "⚖️",
    title: "Limitation of Liability",
    content: (
      <>
        To the maximum extent permitted by law, Salonox shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
      </>
    ),
  },
  {
    icon: "🏛️",
    title: "Governing Law",
    content: (
      <>
        These Terms of Service shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.
      </>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout
      badge="Legal · Terms"
      title="Terms of Service"
      subtitle="The rules and guidelines that govern your use of the Salonox platform."
      sections={sections}
      contactEmail="legal@salonox.com"
    />
  );
}
