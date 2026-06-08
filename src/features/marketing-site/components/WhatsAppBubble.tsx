import { useState } from 'react'

export default function WhatsAppBubble() {
  const [hovered, setHovered] = useState(false)

  return (
    <a
      href="https://wa.me/918010765945?text=Hi%2C%20I%27m%20interested%20in%20SalonOx.%20Can%20you%20help%20me%3F"
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: hovered ? 180 : 60,
        height: 60,
        background: '#25d366',
        borderRadius: 999,
        boxShadow: '0 4px 24px rgba(37,211,102,0.4)',
        textDecoration: 'none',
        transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        overflow: 'hidden',
        padding: '0 18px',
      }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="white"
        style={{ flexShrink: 0 }}
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.522 5.855L.057 23.882a.5.5 0 00.606.61l6.207-1.438A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.867 9.867 0 01-5.031-1.378l-.36-.214-3.733.865.936-3.613-.235-.372A9.844 9.844 0 012.118 12C2.118 6.533 6.533 2.118 12 2.118S21.882 6.533 21.882 12 17.467 21.882 12 21.882z" />
      </svg>

      <span
        style={{
          color: 'white',
          fontSize: 14,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          marginLeft: hovered ? 12 : 0,
          opacity: hovered ? 1 : 0,
          maxWidth: hovered ? 120 : 0,
          overflow: 'hidden',
          transition: 'all 0.3s ease',
        }}
      >
        Chat with us
      </span>
    </a>
  )
}