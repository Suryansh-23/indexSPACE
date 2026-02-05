import React from 'react';

export function ArticleHeader() {
  return (
    <header className="article-header">
      <div className="article-header-inner">
        <div className="article-logo">TechInsight</div>
        <nav className="article-nav">
          <a href="#">Markets</a>
          <a href="#">Analysis</a>
          <a href="#">Research</a>
          <a href="#">About</a>
        </nav>
      </div>
    </header>
  );
}
