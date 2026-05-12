.PHONY: dev dev-real backend backend-real ui stop screenshots build typecheck

# ═══════════════════════════════════════════════════════════════════════════════
#  Development startup
# ═══════════════════════════════════════════════════════════════════════════════

# Default: start backend in MOCK mode + UI (safe — no chain needed)
dev:
	@echo "Starting IndexSpace in MOCK mode..."
	@echo "  Backend : http://localhost:8787"
	@echo "  UI      : http://localhost:3000"
	@echo "Press Ctrl+C to stop both."
	@trap 'echo ""; echo "Shutting down..."; kill %1 %2 2>/dev/null; wait 2>/dev/null; exit 0' INT TERM; \
	cd indexSPACE/backend && MOCK_VAULT=true bun run dev & \
	cd indexSPACE/ui && bun run dev & \
	wait

# Real mode: start backend with existing .env + UI (requires Base Sepolia RPC)
dev-real:
	@echo "Starting IndexSpace in REAL mode (Base Sepolia)..."
	@echo "  Backend : http://localhost:8787"
	@echo "  UI      : http://localhost:3000"
	@echo "  WARNING : Requires Base Sepolia RPC and valid CURATOR_PRIVATE_KEY"
	@echo "Press Ctrl+C to stop both."
	@trap 'echo ""; echo "Shutting down..."; kill %1 %2 2>/dev/null; wait 2>/dev/null; exit 0' INT TERM; \
	cd indexSPACE/backend && bun run dev & \
	cd indexSPACE/ui && bun run dev & \
	wait

# ═══════════════════════════════════════════════════════════════════════════════
#  Individual services
# ═══════════════════════════════════════════════════════════════════════════════

# Backend only — MOCK mode (safe, no chain needed)
backend:
	@echo "Starting backend (MOCK mode) on :8787..."
	@cd indexSPACE/backend && MOCK_VAULT=true bun run dev

# Backend only — REAL mode (uses .env, connects to Base Sepolia)
backend-real:
	@echo "Starting backend (REAL mode / Base Sepolia) on :8787..."
	@cd indexSPACE/backend && bun run dev

# UI only
ui:
	@echo "Starting UI on :3000..."
	@cd indexSPACE/ui && bun run dev

# ═══════════════════════════════════════════════════════════════════════════════
#  Kill running dev servers
# ═══════════════════════════════════════════════════════════════════════════════

stop:
	@echo "Killing IndexSpace dev servers..."
	@node scripts/stop-dev.mjs

# ═══════════════════════════════════════════════════════════════════════════════
#  Build / test / utilities
# ═══════════════════════════════════════════════════════════════════════════════

# Production build the UI
build:
	@echo "Building IndexSpace UI..."
	@cd indexSPACE/ui && bun run build

# Type-check the UI
typecheck:
	@echo "Type-checking IndexSpace UI..."
	@cd indexSPACE/ui && npx tsc --noEmit

# Run desktop screenshot automation (starts UI briefly)
screenshots:
	@echo "Starting UI for screenshot capture..."
	@cd indexSPACE/ui && bun run dev & \
	UI_PID=$$!; \
	sleep 4; \
	node indexSPACE/scripts/screenshots-desktop.mjs; \
	kill $$UI_PID 2>/dev/null; \
	echo "Screenshots saved to screenshots/"
