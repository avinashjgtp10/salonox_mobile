import '../styles/components.scss'

const stats = [{ val: '500+', lbl: 'Businesses active' },{ val: '$2M+', lbl: 'Processed monthly' },{ val: '100K+', lbl: 'Appointments booked' },{ val: '4.9 ★', lbl: 'Average rating' },{ val: '14 day', lbl: 'Free trial' }]

export default function ProofBar() {
  return (
    <div className="proof-root">
      <div className="sx-section proof-inner">
        {stats.map((s, i) => (
          <div key={s.lbl} className="proof-stat">
            {i > 0 && <div className="proof-div" />}
            <div className="proof-val">{s.val}</div>
            <div className="proof-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>
    </div>
  )
}