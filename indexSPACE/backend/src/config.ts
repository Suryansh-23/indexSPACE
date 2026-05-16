import { FORECAST_INDICES, LIVE_VAULT_IDS, PREVIEW_INDEX_IDS, BASE_SEPOLIA_CHAIN_ID, ANVIL_AI_VAULT, ANVIL_CRYPTO_VAULT, ANVIL_CHAIN_ID, BASE_SEPOLIA_AI_VAULT, BASE_SEPOLIA_CRYPTO_VAULT } from "@indexspace/shared";

export interface AppConfig {
  port: number;
  host: string;
  fsUsername: string | undefined;
  fsAccessToken: string | undefined;
  curatorPrivateKey: string | undefined;
  fsApiUrl: string;
  rpcUrl: string;
  mockVault: boolean;
  chainId: number;
  pollIntervalMs: number;
  confirmations: number;
  reorgBuffer: number;
  runLogEnabled: boolean;
  runLogPath: string;
  fsTraceEnabled: boolean;
}

export function loadConfig(): AppConfig {
  return {
    port: parseInt(process.env.PORT || "8787", 10),
    host: process.env.HOST || "0.0.0.0",
    fsUsername: process.env.FS_USERNAME,
    fsAccessToken: process.env.FS_ACCESS_TOKEN,
    curatorPrivateKey: process.env.CURATOR_PRIVATE_KEY,
    fsApiUrl: process.env.FS_API_URL || "https://fs-engine-api-dev.onrender.com",
    rpcUrl: process.env.RPC_URL || "http://localhost:8545",
    mockVault: process.env.MOCK_VAULT !== "false",
    chainId: process.env.MOCK_VAULT === "false" ? BASE_SEPOLIA_CHAIN_ID : ANVIL_CHAIN_ID,
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || "10000", 10),
    confirmations: parseInt(process.env.CONFIRMATIONS || "3", 10),
    reorgBuffer: parseInt(process.env.REORG_BUFFER || "20", 10),
    runLogEnabled: process.env.RUN_LOG_ENABLED === "true",
    runLogPath: process.env.RUN_LOG_PATH || "run.log",
    fsTraceEnabled: process.env.FS_TRACE_ENABLED === "true",
  };
}

export const INDICES = FORECAST_INDICES;
export const LIVE_VAULTS = LIVE_VAULT_IDS;
export const PREVIEW_INDICES = PREVIEW_INDEX_IDS;
export { ANVIL_AI_VAULT, ANVIL_CRYPTO_VAULT, BASE_SEPOLIA_AI_VAULT, BASE_SEPOLIA_CRYPTO_VAULT };
