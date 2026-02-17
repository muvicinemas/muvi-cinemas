# Muvi Cinemas - Local Development

> **Cross-Platform:** Works on Windows, macOS, and Linux.  
> **macOS/Linux users:** Install PowerShell Core 7+ first: `brew install powershell` (Mac) or [see install guide](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell). Then run with `pwsh ./muvi-up.ps1`

## New Developer? Start Here (3 Steps)

```powershell
# Step 1: Open terminal in this folder, run the bootstrap
.\muvi-up.ps1

# Step 2: Wait ~10-15 minutes for full setup

# Step 3: Start debugging!
# Press Ctrl+Shift+D → Select "Attach: All Services" → Press F5
# Set breakpoints anywhere — they work across all microservices!
```

That's it. Everything is ready — backend, frontend, databases, debugger.

---

## Prerequisites

- **Docker Desktop** — install from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) and make sure it's running
- **PowerShell** 5.1+ (already included on Windows) or PowerShell Core 7+ ([install guide](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell) for macOS/Linux)
- **Node.js** 18+ — install from [nodejs.org](https://nodejs.org/)
- **Git** — install from [git-scm.com](https://git-scm.com/) with access to [muvicinemas](https://github.com/muvicinemas) repos

## Quick Start

1. Open a terminal in this folder (right-click in Explorer → "Open in Terminal", or open VS Code and use its built-in terminal)
2. Run:

```powershell
.\muvi-up.ps1
```

> **First time?** If you get an error about execution policy, run this once first:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

This single command runs a full **12-phase bootstrap**:

| Phase | What it does |
|-------|--------------|
| 1 | Clone all microservice repos (backend + frontend) |
| 2 | Destroy old Muvi containers & volumes |
| 3 | Start infrastructure (Postgres, Redis, Verdaccio) |
| 4 | Restore @alpha.apps packages to Verdaccio |
| 5 | Apply local dev patches |
| 6 | Build Docker images |
| 7 | Start backend services |
| 8 | Health-check backend |
| 9 | Seed databases |
| 10 | Start frontend (Website + CMS) |
| 11 | Verify frontend |
| 12 | **Setup IDE debugging (node_modules + source maps)** |

Once complete, the stack is running at:

| Service | URL |
|---------|-----|
| **Developer Portal** | http://localhost:4000 |
| **Website** | http://localhost:3002 |
| **CMS** | http://localhost:5173 |
| **Gateway API** | http://localhost:3000/api/v1 |
| **PgAdmin** | http://localhost:5051 |
| **Verdaccio** | http://localhost:4873 |

## Debugging (Ready Out of the Box!)

After bootstrap completes, breakpoints work immediately:

1. **Ctrl+Shift+D** (Run and Debug panel)
2. Select **"Attach: All Services"** from dropdown
3. Press **F5**
4. Set breakpoints in any file — they work across gRPC boundaries!

Debug ports:
| Service | Port |
|---------|------|
| Gateway | 9229 |
| Identity | 9230 |
| Main | 9231 |
| Payment | 9232 |
| FB | 9233 |
| Notification | 9234 |

## Day-to-Day Commands

```powershell
.\muvi-up.ps1 up                  # Start all services
.\muvi-up.ps1 down                # Stop everything
.\muvi-up.ps1 restart             # Restart all services
.\muvi-up.ps1 status              # Show container status
.\muvi-up.ps1 logs                # Tail all logs
.\muvi-up.ps1 seed                # Re-seed databases
.\muvi-up.ps1 publish             # Rebuild & publish shared packages
.\muvi-up.ps1 patch               # Apply local dev patches
.\muvi-up.ps1 frontend            # Start only frontend services
.\muvi-up.ps1 ide                 # Re-sync debugging files (after rebuild)
```

### Target a specific service

```powershell
.\muvi-up.ps1 restart -BuildOnly gateway-service
.\muvi-up.ps1 logs -BuildOnly identity-service
```

### Bootstrap options

```powershell
.\muvi-up.ps1 -SkipDestroy        # Keep existing volumes
.\muvi-up.ps1 -SkipBuild          # Skip Docker image rebuild
.\muvi-up.ps1 -SkipClone          # Skip cloning repos (already cloned)
.\muvi-up.ps1 -SkipFrontend       # Skip frontend setup
```

### Patch management

```powershell
.\muvi-up.ps1 patch                        # Apply patches
.\muvi-up.ps1 patch -BuildOnly revert      # Revert patches
.\muvi-up.ps1 patch -BuildOnly status      # Show patch status
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                       │
│  Website (Next.js :3002)    CMS (Vite :5173)                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Gateway (NestJS :3000)                           │
│                              HTTP REST API                               │
└─────────────────────────────────────────────────────────────────────────┘
          │           │           │           │           │
          ▼           ▼           ▼           ▼           ▼
     ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
     │Identity│  │  Main  │  │Payment │  │   FB   │  │ Notif  │
     │ :5001  │  │ :5002  │  │ :5003  │  │ :5004  │  │ :5005  │
     └────┬───┘  └────┬───┘  └────┬───┘  └────┬───┘  └────┬───┘
          │           │           │           │           │
          ▼           ▼           ▼           ▼           ▼
     ┌────────────────────────────────────────────────────────┐
     │              PostgreSQL (Frankfurt RDS)                 │
     │       identity_db │ main_db │ payment_db │ fb_db       │
     └────────────────────────────────────────────────────────┘
```

All services run as Docker containers (13 containers total).

## API Documentation

Open the **Developer Portal** at http://localhost:4000 after bootstrap for:
- API Documentation (481 endpoints)
- API Storybook (interactive examples)
- Docker container management
- Quick links to all services

Or open files directly:
- `documentation/api.html` — Full API reference
- `documentation/api-storybook.html` — Interactive API examples

Regenerate docs:
```bash
cd documentation && node generate-api-docs.js
```

## Project Structure

```
muvi-cinemas/
├── muvi-up.ps1                    # All-in-one CLI (the only script you need)
├── docker-compose.yml             # Full Docker stack (13 services)
├── main-backend-microservices/    # All backend services (cloned by muvi-up)
│   ├── alpha-muvi-gateway-main/   # HTTP Gateway (REST API)
│   ├── alpha-muvi-identity-main/  # Auth & users (gRPC)
│   ├── alpha-muvi-main-main/      # Core business logic (gRPC)
│   ├── alpha-muvi-payment-main/   # Payments (gRPC)
│   ├── alpha-muvi-fb-main/        # F&B orders (gRPC)
│   ├── alpha-muvi-notification-main/ # Notifications (gRPC)
│   └── alpha-muvi-offer/          # Offers (Go, gRPC)
├── web/                           # Frontend apps (cloned by muvi-up)
│   ├── alpha-muvi-website-main/   # Customer website (Next.js)
│   └── alpha-muvi-cms-main/       # Admin CMS (Vite + React)
├── dev-portal/                    # Developer portal (localhost:4000)
│   ├── index.html                 # Landing page with all links
│   ├── docker.html                # Docker container management
│   └── server.js                  # Express server
├── documentation/                 # API docs, audit reports
│   ├── api.html                   # Full API reference
│   ├── api-storybook.html         # Interactive API examples
│   └── ...
├── packages/                      # Shared npm packages
├── docker/                        # DB init scripts, PgAdmin config
├── verdaccio/                     # Local npm registry config
├── _packages-source/              # Proto definitions
└── .vscode/                       # Debug configurations (ready to use)
    └── launch.json                # "Attach: All Services" config
```
