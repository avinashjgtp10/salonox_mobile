// Update once to keep the office copy and directions in sync.
export const COMPANY = {
  name: 'SalonoxTech Soft',
  address: 'INTERNATIONAL TECH PARK, Plot No. 18, MIDC Phase III Rd, Phase 3, Rajiv Gandhi Infotech Park, Hinjawadi, Pune, Maharashtra 411057',
  gst: '27ASPPJ5781N1ZT',
} as const;

export const OFFICE_MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(COMPANY.address)}`;
export const OFFICE_MAP_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(COMPANY.address)}&output=embed&hl=en`;
