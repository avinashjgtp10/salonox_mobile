export type BusinessCategory = {
  description: string;
  exampleServices: string[];
  id: string;
  name: string;
};

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  {
    id: "hair-salon",
    name: "Hair Salon",
    description: "A focused hair care business offering cuts, styling, color, and hair treatments.",
    exampleServices: ["Haircuts", "Blow dry", "Hair coloring", "Keratin treatments"],
  },
  {
    id: "beauty-salon",
    name: "Beauty Salon",
    description: "A full-service beauty destination for everyday grooming and personal care.",
    exampleServices: ["Facials", "Threading", "Waxing", "Makeup"],
  },
  {
    id: "barber-shop",
    name: "Barber Shop",
    description: "A grooming business centered on men's haircuts, beard care, and classic barbering.",
    exampleServices: ["Men's haircuts", "Beard trims", "Shaves", "Hair styling"],
  },
  {
    id: "nail-salon",
    name: "Nail Salon",
    description: "A nail care studio for manicures, pedicures, extensions, and nail art.",
    exampleServices: ["Manicure", "Pedicure", "Gel polish", "Nail extensions"],
  },
  {
    id: "spa",
    name: "Spa",
    description: "A relaxation and wellness space offering restorative body and skin experiences.",
    exampleServices: ["Body massage", "Body scrub", "Aromatherapy", "Spa packages"],
  },
  {
    id: "skin-clinic",
    name: "Skin Clinic",
    description: "A skin-focused business providing facial treatments and corrective skincare.",
    exampleServices: ["Cleanups", "Peels", "Acne care", "Brightening treatments"],
  },
  {
    id: "makeup-studio",
    name: "Makeup Studio",
    description: "A makeup-first studio for events, shoots, parties, and personal styling.",
    exampleServices: ["Party makeup", "HD makeup", "Editorial looks", "Hair styling"],
  },
  {
    id: "bridal-studio",
    name: "Bridal Studio",
    description: "A specialist studio for bridal beauty, trials, packages, and wedding-day services.",
    exampleServices: ["Bridal makeup", "Pre-bridal care", "Draping", "Bridal hair"],
  },
  {
    id: "massage-therapy",
    name: "Massage Therapy",
    description: "A wellness service business built around therapeutic and relaxation massage.",
    exampleServices: ["Deep tissue", "Swedish massage", "Foot massage", "Sports massage"],
  },
  {
    id: "wellness-center",
    name: "Wellness Center",
    description: "A broader wellness business offering treatments that support recovery and balance.",
    exampleServices: ["Wellness consultations", "Therapy sessions", "Detox services", "Relaxation programs"],
  },
  {
    id: "aesthetic-clinic",
    name: "Aesthetic Clinic",
    description: "An advanced beauty clinic for aesthetic, cosmetic, and skin enhancement services.",
    exampleServices: ["Laser hair removal", "Skin rejuvenation", "Injectables", "Medi-facials"],
  },
  {
    id: "lash-brow-studio",
    name: "Lash & Brow Studio",
    description: "A specialist studio focused on eye-area styling, shaping, and enhancement.",
    exampleServices: ["Brow shaping", "Brow lamination", "Lash extensions", "Lash lift"],
  },
  {
    id: "tattoo-piercing-studio",
    name: "Tattoo & Piercing Studio",
    description: "A body art studio offering tattoo, piercing, and aftercare services.",
    exampleServices: ["Custom tattoos", "Piercing", "Touch-ups", "Aftercare"],
  },
  {
    id: "tanning-studio",
    name: "Tanning Studio",
    description: "A studio providing tanning, bronzing, and glow-focused body services.",
    exampleServices: ["Spray tan", "Body bronzing", "Pre-tan prep", "Aftercare"],
  },
  {
    id: "mobile-beauty-services",
    name: "Mobile Beauty Services",
    description: "An on-location beauty business serving clients at homes, venues, or offices.",
    exampleServices: ["Home salon", "Event services", "Mobile makeup", "On-site grooming"],
  },
  {
    id: "beauty-academy",
    name: "Beauty Academy",
    description: "A training-led business offering professional courses and beauty education.",
    exampleServices: ["Makeup courses", "Hair courses", "Nail training", "Workshops"],
  },
];
