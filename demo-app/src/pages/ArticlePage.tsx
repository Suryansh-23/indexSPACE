import React from 'react';
import { ArticleHeader } from '../components/ArticleHeader';
import { ArticleBody } from '../components/ArticleBody';
import { ArticleFooter } from '../components/ArticleFooter';
import '../styles/article.css';

interface ArticlePageProps {
  children?: React.ReactNode;
  widgetWidth?: string;
}

export function ArticlePage({ children, widgetWidth }: ArticlePageProps) {
  const hasWidget = Boolean(children);

  const widgetStyle: React.CSSProperties | undefined = widgetWidth
    ? {
        width: widgetWidth,
        maxWidth: '100vw',
        position: 'relative',
        left: '50%',
        transform: 'translateX(-50%)',
      }
    : undefined;

  return (
    <div className="article-page">
      <ArticleHeader />
      <main className="article-main">
        <ArticleBody />
        {hasWidget && (
          <>
            <section className="article-widget-section" style={widgetStyle}>
              <h2 className="article-section-heading">What Does the Market Think?</h2>
              <p className="article-widget-intro">
                See what the crowd believes — and add your own forecast.
              </p>
              {/* DEMO: Enable the below to show the FS market */}
              <div className="fs-widget-container">
                {children}
              </div>
            </section>

            <div className="article-body-text">
              <p>
                Whatever the outcome, the convergence of AI capabilities and consumer demand
                makes Q3 2026 one of the most closely watched quarters in Apple's recent history.
                Market participants continue to update their forecasts as new data emerges —
                a process that the probability market above captures in real time.
              </p>
              <p>
                <em>
                  Disclaimer: The market shown above is for demonstration purposes only.
                  No real money is at risk.
                </em>
              </p>
            </div>

            <div className="article-attribution">
              <span>Powered by <strong>functionSPACE</strong></span>
              <a href="https://functionspace.dev" target="_blank" rel="noopener noreferrer">
                Learn more →
              </a>
            </div>
          </>
        )}
      </main>
      <ArticleFooter />
    </div>
  );
}
