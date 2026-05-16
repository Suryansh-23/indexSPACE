import { createPublicClient, http, parseAbiItem, type Address } from "viem";
import { anvil, baseSepolia } from "viem/chains";
import type { Database } from "bun:sqlite";
import type { AppConfig } from "./config.ts";
import { ANVIL_CHAIN_ID } from "@indexspace/shared";
import { logError, logRuntime } from "./logger.ts";


const VAULT_ABI = [
  "event DepositRequest(uint256 indexed internalRequestId, address indexed controller, address indexed owner, uint256 assets)",
  "event RedeemRequest(uint256 indexed internalRequestId, address indexed controller, address indexed owner, uint256 shares)",
  "event DepositClaimed(uint256 indexed internalRequestId, address indexed controller, address indexed receiver, uint256 shares)",
  "event RedeemClaimed(uint256 indexed internalRequestId, address indexed controller, address indexed receiver, uint256 assets)",
] as const;

export interface IndexerEvent {
  eventType: "request" | "claim";
  vaultId: string;
  vaultAddress: Address;
  internalRequestId: number;
  controller: Address;
  owner: Address;
  kind: "subscribe" | "redeem";
  assetAmount: string;
  shareAmount: string;
  txHash: string;
  logIndex: number;
  blockNumber: number;
}

const LOG_CHUNK = 1999n;
const INITIAL_LOOKBACK_BLOCKS = 5000n;

async function getLogsChunked(
  client: ReturnType<typeof createPublicClient>,
  opts: Parameters<ReturnType<typeof createPublicClient>["getLogs"]>[0],
  from: bigint,
  to: bigint,
): Promise<Awaited<ReturnType<ReturnType<typeof createPublicClient>["getLogs"]>>> {
  const logs: Awaited<ReturnType<ReturnType<typeof createPublicClient>["getLogs"]>> = [];
  let cur = from;
  while (cur <= to) {
    const end = cur + LOG_CHUNK <= to ? cur + LOG_CHUNK : to;
    const chunk = await client.getLogs({ ...opts, fromBlock: cur, toBlock: end });
    logs.push(...chunk);
    cur = end + 1n;
  }
  return logs;
}

export class RealIndexer {
  private client: ReturnType<typeof createPublicClient>;
  private db: Database;
  private config: AppConfig;
  private vaultAddresses: Map<string, Address>;

  constructor(db: Database, config: AppConfig, vaultAddresses: Record<string, Address>) {
    const chain = config.chainId === ANVIL_CHAIN_ID ? anvil : baseSepolia;
    this.client = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    });
    this.db = db;
    this.config = config;
    this.vaultAddresses = new Map(Object.entries(vaultAddresses));
  }

  async tick(): Promise<IndexerEvent[]> {
    const events: IndexerEvent[] = [];

    for (const [vaultId, contractAddress] of this.vaultAddresses) {
      const latestBlock = await this.client.getBlockNumber();
      const toBlock = latestBlock - BigInt(this.config.confirmations);

      const checkpoint = this.db.query(
        "SELECT last_indexed_block FROM indexer_checkpoints WHERE chain_id = ? AND contract_address = ?",
      ).get(this.config.chainId, contractAddress) as { last_indexed_block: number } | undefined;

      const bootstrapFrom = toBlock > INITIAL_LOOKBACK_BLOCKS
        ? Number(toBlock - INITIAL_LOOKBACK_BLOCKS)
        : 0;
      const fromBlock = checkpoint ? checkpoint.last_indexed_block + 1 : bootstrapFrom;

      if (fromBlock > Number(toBlock)) continue;

      const safeFrom = Math.max(fromBlock - this.config.reorgBuffer, 0);

      try {
        logRuntime("indexer.tick", "Scanning vault logs", {
          vaultId,
          contractAddress,
          fromBlock: safeFrom,
          toBlock: Number(toBlock),
        });
        const depositLogs = await getLogsChunked(
          this.client,
          { address: contractAddress, event: parseAbiItem(VAULT_ABI[0]) },
          BigInt(safeFrom),
          toBlock,
        );

        const redeemLogs = await getLogsChunked(
          this.client,
          { address: contractAddress, event: parseAbiItem(VAULT_ABI[1]) },
          BigInt(safeFrom),
          toBlock,
        );

        const depositClaimLogs = await getLogsChunked(
          this.client,
          { address: contractAddress, event: parseAbiItem(VAULT_ABI[2]) },
          BigInt(safeFrom),
          toBlock,
        );

        const redeemClaimLogs = await getLogsChunked(
          this.client,
          { address: contractAddress, event: parseAbiItem(VAULT_ABI[3]) },
          BigInt(safeFrom),
          toBlock,
        );

        for (const log of depositLogs) {
          events.push(this.toRequestEvent(vaultId, contractAddress, "subscribe", log));
        }

        for (const log of redeemLogs) {
          events.push(this.toRequestEvent(vaultId, contractAddress, "redeem", log));
        }

        for (const log of depositClaimLogs) {
          events.push(this.toClaimEvent(vaultId, contractAddress, "subscribe", log));
        }

        for (const log of redeemClaimLogs) {
          events.push(this.toClaimEvent(vaultId, contractAddress, "redeem", log));
        }

        this.db.run(
          "INSERT OR REPLACE INTO indexer_checkpoints (chain_id, contract_address, last_indexed_block, updated_at) VALUES (?, ?, ?, datetime('now'))",
          [this.config.chainId, contractAddress, Number(toBlock)],
        );
        logRuntime("indexer.tick", "Completed vault log scan", {
          vaultId,
          contractAddress,
          toBlock: Number(toBlock),
          foundRequests: depositLogs.length + redeemLogs.length,
          foundClaims: depositClaimLogs.length + redeemClaimLogs.length,
        });
      } catch (err) {
        logError("indexer.tick", `Indexer error for ${vaultId}`, err, { vaultId, contractAddress });
      }
    }

    return events;
  }

  private toRequestEvent(vaultId: string, contractAddress: Address, kind: "subscribe" | "redeem", log: any): IndexerEvent {
    const args = log.args ?? {};
    return {
      eventType: "request",
      vaultId,
      vaultAddress: contractAddress,
      internalRequestId: Number(args.internalRequestId ?? 0),
      controller: args.controller as Address,
      owner: args.owner as Address,
      kind,
      assetAmount: kind === "subscribe" ? String(args.assets ?? "0") : "0",
      shareAmount: kind === "redeem" ? String(args.shares ?? "0") : "0",
      txHash: log.transactionHash ?? "0x0",
      logIndex: log.logIndex ?? 0,
      blockNumber: Number(log.blockNumber ?? 0),
    };
  }

  private toClaimEvent(vaultId: string, contractAddress: Address, kind: "subscribe" | "redeem", log: any): IndexerEvent {
    const args = log.args ?? {};
    return {
      eventType: "claim",
      vaultId,
      vaultAddress: contractAddress,
      internalRequestId: Number(args.internalRequestId ?? 0),
      controller: args.controller as Address,
      owner: args.receiver as Address,
      kind,
      assetAmount: kind === "redeem" ? String(args.assets ?? "0") : "0",
      shareAmount: kind === "subscribe" ? String(args.shares ?? "0") : "0",
      txHash: log.transactionHash ?? "0x0",
      logIndex: log.logIndex ?? 0,
      blockNumber: Number(log.blockNumber ?? 0),
    };
  }

  persistEvents(events: IndexerEvent[]): number {
    let count = 0;
    for (const ev of events) {
      if (ev.eventType === "claim") {
        const result = this.db.run(
          `UPDATE requests
             SET status = 'claimed', updated_at = datetime('now')
           WHERE chain_id = ? AND vault_address = ? AND internal_request_id = ? AND controller = ? AND kind = ? AND status != 'claimed'`,
          [this.config.chainId, ev.vaultAddress, ev.internalRequestId, ev.controller, ev.kind],
        );
        count += result.changes;
        if (result.changes > 0) {
          logRuntime("indexer.persist", "Marked request as claimed", {
            vaultId: ev.vaultId,
            controller: ev.controller,
            internalRequestId: ev.internalRequestId,
            kind: ev.kind,
            txHash: ev.txHash,
          });
        }
        continue;
      }

      const exists = this.db.query(
        "SELECT COUNT(*) AS cnt FROM requests WHERE chain_id = ? AND vault_address = ? AND tx_hash = ? AND log_index = ?",
      ).get(this.config.chainId, ev.vaultAddress, ev.txHash, ev.logIndex) as { cnt: number };

      if (exists.cnt === 0) {
        this.db.run(
          `INSERT INTO requests (chain_id, vault_id, vault_address, internal_request_id, controller, owner, kind, status, asset_amount, share_amount, tx_hash, log_index, block_number, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [this.config.chainId, ev.vaultId, ev.vaultAddress, ev.internalRequestId, ev.controller, ev.owner, ev.kind, ev.assetAmount, ev.shareAmount, ev.txHash, ev.logIndex, ev.blockNumber],
        );
        count++;
        logRuntime("indexer.persist", "Inserted request event", {
          vaultId: ev.vaultId,
          controller: ev.controller,
          internalRequestId: ev.internalRequestId,
          kind: ev.kind,
          txHash: ev.txHash,
          logIndex: ev.logIndex,
        });
      }
    }
    return count;
  }
}
