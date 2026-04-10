---
title: "Authentication"
sidebar_position: 1
description: "Authentication widgets: AuthWidget for username/password and PasswordlessAuthWidget for auto-signup."
---

# Authentication

Pre-built authentication widgets that handle login, signup, and session management. Both widgets are self-contained and manage their own state via `useAuth`.

| Widget | Use Case |
|--------|----------|
| **AuthWidget** | Traditional username/password login and signup forms. Best for apps where users already have accounts. |
| **PasswordlessAuthWidget** | One-field username entry that auto-creates accounts. Includes an admin login modal for password-protected accounts. Best for low-friction onboarding. |

Both require `FunctionSpaceProvider` as an ancestor.

