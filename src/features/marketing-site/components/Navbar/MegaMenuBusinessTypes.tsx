import { useNavigate } from 'react-router-dom'
import { beautyTypes, wellnessTypes, fitnessTypes } from '../../config/businessTypes.config'

const categories = [
  { label: 'Beauty',   color: '#ec4899',        types: beautyTypes   },
  { label: 'Wellness', color: 'var(--sx-green)', types: wellnessTypes },
  { label: 'Fitness',  color: 'var(--sx-blue)',  types: fitnessTypes  },
]

export default function MegaMenuBusinessTypes({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="sx-mega-menu sx-mega-business">
      {categories.map(cat => (
        <div key={cat.label} className="sx-mega-col">
          <div className="sx-mega-col-title" style={{ color: cat.color, borderBottomColor: cat.color }}>{cat.label}</div>
          {cat.types.map(bt => (
            <button key={bt.slug} className="sx-mega-item" onClick={() => { navigate(`/business/${bt.slug}`); onClose() }}>
              <span className="sx-mega-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
              </span>
              {bt.name}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}