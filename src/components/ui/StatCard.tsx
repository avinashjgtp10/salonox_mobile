// src/components/ui/StatCard.tsx
import React from "react";

type Variant = "purple" | "indigo" | "rose" | "emerald" | "amber";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: Variant;
  className?: string;
}

const GRADIENTS: Record<Variant, string> = {
  purple:  "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
  indigo:  "linear-gradient(135deg, #6366F1 0%, #4338CA 100%)",
  rose:    "linear-gradient(135deg, #F43F5E 0%, #BE123C 100%)",
  emerald: "linear-gradient(135deg, #10B981 0%, #047857 100%)",
  amber:   "linear-gradient(135deg, #F59E0B 0%, #B45309 100%)",
};

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, variant = "purple", className = "" }) => (
  <div
    className={className}
    style={{
      position: "relative",
      borderRadius: 14,
      padding: "18px 20px",
      background: GRADIENTS[variant],
      color: "#fff",
      overflow: "hidden",
      boxShadow: "0 4px 16px rgba(0,0,0,.1)",
      transition: "transform .15s ease, box-shadow .15s ease",
      cursor: "default",
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,.16)"; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,.1)"; }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
        borderRadius: 10,
        background: "rgba(255,255,255,.2)",
        marginBottom: 14,
        fontSize: 18,
      }}
    >
      {icon}
    </div>
    <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>{value}</div>
    <div style={{ fontSize: 12, fontWeight: 500, opacity: .82 }}>{label}</div>
    <div
      style={{
        position: "absolute",
        right: -18,
        bottom: -18,
        width: 90,
        height: 90,
        borderRadius: "50%",
        background: "rgba(255,255,255,.1)",
        pointerEvents: "none",
      }}
    />
  </div>
);

export default StatCard;
