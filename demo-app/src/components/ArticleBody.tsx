import React from 'react';

export function ArticleBody() {
  return (
    <article className="article-body-text">
      <h1 className="article-title">
        Apple Q3 2026: How Many iPhones Will Ship?
      </h1>
      <p className="article-subtitle">
        Analysts divided as AI features drive upgrade cycle amid global economic headwinds
      </p>
      <div className="article-byline">
        <span>By Sarah Chen</span>
        <span className="article-byline-sep">|</span>
        <span>January 28, 2026</span>
        <span className="article-byline-sep">|</span>
        <span>6 min read</span>
      </div>

      <p>
        Apple is expected to report its Q3 2026 iPhone shipment numbers in late October,
        and the analyst community remains sharply divided. Estimates range from 46 million
        to 58 million units, reflecting deep uncertainty about how several competing forces
        will play out over the summer months.
      </p>

      <p>
        The bullish case centers on Apple Intelligence  -- the suite of on-device AI features
        introduced at WWDC 2025 and expanded significantly in the iPhone 17 lineup.
        Early adoption data suggests these features are driving a meaningful upgrade cycle,
        particularly in the US and European markets where older iPhone 12 and 13 users
        are finally seeing a compelling reason to switch. Morgan Stanley's Erik Woodring
        has raised his estimate to 56 million units, citing "the strongest replacement
        demand we've seen since the 5G cycle."
      </p>

      <p>
        On the bearish side, competition in China continues to intensify. Huawei's Mate 70
        series has captured significant share in the premium segment, and Xiaomi's latest
        flagship has narrowed the camera quality gap that long justified Apple's price premium.
        Meanwhile, macroeconomic conditions in Europe remain soft, with consumer confidence
        indices still below pre-pandemic levels in several key markets.
      </p>

      <p>
        The middle ground  -- where most analysts have landed  -- sits around 51-52 million units.
        This assumes Apple Intelligence drives moderate uplift in developed markets while
        China shipments remain roughly flat year-over-year. The key wildcard is India,
        where Apple's aggressive pricing of the iPhone SE 4 could open a volume opportunity
        that wasn't in earlier models.
      </p>
    </article>
  );
}
