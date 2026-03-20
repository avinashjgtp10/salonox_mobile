import React from "react"
import "../styles/AddOnsPage.scss"
import { 
  CreditCard, 
  Headset, 
  BarChart, 
  Star, 
  Diamond, 
  Link as LinkIcon, 
  Google, 
  Facebook, 
  Meta 
} from "react-bootstrap-icons"

// Types
interface AddOn {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  iconColorClass: string
  badge?: string
}

const addOnsData: AddOn[] = [
  {
    id: "payments",
    title: "Payments",
    description: "Get paid by clients online and in-store with low cost, safe and simple payments integrated directly to your workspace.",
    icon: <CreditCard size={24} />,
    iconColorClass: "icon-blue"
  },
  {
    id: "premium-support",
    title: "Premium Support",
    description: "Get the most out of the Fresha platform and it's features with help from our experienced business support specialists.",
    icon: <Headset size={24} />,
    iconColorClass: "icon-purple",
    badge: "On free trial"
  },
  {
    id: "insights",
    title: "Insights",
    description: "Unlock additional reports and create your own unique reports which you can share with your team.",
    icon: <BarChart size={24} />,
    iconColorClass: "icon-indigo"
  },
  {
    id: "google-rating",
    title: "Google Rating Boost",
    description: "Prompt your clients to leave a Google review after they've had a positive experience and increase your footfall.",
    icon: <Star size={24} />,
    iconColorClass: "icon-orange"
  },
  {
    id: "client-loyalty",
    title: "Client Loyalty",
    description: "Encourage repeat visits and larger purchases by rewarding clients with exclusive offers that celebrate their loyalty.",
    icon: <Diamond size={24} />,
    iconColorClass: "icon-pink"
  },
  {
    id: "data-connector",
    title: "Data Connector",
    description: "Connect the power of Fresha data to your external spreadsheets, systems and other software.",
    icon: <LinkIcon size={24} />,
    iconColorClass: "icon-green"
  }
]

const integrationsData: AddOn[] = [
  {
    id: "google-reserve",
    title: "Google Reserve",
    description: "Capture online bookings directly from Google Search, Google Maps and more with our Google integration.",
    icon: <Google size={24} />,
    iconColorClass: "icon-white"
  },
  {
    id: "facebook-instagram",
    title: "Facebook and Instagram bookings",
    description: "Add online booking to your social media pages.",
    icon: <Facebook size={24} />,
    iconColorClass: "icon-white"
  },
  {
    id: "meta-pixel",
    title: "Meta Pixel Ads",
    description: "Use your Facebook Ads Pixel to track events, and create audiences based on their activities.",
    icon: <Meta size={24} />,
    iconColorClass: "icon-white"
  },
  {
    id: "google-analytics",
    title: "Google Analytics",
    description: "Send events about certain actions to Google Analytics, and create goals based on events to track conversions.",
    icon: <BarChart size={24} />,
    iconColorClass: "icon-white"
  }
]

export default function AddOnsPage() {
  return (
    <div className="add-ons-page">
      <div className="page-header">
        <h1 className="fw-bold">Fresha add-ons</h1>
        <p className="subtitle text-muted">Take your business to the next level with Fresha add-ons.</p>
      </div>

      <section className="addon-section">
        <h3 className="section-title">Add-ons</h3>
        <div className="addon-grid">
          {addOnsData.map((addon) => (
            <div key={addon.id} className="addon-card">
              <div className="card-top">
                <div className={`icon-container ${addon.iconColorClass}`}>
                  {addon.icon}
                </div>
                {addon.badge && (
                  <span className="badge-free-trial">{addon.badge}</span>
                )}
              </div>
              <div className="card-body">
                <h5 className="card-title fw-bold">{addon.title}</h5>
                <p className="card-desc text-muted">{addon.description}</p>
              </div>
              <div className="card-action">
                <button className="btn btn-outline-secondary rounded-pill fw-bold view-btn">
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="addon-section mt-5">
        <h3 className="section-title">Integrations</h3>
        <div className="addon-grid">
          {integrationsData.map((addon) => (
            <div key={addon.id} className="addon-card">
              <div className="card-top">
                <div className={`icon-container ${addon.iconColorClass} ${addon.iconColorClass === 'icon-white' ? 'border' : ''}`}>
                  {addon.icon}
                </div>
              </div>
              <div className="card-body">
                <h5 className="card-title fw-bold">{addon.title}</h5>
                <p className="card-desc text-muted">{addon.description}</p>
              </div>
              <div className="card-action">
                <button className="btn btn-outline-secondary rounded-pill fw-bold view-btn">
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
