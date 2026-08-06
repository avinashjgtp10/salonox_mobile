// Mirrors salon_mgm_backend/src/modules/inventory/unit-families.ts — inventory
// is always stored/deducted in the product's Base Unit; a Display/Conversion
// Unit is only ever valid within the SAME measurement family as the base
// unit. This copy drives the Add/Edit Consumable form's dropdown (what's
// even offered); the backend copy is what's actually enforced.

export type UnitFamily = "volume" | "weight" | "count";

export function getUnitFamily(baseUnit: string): UnitFamily {
  const u = (baseUnit || "").toLowerCase();
  if (u === "ml" || u === "l") return "volume";
  if (u === "g" || u === "gm" || u === "kg") return "weight";
  return "count";
}

export interface CompatibleUnit {
  name: string;
  // System-defined (e.g. "1 L = 1000 ml") — not product-specific, shown
  // read-only. Packaging units (Bottle, Tube, Sachet, ...) have no
  // fixedRatio — their size genuinely varies per product.
  fixedRatio?: number;
}

const FAMILY_UNITS: Record<UnitFamily, CompatibleUnit[]> = {
  volume: [
    { name: "L", fixedRatio: 1000 },
    { name: "Bottle" },
    { name: "Tube" },
    { name: "Sachet" },
    { name: "Cup" },
    { name: "Jar" },
  ],
  weight: [
    { name: "kg", fixedRatio: 1000 },
    { name: "Packet" },
    { name: "Jar" },
  ],
  count: [
    { name: "Box" },
    { name: "Roll" },
  ],
};

export const FAMILY_HINT: Record<UnitFamily, string> = {
  volume: "Volume: ml ↔ L",
  weight: "Weight: gm ↔ kg",
  count: "Count: pcs",
};

export function getCompatibleUnits(baseUnit: string): CompatibleUnit[] {
  return FAMILY_UNITS[getUnitFamily(baseUnit)];
}
