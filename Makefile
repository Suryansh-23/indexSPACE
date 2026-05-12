.PHONY: dev backend ui screenshots build clean

# Default target: start both backend and UI dev servers
dev:
	@echo "Starting IndexSpace backend (:8787) and UI (:3000)..."
	@echo "Press Ctrl+C to stop both."
	@trap 'echo ""; echo "Shutting down..."; kill %1 %2 2>/dev/null; exit 0' INT TERM; \
	cd indexSPACE/backend && bun run dev & \
	cd indexSPACE/ui && bun run dev & \
	wait

# Start only the backend API
backend:
	@echo "Starting IndexSpace backend on :8787..."
	@cd indexSPACE/backend && bun run dev

# Start only the Next.js UI
ui:
	@echo "Starting IndexSpace UI on :3000..."
	@cd indexSPACE/ui && bun run dev

# Run desktop screenshot automation (starts UI briefly)
screenshots:
	@echo "Starting UI for screenshot capture..."
	@cd indexSPACE/ui && bun run dev & \
	UI_PID=$$!; \
	sleep 4; \
	node indexSPACE/scripts/screenshots-desktop.mjs; \
	kill $$UI_PID 2>/dev/null; \
	echo "Screenshots saved to screenshots/"

# Production build the UI
build:
	@echo "Building IndexSpace UI..."
	@cd indexSPACE/ui && bun run build

# Type-check the UI
typecheck:
	@echo "Type-checking IndexSpace UI..."
	@cd indexSPACE/ui && npx tsc --noEmit
