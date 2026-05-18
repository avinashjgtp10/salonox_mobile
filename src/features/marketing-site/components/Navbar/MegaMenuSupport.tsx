import { useNavigate } from 'react-router-dom'

const supportItems = [
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>, title: 'Call Support',     desc: 'Speak directly with our team for urgent issues.',    color: 'var(--sx-text-primary)', isStatus: false },
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>, title: 'Support Articles', desc: 'Browse our knowledge base for guides.',               color: 'var(--sx-blue)',         isStatus: false },
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>, title: 'Feature Requests', desc: "Have an idea? We'd love to hear it.",                color: 'var(--sx-purple)',       isStatus: false },
  { icon: null, title: 'System Status', desc: 'All systems operational · 99.9% uptime.', color: 'var(--sx-green)', isStatus: true },
]

export default function MegaMenuSupport({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="sx-mega-menu sx-mega-support">
      {supportItems.map(item => (
        <button key={item.title} className="sx-support-item" onClick={() => { navigate('/support'); onClose() }}>
          <div className="sx-support-icon" style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)` }}>
            {item.isStatus ? <span className="sx-system-dot" /> : <span style={{ color: item.color }}>{item.icon}</span>}
          </div>
          <div>
            <div className="sx-support-title" style={{ color: item.color }}>{item.title}</div>
            <div className="sx-support-desc">{item.desc}</div>
          </div>
        </button>
      ))}
    </div>
  )
}