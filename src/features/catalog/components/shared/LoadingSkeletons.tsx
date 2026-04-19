import React from "react";

const ServiceCardSkeleton: React.FC = () => (
  <div className="slp__service-card slp__skeleton-card">
    <div className="slp__svc-left">
      <div className="slp__skeleton slp__skeleton--avatar" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="slp__skeleton slp__skeleton--name" />
        <div className="slp__skeleton slp__skeleton--meta" />
      </div>
    </div>
    <div className="slp__svc-right">
      <div className="slp__skeleton slp__skeleton--price" />
    </div>
  </div>
);

const ServiceGroupSkeleton: React.FC = () => (
  <div className="slp__group">
    <div className="slp__group-header">
      <div className="slp__skeleton slp__skeleton--group-title" />
    </div>
    <div className="slp__service-list">
      <ServiceCardSkeleton />
      <ServiceCardSkeleton />
      <ServiceCardSkeleton />
    </div>
  </div>
);

export const ServiceListSkeleton: React.FC<{ groups?: number }> = ({
  groups = 2,
}) => (
  <div className="slp__content">
    {Array.from({ length: groups }, (_, i) => (
      <ServiceGroupSkeleton key={i} />
    ))}
  </div>
);

export default ServiceListSkeleton;
