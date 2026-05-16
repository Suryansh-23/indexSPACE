import { createPublicClient, http, parseAbiItem, type Address } from "viem";
import { anvil, baseSepolia } from "viem/chains";
import type { Database } from "bun:sqlite";
import type { AppConfig } from "./config.ts";
import { ANVIL_CHAIN_ID } from "@indexspace/shared";


const VAULT_ABI = [
  "event DepositRequest(uint256 indexed internalRequestId, address indexed controller, address indexed owner, uint256 assets)",
  "event RedeemRequest(uint256 indexed internalRequestId, address indexed controller, address indexed owner, uint256 shares)",
] as const;

export interface IndexerEvent {
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
      const checkpoint = this.db.query(
        "SELECT last_indexed_block FROM indexer_checkpoints WHERE chain_id = ? AND contract_address = ?",
      ).get(this.config.chainId, contractAddress) as { last_indexed_block: number } | undefined;

      const fromBlock = (checkpoint?.last_indexed_block ?? 0) + 1;
      const latestBlock = await this.client.getBlockNumber();
      const toBlock = latestBlock - BigInt(this.config.confirmations);

      if (fromBlock > Number(toBlock)) continue;

      const safeFrom = Math.max(fromBlock - this.config.reorgBuffer, 0);

      try {
        const depositLogs = await this.client.getLogs({
          address: contractAddress,
          event: parseAbiItem(VAULT_ABI[0]),
          fromBlock: BigInt(safeFrom),
          toBlock: toBlock,
        });

        const redeemLogs = await this.client.getLogs({
          address: contractAddress,
          event: parseAbiItem(VAULT_ABI[1]),
          fromBlock: BigInt(safeFrom),
          toBlock: toBlock,
        });

        for (const log of depositLogs) {
          events.push(this.toEvent(vaultId, contractAddress, "subscribe", log));
        }

        for (const log of redeemLogs) {
          events.push(this.toEvent(vaultId, contractAddress, "redeem", log));
        }

        this.db.run(
          "INSERT OR REPLACE INTO indexer_checkpoints (chain_id, contract_address, last_indexed_block, updated_at) VALUES (?, ?, ?, datetime('now'))",
          [this.config.chainId, contractAddress, Number(toBlock)],
        );
      } catch (err) {
        console.error(`Indexer error for ${vaultId}:`, err);
      }
    }

    return events;
  }

  private toEvent(vaultId: string, contractAddress: Address, kind: "subscribe" | "redeem", log: any): IndexerEvent {
    const args = log.args ?? {};
    return {
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

  persistEvents(events: IndexerEvent[]): number {
    let count = 0;
    for (const ev of events) {
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
      }
    }
    return count;
  }
}
