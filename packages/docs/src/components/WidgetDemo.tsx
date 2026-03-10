import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

interface WidgetDemoProps {
  children: React.ReactNode;
  height?: string;
  title?: string;
}

class WidgetErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '1rem',
          color: 'var(--ifm-color-danger)',
          background: 'var(--ifm-color-danger-contrast-background)',
          borderRadius: '4px',
          fontSize: '0.9rem',
        }}>
          Widget failed to load: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function WidgetDemo({ children, height, title }: WidgetDemoProps) {
  return (
    <div style={{
      border: '1px solid var(--ifm-color-emphasis-300)',
      borderRadius: '8px',
      overflow: 'hidden',
      margin: '1.5rem 0',
    }}>
      {title && (
        <div style={{
          padding: '0.5rem 1rem',
          borderBottom: '1px solid var(--ifm-color-emphasis-300)',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--ifm-color-emphasis-700)',
        }}>
          {title}
        </div>
      )}
      <div style={{
        padding: '1rem',
        background: 'var(--fs-background)',
        minHeight: height || 'auto',
      }}>
        <BrowserOnly fallback={<div style={{ color: 'var(--ifm-color-emphasis-600)' }}>Loading widget...</div>}>
          {() => (
            <WidgetErrorBoundary>
              {children}
            </WidgetErrorBoundary>
          )}
        </BrowserOnly>
      </div>
    </div>
  );
}
