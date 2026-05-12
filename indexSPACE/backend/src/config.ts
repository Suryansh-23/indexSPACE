import { FORECAST_INDICES, LIVE_VAULT_IDS, PREVIEW_INDEX_IDS, BASE_SEPOLIA_CHAIN_ID } from "@indexspace/shared";

export interface AppConfig {
  port: number;
  host: string;
  fsUsername: string | undefined;
  fsPassword: string | undefined;
  fsApiUrl: string;
  rpcUrl: string;
  mockVault: boolean;
  chainId: number;
  pollIntervalMs: number;
  confirmations: number;
  reorgBuffer: number;
}

export function loadConfig(): AppConfig {
  return {
    port: parseInt(process.env.PORT || "8787", 10),
    host: process.env.HOST || "0.0.0.0",
    fsUsername: process.env.FS_USERNAME,
    fsPassword: process.env.FS_PASSWORD,
    fsApiUrl: process.env.FS_API_URL || "https://fs-engine-api-dev.onrender.com",
    rpcUrl: process.env.RPC_URL || "http://localhost:8545",
    mockVault: process.env.MOCK_VAULT !== "false",
    chainId: BASE_SEPOLIA_CHAIN_ID,
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || "10000", 10),
    confirmations: parseInt(process.env.CONFIRMATIONS || "3", 10),
    reorgBuffer: parseInt(process.env.REORG_BUFFER || "20", 10),
  };
}

export const INDICES = FORECAST_INDICES;
export const LIVE_VAULTS = LIVE_VAULT_IDS;
export const PREVIEW_INDICES = PREVIEW_INDEX_IDS;
