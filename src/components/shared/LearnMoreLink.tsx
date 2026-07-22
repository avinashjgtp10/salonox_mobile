import React from "react";
import { Link } from "react-router-dom";
import type { LinkProps } from "react-router-dom";

interface LearnMoreLinkProps extends Omit<LinkProps, "to"> {
  /** Key into HELP_TOPICS (src/features/help/helpTopics.ts) identifying the current screen. */
  topic: string;
}

/**
 * Drop-in replacement for the many static/dead "Learn more" links across the
 * app. Navigates to the Help & Support page with the topic pre-selected so
 * it can show screen-relevant guidance instead of a generic landing page.
 */
const LearnMoreLink: React.FC<LearnMoreLinkProps> = ({ topic, children, ...rest }) => (
  <Link to={`/dashboard/help?topic=${encodeURIComponent(topic)}`} {...rest}>
    {children ?? "Learn more"}
  </Link>
);

export default LearnMoreLink;
