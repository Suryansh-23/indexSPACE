import React from 'react';
import { FunctionSpaceProvider } from '@functionspace/react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import BrowserOnly from '@docusaurus/BrowserOnly';

// Inner component rendered only in the browser where useColorMode is available
function BrowserSDKProvider({ children }: { children: React.ReactNode }) {
  // Dynamic import to avoid SSR issues -- useColorMode requires ColorModeProvider
  const { useColorMode } = require('@docusaurus/theme-common');
  const { siteConfig } = useDocusaurusContext();
  const { fsBaseUrl } = siteConfig.customFields as { fsBaseUrl: string };
  const { colorMode } = useColorMode();
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

// SSR fallback: render provider with default dark theme
function SSRFallbackProvider({ children }: { children: React.ReactNode }) {
  const { siteConfig } = useDocusaurusContext();
  const { fsBaseUrl } = siteConfig.customFields as { fsBaseUrl: string };

  return (
    <FunctionSpaceProvider
      config={{
        baseUrl: fsBaseUrl,
      }}
      theme="fs-dark"
    >
      {children}
    </FunctionSpaceProvider>
  );
}

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <BrowserOnly fallback={<SSRFallbackProvider>{children}</SSRFallbackProvider>}>
      {() => <BrowserSDKProvider>{children}</BrowserSDKProvider>}
    </BrowserOnly>
  );
}
