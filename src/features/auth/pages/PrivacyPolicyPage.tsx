import LegalPageLayout from "../components/LegalPageLayout";

const sections = [
  {
    icon: "👋",
    title: "Introduction",
    content: (
      <>
        Welcome to Salonox. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
      </>
    ),
  },
  {
    icon: "📋",
    title: "Information We Collect",
    content: (
      <>
        We collect information you provide directly to us, such as when you create an account, register your salon, or contact us for support. This includes:
        <ul>
          <li>Full name, email address, and phone number</li>
          <li>Business name, address, and type</li>
          <li>Payment and billing information (processed securely via third-party providers)</li>
          <li>Usage data and activity logs within the platform</li>
        </ul>
      </>
    ),
  },
  {
    icon: "⚙️",
    title: "How We Use Your Information",
    content: (
      <>
        We use the information we collect to:
        <ul>
          <li>Provide, operate, and maintain the Salonox platform</li>
          <li>Process transactions and send related information</li>
          <li>Send administrative information, updates, and security alerts</li>
          <li>Respond to comments, questions, and requests</li>
          <li>Monitor and analyse usage trends to improve user experience</li>
        </ul>
      </>
    ),
  },
  {
    icon: "🤝",
    title: "Sharing of Information",
    content: (
      <>
        We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties except to trusted third parties who assist us in operating our platform — provided that those parties agree to keep this information confidential.
      </>
    ),
  },
  {
    icon: "🗄️",
    title: "Data Retention",
    content: (
      <>
        We retain your personal data for as long as your account is active or as needed to provide services. You may request deletion of your data at any time by contacting us at{" "}
        <a href="mailto:privacy@salonox.com">privacy@salonox.com</a>.
      </>
    ),
  },
  {
    icon: "🔒",
    title: "Security",
    content: (
      <>
        We use industry-standard security measures to protect your information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
      </>
    ),
  },
  {
    icon: "✅",
    title: "Your Rights",
    content: (
      <>
        You have the right to access, correct, or delete your personal data. You may also object to or restrict certain processing of your data. To exercise these rights, please contact us at{" "}
        <a href="mailto:privacy@salonox.com">privacy@salonox.com</a>.
      </>
    ),
  },
  {
    icon: "🔔",
    title: "Changes to This Policy",
    content: (
      <>
        We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date above.
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      badge="Legal · Privacy"
      title="Privacy Policy"
      subtitle="How we collect, use, and protect your personal information."
      sections={sections}
      contactEmail="privacy@salonox.com"
    />
  );
}
