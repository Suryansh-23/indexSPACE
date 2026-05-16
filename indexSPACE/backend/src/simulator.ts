import { LIVE_VAULT_IDS } from "@indexspace/shared";
import type { MockVault } from "./mock-vault.ts";

export class Simulator {
  private mockVault: MockVault;
  private enabled = true;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(mockVault: MockVault) {
    this.mockVault = mockVault;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  start(intervalMs = 15000): void {
    this.intervalId = setInterval(() => {
      if (this.enabled) this.generateActivity();
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  generateActivity(): number {
    if (!this.enabled) return 0;

    const demoWallets = [
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222",
      "0x3333333333333333333333333333333333333333",
    ];

    const vaultId = LIVE_VAULT_IDS[Math.floor(Math.random() * LIVE_VAULT_IDS.length)] ?? LIVE_VAULT_IDS[0]!;
    let generated = 0;

    if (Math.random() < 0.6) {
      const wallet = demoWallets[Math.floor(Math.random() * demoWallets.length)]!;
      const amount = (Math.floor(Math.random() * 900) + 100).toString();
      this.mockVault.simulateDepositRequest(vaultId, wallet, wallet, amount);
      generated++;
    }

    if (Math.random() < 0.2) {
      const wallet = demoWallets[Math.floor(Math.random() * demoWallets.length)]!;
      const shares = (Math.floor(Math.random() * 90) + 10).toString();
      this.mockVault.simulateRedeemRequest(vaultId, wallet, wallet, shares);
      generated++;
    }

    return generated;
  }
}
