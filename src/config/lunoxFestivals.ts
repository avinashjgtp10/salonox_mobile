export type LunoxFestival = { name: string; date: string };

// India calendar, reviewed 2026-11-06. Refresh movable dates annually;
// Eid dates remain subject to local moon sightings. Do not repeat lunar dates
// in later years. Sources:
// https://www.timeanddate.com/holidays/india/2026
// https://www.timeanddate.com/holidays/india/2027
export const LUNOX_FESTIVALS: LunoxFestival[] = [
  { name: "Holi", date: "2026-03-04" },
  { name: "Gudi Padwa", date: "2026-03-19" },
  { name: "Eid al-Fitr", date: "2026-03-21" },
  { name: "Easter", date: "2026-04-05" },
  { name: "Eid al-Adha", date: "2026-05-28" },
  { name: "Onam", date: "2026-08-26" },
  { name: "Raksha Bandhan", date: "2026-08-28" },
  { name: "Ganesh Chaturthi", date: "2026-09-14" },
  { name: "Navratri", date: "2026-10-11" },
  { name: "Dussehra", date: "2026-10-20" },
  { name: "Karwa Chauth", date: "2026-10-29" },
  { name: "Diwali", date: "2026-11-08" },
  { name: "Guru Nanak Jayanti", date: "2026-11-24" },
  { name: "Eid al-Fitr", date: "2027-03-10" },
  { name: "Holi", date: "2027-03-22" },
  { name: "Easter", date: "2027-03-28" },
  { name: "Gudi Padwa", date: "2027-04-07" },
  { name: "Eid al-Adha", date: "2027-05-17" },
  { name: "Raksha Bandhan", date: "2027-08-17" },
  { name: "Ganesh Chaturthi", date: "2027-09-04" },
  { name: "Onam", date: "2027-09-12" },
  { name: "Navratri", date: "2027-09-30" },
  { name: "Dussehra", date: "2027-10-09" },
  { name: "Karwa Chauth", date: "2027-10-18" },
  { name: "Diwali", date: "2027-10-29" },
  { name: "Guru Nanak Jayanti", date: "2027-11-14" },
];

// UAE dates are separate from India: Eid can fall on different local dates.
// Sources (reviewed 2026-11-06; future lunar dates are tentative):
// https://www.timeanddate.com/holidays/united-arab-emirates/2026
// https://www.timeanddate.com/holidays/united-arab-emirates/2027
const UAE_FESTIVALS: LunoxFestival[] = [
  { name: "Eid al-Fitr", date: "2026-03-20" },
  { name: "Eid al-Adha", date: "2026-05-27" },
  { name: "Eid al-Fitr", date: "2027-03-10" },
  { name: "Eid al-Adha", date: "2027-05-17" },
];

export function festivalsForYear(year: number, country: string | null = "IN"): LunoxFestival[] {
  if (country === "AE") return [
    ...UAE_FESTIVALS.filter(festival => festival.date.startsWith(`${year}-`)),
    { name: "New Year", date: `${year}-01-01` },
    { name: "UAE National Day", date: `${year}-12-02` },
  ];
  if (country !== "IN") {
    // Only known fixed-date occasions for these markets. Unsupported markets
    // retain daily business questions instead of inheriting Indian festivals.
    return country && ["GB", "US", "CA", "AU"].includes(country) ? [
      { name: "New Year", date: `${year}-01-01` },
      { name: "Christmas", date: `${year}-12-25` },
    ] : [];
  }
  return [
    ...LUNOX_FESTIVALS.filter(festival => festival.date.startsWith(`${year}-`)),
    { name: "New Year", date: `${year}-01-01` },
    { name: "Christmas", date: `${year}-12-25` },
  ];
}
