// src/components/ui/Skeleton.tsx
import React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 16,
  borderRadius = 6,
  className = "",
  style,
}) => (
  <div
    className={className}
    style={{
      width,
      height,
      borderRadius,
      background: "linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)",
      backgroundSize: "200% 100%",
      animation: "skeletonShimmer 1.4s ease infinite",
      ...style,
    }}
  />
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className = "" }) => (
  <div className={className} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} width={i === lines - 1 ? "60%" : "100%"} height={14} />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    className={className}
    style={{
      background: "#fff",
      border: "1px solid #E5E7EB",
      borderRadius: 14,
      padding: 20,
      boxShadow: "0 1px 3px rgba(0,0,0,.07)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <Skeleton width={40} height={40} borderRadius="50%" />
      <div style={{ flex: 1 }}>
        <Skeleton width="50%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="30%" height={12} />
      </div>
    </div>
    <SkeletonText lines={2} />
  </div>
);

// Inject keyframe once
if (typeof document !== "undefined" && !document.getElementById("skeleton-keyframe")) {
  const style = document.createElement("style");
  style.id = "skeleton-keyframe";
  style.textContent = `@keyframes skeletonShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;
  document.head.appendChild(style);
}

export default Skeleton;
