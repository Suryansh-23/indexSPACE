import { BASE_SEPOLIA_USDC } from "./chains";
import type { ForecastIndex, IndexConstituent, Orientation, ConstituentRole } from "./types";

function constituent(
  marketId: number,
  label: string,
  weight: number,
  orientation: Orientation,
  role: ConstituentRole,
): IndexConstituent {
  return { id: `market-${marketId}`, marketId, label, weight, orientation, role };
}

const AI_ACCELERATION_CONSTITUENTS = [
  constituent(215, "OpenAI Valuation at Last Funding Round in 2026", 18, "higher_is_bullish", "capital"),
  constituent(205, "OpenAI Annualized Revenue (ARR) in Dec 2026", 14, "higher_is_bullish", "capital"),
  constituent(204, "Highest SWE-bench (Resolved) Score by an AI Model (Dec 2026)", 14, "higher_is_bullish", "capability"),
  constituent(208, "Highest Chatbot Arena Elo Rating (Dec 2026)", 10, "higher_is_bullish", "capability"),
  constituent(206, "Highest ARC-AGI Public Leaderboard Score (Dec 2026)", 10, "higher_is_bullish", "capability"),
  constituent(217, "Highest GPQA Diamond Accuracy Score by an AI Model (Dec 2026)", 10, "higher_is_bullish", "capability"),
  constituent(212, "Tesla Optimus Units Sold or Deployed Internally by Dec 2026", 10, "higher_is_bullish", "deployment"),
  constituent(210, "Total Number of Figure AI Robots in Commercial Deployment (Dec 2026)", 8, "higher_is_bullish", "deployment"),
  constituent(211, "Waymo Annual Run Rate Revenue (Dec 2026)", 6, "higher_is_bullish", "deployment"),
] as const satisfies IndexConstituent[];

const CRYPTO_REFLEXIVITY_CONSTITUENTS = [
  constituent(159, "Solana (SOL) Price in USD on Dec 31, 2026", 15, "higher_is_bullish", "liquidity"),
  constituent(168, "Dogecoin (DOGE) Price in USD on Dec 31, 2026", 10, "higher_is_bullish", "liquidity"),
  constituent(160, "Total Stablecoin Market Capitalization Dec 31, 2026", 15, "higher_is_bullish", "liquidity"),
  constituent(167, "MakerDAO DAI Supply on Dec 31, 2026", 10, "higher_is_bullish", "liquidity"),
  constituent(166, "Uniswap V3 Annual Trading Volume 2026", 15, "higher_is_bullish", "liquidity"),
  constituent(163, "Lido (LDO) Total ETH Staked Dec 31, 2026", 10, "higher_is_bullish", "adoption"),
  constituent(161, "Ethereum Average Daily Gas Price (Gwei) in Dec 2026", 10, "higher_is_stress", "liquidity"),
  constituent(238, "Aave Ethereum WETH Reserve Utilization (Month-End May 2026)", 8, "higher_is_stress", "liquidity"),
  constituent(237, "Aave Ethereum USDC 30-Day Average Supply APY (May 8 - June 6 2026)", 7, "higher_is_stress", "liquidity"),
] as const satisfies IndexConstituent[];

const MACRO_STRESS_CONSTITUENTS = [
  constituent(144, "US U-6 Unemployment Rate (Nov 2026)", 20, "higher_is_stress", "macro"),
  constituent(148, "US 10-Year Treasury Yield on Dec 31, 2026", 15, "higher_is_stress", "macro"),
  constituent(151, "VIX (CBOE Volatility Index) Close on Dec 31, 2026", 15, "higher_is_stress", "macro"),
  constituent(175, "Brent Crude Oil Price (USD/bbl) on Dec 31, 2026", 10, "higher_is_stress", "macro"),
  constituent(174, "WTI Crude Oil Price (USD/bbl) on Dec 31, 2026", 10, "higher_is_stress", "macro"),
  constituent(185, "US Average Retail Regular Gasoline Price (Nov 2026)", 10, "higher_is_stress", "macro"),
  constituent(179, "Chicago Wheat Futures Price (USd/bu) Dec 2026", 10, "higher_is_stress", "macro"),
  constituent(79, "Arctic Sea Ice Minimum Extent in September 2026", 10, "lower_is_stress", "macro"),
] as const satisfies IndexConstituent[];

const CREATOR_MOMENTUM_CONSTITUENTS = [
  constituent(219, "MrBeast Total YouTube Subscribers on Dec 31, 2026", 15, "higher_is_bullish", "adoption"),
  constituent(224, "Substack Total Annual Recurring Revenue (ARR) 2026", 14, "higher_is_bullish", "adoption"),
  constituent(230, "Patreon Total Creator Earnings in 2026", 13, "higher_is_bullish", "adoption"),
  constituent(223, "OnlyFans Total Gross Revenue in 2026", 10, "higher_is_bullish", "capital"),
  constituent(222, "Twitch Peak Concurrent Viewers in 2026", 10, "higher_is_bullish", "adoption"),
  constituent(225, "Kai Cenat Peak Concurrent Twitch Viewers in 2026", 8, "higher_is_bullish", "adoption"),
  constituent(231, "Kick.com Peak Concurrent Viewers in 2026", 8, "higher_is_bullish", "adoption"),
  constituent(228, "Total Payout to Creators via X Ads Revenue Sharing in 2026", 10, "higher_is_bullish", "capital"),
  constituent(227, "Instagram Reels Average Daily Views (Dec 2026)", 8, "higher_is_bullish", "adoption"),
  constituent(233, "Total Subscribers for Highest Subscribed Independent Podcaster", 4, "higher_is_bullish", "adoption"),
] as const satisfies IndexConstituent[];

export const FORECAST_INDICES: ForecastIndex[] = [
  {
    id: "ai-acceleration",
    name: "AI Acceleration",
    mode: "live-vault",
    assetAddress: BASE_SEPOLIA_USDC,
    constituents: [...AI_ACCELERATION_CONSTITUENTS],
  },
  {
    id: "crypto-reflexivity",
    name: "Crypto Reflexivity",
    mode: "live-vault",
    assetAddress: BASE_SEPOLIA_USDC,
    constituents: [...CRYPTO_REFLEXIVITY_CONSTITUENTS],
  },
  {
    id: "macro-stress",
    name: "Macro Stress",
    mode: "preview-only",
    assetAddress: BASE_SEPOLIA_USDC,
    constituents: [...MACRO_STRESS_CONSTITUENTS],
  },
  {
    id: "creator-momentum",
    name: "Creator Momentum",
    mode: "preview-only",
    assetAddress: BASE_SEPOLIA_USDC,
    constituents: [...CREATOR_MOMENTUM_CONSTITUENTS],
  },
] as const;

export const LIVE_VAULT_IDS = ["ai-acceleration", "crypto-reflexivity"] as const;
export const PREVIEW_INDEX_IDS = ["macro-stress", "creator-momentum"] as const;
