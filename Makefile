# ==============================================================================
# TraceForge Makefile
# Portable development, testing, build, and verification workflow.
# ==============================================================================

PYTHON ?= python3
PIP ?= $(PYTHON) -m pip
NPM ?= npm
HOST ?= 127.0.0.1
PORT ?= 8000

.DEFAULT_GOAL := help

.PHONY: help install backend frontend dev test test-backend test-frontend build check clean

# ------------------------------------------------------------------------------
# Help
# ------------------------------------------------------------------------------
help:
	@echo "TraceForge Development & Build Commands:"
	@echo "  make help           Show all available commands with short descriptions"
	@echo "  make install        Install backend Python dependencies and frontend npm dependencies"
	@echo "  make backend        Start the FastAPI backend on port $(PORT)"
	@echo "  make frontend       Start the Vite frontend dev server"
	@echo "  make dev            Start both backend and frontend development servers"
	@echo "  make test           Run the complete available test suite"
	@echo "  make test-backend   Run backend pytest tests"
	@echo "  make test-frontend  Run frontend tests if a test script exists"
	@echo "  make build          Build the frontend using the existing npm build script"
	@echo "  make check          Run project verification checks (syntax, tests, build)"
	@echo "  make clean          Safely remove generated build and cache files"

# ------------------------------------------------------------------------------
# Installation
# ------------------------------------------------------------------------------
install:
	@echo "==> Installing backend dependencies..."
	@if [ -f backend/requirements.txt ]; then \
		$(PIP) install -r backend/requirements.txt; \
	else \
		echo "No backend/requirements.txt found, skipping python pip install."; \
	fi
	@echo "==> Installing frontend dependencies..."
	@if [ -f frontend/package.json ]; then \
		cd frontend && $(NPM) install; \
	fi

# ------------------------------------------------------------------------------
# Development Servers
# ------------------------------------------------------------------------------
backend:
	cd backend && $(PYTHON) -m uvicorn app.main:app --host $(HOST) --port $(PORT) --reload

frontend:
	cd frontend && $(NPM) run dev

dev:
	@echo "Starting TraceForge development servers (FastAPI backend + Vite frontend)..."
	@trap 'kill 0' EXIT INT TERM; \
	(cd backend && $(PYTHON) -m uvicorn app.main:app --host $(HOST) --port $(PORT) --reload) & \
	(cd frontend && $(NPM) run dev) & \
	wait

# ------------------------------------------------------------------------------
# Testing
# ------------------------------------------------------------------------------
test: test-backend test-frontend

test-backend:
	cd backend && $(PYTHON) -m pytest -q

test-frontend:
	@if [ -f frontend/package.json ] && $(PYTHON) -c 'import json, sys; sys.exit(0 if json.load(open("frontend/package.json")).get("scripts", {}).get("test") else 1)' 2>/dev/null; then \
		echo "Running frontend tests..."; \
		cd frontend && $(NPM) test; \
	else \
		echo "No frontend test suite configured in frontend/package.json."; \
	fi

# ------------------------------------------------------------------------------
# Build & Verification
# ------------------------------------------------------------------------------
build:
	cd frontend && $(NPM) run build

check:
	@echo "==> [1/3] Running Python syntax and compilation checks..."
	$(PYTHON) -m compileall -q backend/
	@echo "==> [2/3] Running backend tests..."
	cd backend && $(PYTHON) -m pytest -q
	@echo "==> [3/3] Building frontend..."
	cd frontend && $(NPM) run build
	@echo "==> All project verification checks passed!"

# ------------------------------------------------------------------------------
# Clean
# ------------------------------------------------------------------------------
clean:
	@echo "Safely removing generated build and cache files..."
	rm -rf frontend/dist
	rm -rf backend/.pytest_cache .pytest_cache
	find backend -depth -type d -name "__pycache__" -not -path "*/.venv/*" -exec rm -rf {} + 2>/dev/null || true
	find backend -type f \( -name "*.pyc" -o -name "*.pyo" \) -not -path "*/.venv/*" -delete 2>/dev/null || true
	@echo "Clean completed safely."
