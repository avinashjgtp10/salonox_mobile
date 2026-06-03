// src/components/ui/Tabs.tsx
import React from "react";

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  variant?: "pill" | "underline";
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeKey, onChange, variant = "pill", className = "" }) => {
  if (variant === "underline") {
    return (
      <div className={className} style={{ display: "flex", gap: 0, borderBottom: "1.5px solid #E5E7EB" }}>
        {tabs.map(tab => {
          const active = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "none",
                borderBottom: active ? "2px solid #6C27BE" : "2px solid transparent",
                marginBottom: -1.5,
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? "#6C27BE" : "#6B7280",
                cursor: "pointer",
                transition: "all .15s",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: active ? "#6C27BE" : "#E5E7EB",
                    color: active ? "#fff" : "#6B7280",
                    borderRadius: 10,
                    padding: "1px 6px",
                    transition: "all .15s",
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={className} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {tabs.map(tab => {
        const active = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: active ? 700 : 500,
              cursor: "pointer",
              border: `1.5px solid ${active ? "#6C27BE" : "#E5E7EB"}`,
              background: active ? "#EDE9FE" : "transparent",
              color: active ? "#6C27BE" : "#6B7280",
              transition: "all .15s",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: active ? "#6C27BE" : "#E5E7EB",
                  color: active ? "#fff" : "#6B7280",
                  borderRadius: 10,
                  padding: "0px 5px",
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
