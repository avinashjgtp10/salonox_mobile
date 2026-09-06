import type { SVGProps } from "react";

interface WarehouseIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

// Custom line-art icon (house-shaped roof, roof vent, open doorway with two
// stacked crates) — none of the icon packs already in this project
// (react-bootstrap-icons, lucide-react, react-icons' Font Awesome/Material/
// Tabler sets) have a warehouse glyph with this silhouette, and the
// reference the design was matched to is a licensed stock icon, so this is
// an original redraw of the same composition rather than a traced copy.
export default function WarehouseIcon({ size = 22, ...props }: WarehouseIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Roof + walls */}
      <path d="M12 3 L4 9 L4 20 L20 20 L20 9 Z" />
      {/* Roof vent */}
      <rect x="10" y="5.6" width="4" height="1.8" />
      {/* Doorway */}
      <path d="M9 20 V13 H15 V20" />
      {/* Stacked crates inside the doorway */}
      <rect x="9.6" y="16" width="2.1" height="2.1" />
      <rect x="12.1" y="16" width="2.1" height="2.1" />
    </svg>
  );
}
