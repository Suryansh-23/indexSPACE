#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");
const envPath = resolve(repoRoot, "indexspace", ".env");

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const lines = readFileSync(path, "utf8").split("\n");
  const vars = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1);
    vars[key] = value;
  }
  return vars;
}

function maskSecret(value, visible = 4) {
  if (!value) return "(empty)";
  if (value.length <= visible * 2) return "*".repeat(value.length);
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

function logStage(stage, message, details) {
  console.log(`\n[${stage}] ${message}`);
  if (details !== undefined) {
    console.log(typeof details === "string" ? details : JSON.stringify(details, null, 2));
  }
}

const fileEnv = loadEnvFile(envPath);
const baseUrl = process.env.FS_API_URL || fileEnv.FS_API_URL || "https://fs-engine-api-dev.onrender.com";
const username = process.env.FS_USERNAME_TO_CREATE || process.argv[2] || "indexSPACE";
const password = process.env.FS_PASSWORD_TO_CREATE || `idxspc_${randomBytes(12).toString("base64url")}`;

logStage("config", "Resolved account bootstrap inputs", {
  baseUrl,
  username,
  passwordMasked: maskSecret(password),
  envPath,
});

logStage("probe", "Checking whether the username already exists via passwordless login probe");
const probe = await postJson(`${baseUrl}/api/auth/login`, { username });
logStage("probe", "Passwordless probe response", {
  status: probe.res.status,
  ok: probe.res.ok,
  body: probe.json ?? probe.text,
});

if (probe.res.ok) {
  logStage("result", "Username already exists as a passwordless account. No password was set by this script.", {
    username,
    action: "passwordless-login-succeeded",
    tokenPresent: Boolean(probe.json?.access_token),
  });
  process.exit(2);
}

const probeDetail = probe.json?.detail ?? "";
if (probeDetail === "Password required for this account") {
  logStage("result", "Username already exists as a password-protected account. This script cannot overwrite its password.", {
    username,
    action: "existing-password-account",
  });
  process.exit(3);
}

if (probeDetail !== "Invalid username") {
  logStage("error", "Unexpected probe result. Refusing to continue blind.", {
    username,
    status: probe.res.status,
    body: probe.json ?? probe.text,
  });
  process.exit(4);
}

logStage("signup", "Creating a new password-protected FunctionSpace account", {
  username,
  passwordMasked: maskSecret(password),
});
const signup = await postJson(`${baseUrl}/api/auth/signup`, { username, password });
logStage("signup", "Signup response", {
  status: signup.res.status,
  ok: signup.res.ok,
  body: signup.json ?? signup.text,
});

if (!signup.res.ok) {
  process.exit(5);
}

logStage("login", "Logging in with the newly created credentials");
const login = await postJson(`${baseUrl}/api/auth/login`, { username, password });
logStage("login", "Login response", {
  status: login.res.status,
  ok: login.res.ok,
  body: login.json
    ? {
        success: login.json.success,
        user: login.json.user,
        access_token_masked: maskSecret(login.json.access_token ?? ""),
      }
    : login.text,
});

if (!login.res.ok || !login.json?.access_token) {
  process.exit(6);
}

logStage("result", "FunctionSpace credentials created successfully", {
  username,
  password,
  tokenMasked: maskSecret(login.json.access_token),
  user: login.json.user,
});
