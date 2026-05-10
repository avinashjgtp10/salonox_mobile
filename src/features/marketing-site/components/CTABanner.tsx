import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../../../hooks/useAppRedux'
import '../styles/components.scss'

interface Props {
  heading?: string; sub?: string; primaryLabel?: string; secondaryLabel?: string; primaryPath?: string; secondaryPath?: string; bgImage?: string;
}

export default function CTABanner({ heading = 'Run your business smarter. Start today.', sub = 'Join 500+ businesses already using SalonOx every day. Free 14-day trial, no credit card required.', primaryLabel = 'Start free trial →', secondaryLabel = 'Talk to sales', primaryPath = '/register', secondaryPath = '/contact-sales', bgImage = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1600&q=80' }: Props) {
  const navigate = useNavigate()
  const { accessToken } = useAppSelector((state) => state.auth)
  const resolvedPrimary = accessToken ? '/dashboard' : primaryPath

  return (
    <section className="cta-root">
      <div className="cta-bg" style={{ backgroundImage: `url(${bgImage})` }} />
      <div className="cta-overlay" />
      <div className="sx-section cta-inner">
        <div className="cta-badge">Ready to grow?</div>
        <h2 className="cta-heading">{heading}</h2>
        <p className="cta-sub">{sub}</p>
        <div className="cta-actions">
          <button className="sx-btn-primary" onClick={() => navigate(resolvedPrimary)}>{primaryLabel}</button>
          <button className="sx-btn-outline" style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }} onClick={() => navigate(secondaryPath)}>{secondaryLabel}</button>
        </div>
      </div>
    </section>
  )
}