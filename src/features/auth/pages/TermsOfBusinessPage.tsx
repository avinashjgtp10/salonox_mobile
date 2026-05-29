import LegalPageLayout from "../components/LegalPageLayout";

const sections = [
  {
    icon: "🤝",
    title: "Business Relationship",
    content: (
      <>
        These Terms of Business govern the commercial relationship between Salonox Technologies Pvt. Ltd. ("Salonox") and the salon business ("Client") subscribing to our platform. By activating a Salonox account for your salon, you agree to these terms.
      </>
    ),
  },
  {
    icon: "🚀",
    title: "Onboarding and Setup",
    content: (
      <>
        Upon registration, Salonox will provide access to the platform and onboarding resources. The Client is responsible for accurately setting up their salon profile, services, staff, and pricing information. Salonox may offer guided onboarding support during the trial period.
      </>
    ),
  },
  {
    icon: "📊",
    title: "Service Level",
    content: (
      <>
        Salonox commits to:
        <ul>
          <li>Maintaining platform uptime of at least 99.5% on a monthly basis</li>
          <li>Providing customer support via email within 2 business days</li>
          <li>Releasing regular updates and improvements to the platform</li>
          <li>Notifying Clients of planned maintenance at least 24 hours in advance</li>
        </ul>
      </>
    ),
  },
  {
    icon: "✅",
    title: "Client Responsibilities",
    content: (
      <>
        The Client agrees to:
        <ul>
          <li>Provide accurate and up-to-date business information</li>
          <li>Ensure all staff members using the platform comply with these terms</li>
          <li>Not resell or sublicense access to the Salonox platform</li>
          <li>Pay all applicable subscription fees on time</li>
          <li>Maintain the confidentiality of customer data collected through the platform</li>
        </ul>
      </>
    ),
  },
  {
    icon: "🗂️",
    title: "Data Ownership",
    content: (
      <>
        All customer data entered into the Salonox platform by the Client remains the property of the Client. Salonox acts as a data processor and will not use Client data for purposes other than providing the service. Upon account termination, the Client may request an export of their data within 30 days.
      </>
    ),
  },
  {
    icon: "💳",
    title: "Payment Terms",
    content: (
      <>
        Subscription fees are due in advance and must be paid by the due date. Failure to pay may result in suspension or termination of access. All prices are inclusive of applicable taxes unless stated otherwise. Salonox reserves the right to revise pricing with 30 days' written notice.
      </>
    ),
  },
  {
    icon: "🔏",
    title: "Confidentiality",
    content: (
      <>
        Both parties agree to keep confidential all non-public information received from the other party and to use such information solely for the purpose of fulfilling obligations under this agreement.
      </>
    ),
  },
  {
    icon: "🛡️",
    title: "Indemnification",
    content: (
      <>
        The Client agrees to indemnify and hold harmless Salonox, its officers, directors, employees, and agents from any claims, damages, or expenses arising out of the Client's use of the platform, violation of these terms, or infringement of any third-party rights.
      </>
    ),
  },
  {
    icon: "⚖️",
    title: "Dispute Resolution",
    content: (
      <>
        Any disputes arising under these Terms of Business shall first be attempted to be resolved through good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration in accordance with the laws of India.
      </>
    ),
  },
  {
    icon: "🔔",
    title: "Amendments",
    content: (
      <>
        Salonox may amend these Terms of Business at any time. Clients will be notified via email or platform notification at least 15 days before changes take effect. Continued use of the platform after the effective date constitutes acceptance of the revised terms.
      </>
    ),
  },
];

export default function TermsOfBusinessPage() {
  return (
    <LegalPageLayout
      badge="Legal · Business"
      title="Terms of Business"
      subtitle="The commercial agreement between Salonox and your salon business."
      sections={sections}
      contactEmail="business@salonox.com"
    />
  );
}
