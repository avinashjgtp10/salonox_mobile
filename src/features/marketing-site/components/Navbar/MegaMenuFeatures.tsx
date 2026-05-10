import { useNavigate } from 'react-router-dom'
import { featureGroups } from '../../config/features.config'

const groupColors: Record<string, string> = {
  'Run Your Business':         '#c8ff57',
  'Grow Your Business':        'var(--sx-green)',
  'Simplify Payments':         'var(--sx-blue)',
  'Elevate Client Experience': 'var(--sx-pink)',
  'Build Your Brand':          'var(--sx-purple)',
}

export default function MegaMenuFeatures({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="sx-mega-menu sx-mega-features">
      {featureGroups.map(group => (
        <div key={group.label} className="sx-mega-col">
          <div className="sx-mega-col-title" style={{ color: groupColors[group.label], borderBottomColor: groupColors[group.label] }}>{group.label}</div>
          {group.features.map(ft => (
            <button key={ft.slug} className="sx-mega-item" onClick={() => { navigate(`/features/${ft.slug}`); onClose() }}>
              <span className="sx-mega-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
              {ft.name}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}