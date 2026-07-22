import React from 'react';
import {
  Icon,
  MULTI_BRANCH_FEATURES,
  Reveal,
  SectionArtwork,
  SectionTransition,
} from '../shared';


const MultiBranch: React.FC = () => (
  <section id="multi-branch" className="mb-section">
    <SectionTransition from="dark" />
    <SectionArtwork variant="dashboard" />
    <div className="container">
      <Reveal>
        <div className="section-head">
          <span className="eyebrow"><span className="dot" /> Multi-Branch</span>
          <h2>One platform. Every branch. Total control.</h2>
          <p>
            Built for salon groups, not just single locations. Run every branch with the same
            tools, oversight, and polish, without adding a single extra login.
          </p>
        </div>
      </Reveal>

      <div className="mb-grid">
        {MULTI_BRANCH_FEATURES.map((feature, i) => {
          const Cmp = Icon[feature.icon];
          return (
            <Reveal key={feature.title} delay={(i % 3) as 0 | 1 | 2}>
              <div className="mb-card">
                <span className="mb-card-icon"><Cmp /></span>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  </section>
);

export default React.memo(MultiBranch);
