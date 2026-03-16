import React, { useState, useEffect } from 'react';
import { FunctionSpaceProvider } from '@functionspace/react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import BrowserOnly from '@docusaurus/BrowserOnly';

function getBaseUrl(customFields: Record<string, unknown> | undefined): string {
  const url = customFields?.fsBaseUrl;
  if (typeof url !== 'string' || !url) {
    throw new Error('Missing customFields.fsBaseUrl in docusaurus.config.js');
  }
  return url;
}

// Read color mode from DOM instead of useColorMode hook.
// Root is above ColorModeProvider in the Docusaurus tree, so the hook
// is not available here. Docusaurus sets data-theme on <html>.
function useDocusaurusColorMode(): 'dark' | 'light' {
  const [mode, setMode] = useState<'dark' | 'light'>(() => {
    const attr = document.documentElement.getAttribute('data-theme');
    return attr === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const attr = document.documentElement.getAttribute('data-theme');
      setMode(attr === 'light' ? 'light' : 'dark');
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return mode;
}

function BrowserSDKProvider({ children }: { children: React.ReactNode }) {
  const { siteConfig } = useDocusaurusContext();
  const fsBaseUrl = getBaseUrl(siteConfig.customFields as Record<string, unknown>);
  const colorMode = useDocusaurusColorMode();
  const fsTheme = colorMode === 'dark' ? 'fs-dark' : 'fs-light';

  return (
    <FunctionSpaceProvider
      config={{
        baseUrl: fsBaseUrl,
      }}
      theme={fsTheme}
    >
      {children}
    </FunctionSpaceProvider>
  );
}

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <BrowserOnly fallback={<>{children}</>}>
      {() => <BrowserSDKProvider>{children}</BrowserSDKProvider>}
    </BrowserOnly>
  );
}
