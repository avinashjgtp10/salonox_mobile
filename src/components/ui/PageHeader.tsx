import React from "react";
import "./styles/PageHeader.scss";

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  /** Omit the bottom border/padding — for pages that put their own divider or banner right below. */
  bare?: boolean;
}

// Every top-level page in this app re-implemented its own title+subtitle+actions
// header with slightly different markup/spacing/border. One shared component so
// new pages don't reinvent it and existing ones read as one product.
const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, className = "", bare = false }) => (
  <div className={`ui-page-header${bare ? " ui-page-header--bare" : ""} ${className}`}>
    <div>
      <h1 className="ui-page-header__title">{title}</h1>
      {subtitle && <p className="ui-page-header__subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="ui-page-header__actions">{actions}</div>}
  </div>
);

export default PageHeader;
