export type VaultMode = "live-vault" | "preview-only";

export type Orientation =
  | "higher_is_bullish"
  | "lower_is_bullish"
  | "higher_is_stress"
  | "lower_is_stress";

export type IndexConstituent = {
  id: string;
  marketId: number;
  label: string;
  weight: number;
  orientation: Orientation;
  role: "capital" | "capability" | "deployment" | "liquidity" | "macro" | "adoption";
};

export type ForecastIndex = {
  id: string;
  name: string;
  mode: VaultMode;
  vaultAddress?: `0x${string}`;
  shareAddress?: `0x${string}`;
  assetAddress?: `0x${string}`;
  fsVaultUsername?: string;
  constituents: IndexConstituent[];
};

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
