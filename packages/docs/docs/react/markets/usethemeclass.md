---
title: "useThemeClass"
sidebar_position: 8
description: "Returns the scoped CSS class name for portal theme support."
---

# useThemeClass

**`useThemeClass()`**

Returns the scoped CSS class name that carries all theme CSS variables. Apply this class to portal containers so portaled SDK widgets inherit theming.

```typescript
function useThemeClass(): string
```

**Requirements:**

- Must be called within a `FunctionSpaceProvider`
- The Provider must have `portalSupport={true}`

Throws a descriptive error if either condition is not met.

**Why this exists:**

React portals (`createPortal`) render outside the Provider's DOM tree. Since FunctionSpace theme variables are set as CSS custom properties on the Provider's wrapper div, portaled components lose access to them. When `portalSupport` is enabled, the Provider injects a `<style>` tag into `document.head` with a scoped class containing all 30 CSS variables. `useThemeClass()` returns this class name so you can apply it to your portal container.

**Example:**

```tsx
import { useThemeClass } from '@functionspace/react';
import { createPortal } from 'react-dom';

function ThemedModal({ children }: { children: React.ReactNode }) {
  const themeClass = useThemeClass();

  return createPortal(
    <div className={themeClass}>
      {children}
    </div>,
    document.body
  );
}
```

**Usage with FunctionSpaceProvider:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark" portalSupport>
  <App />
</FunctionSpaceProvider>
```

Any `ThemedModal` rendered inside `<App>` will carry the Provider's theme variables, even though the modal's DOM node is appended to `document.body`.
