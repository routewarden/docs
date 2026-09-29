---
title: TCP Warden Changelog & Release Notes
description: Complete release notes, breaking changes, and migration guide for RouteWarden TCP Warden.
---

# TCP Warden Changelog & Release Notes

All notable changes to **RouteWarden TCP Warden** (`github.com/routewarden/tcp-warden`) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and TCP Warden adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v2.0.0] - 2026-09-29 (Latest)

### 🚀 Major Release: Complete Protocol Modularization & Architecture V2

TCP Warden v2.0.0 marks a major architectural milestone. All protocol inspectors have been extracted from the core codebase into the standalone, independently versioned [`github.com/routewarden/plugins`](https://github.com/routewarden/plugins) repository. The core `tcp-warden` daemon is now an ultra-fast, zero-bloat Layer 4 transparent reverse proxy and security engine.

#### 1. Complete Protocol Plugin Extraction
- **Decoupled Core Architecture**: Removed legacy internal protocol framing packages (`protocol/ssh`, `protocol/postgres`, `protocol/redis`, etc.) from the core binary repository.
- **19 Standalone Protocol Plugins**: All protocol guards now live in `github.com/routewarden/plugins`:
  - **Remote Access & Mail**: `ssh`, `smtp`, `pop3`, `imap`, `ftp`, `vnc`.
  - **Databases & Caches**: `postgres`, `mysql`, `redis`, `mongodb`, `memcached`.
  - **Messaging & Directory**: `amqp`, `mqtt`, `ldap`.
  - **Web, Routing & Games**: `http`, `tls_sni`, `minecraft`, `generic`, `echo_filter`.
- **Embedded Manifests (`//go:embed plugin.yaml`)**:
  - All plugins embed their `plugin.yaml` manifests directly into compiled binaries using `sdk.MustParseManifest()`.
  - Enables zero-disk in-memory capability discovery, schema validation, and health reporting.

#### 2. High-Performance Runtime Caching & Boot Optimization
- **Recompiled Binary Caching**:
  - Container entrypoint automatically persists recompiled daemon binaries in `/var/lib/routewarden/bin/tcp-warden` and active plugin imports in `/var/lib/routewarden/all.go`.
  - Subsequent container boots restore the precompiled binary instantly, eliminating Go compiler latency on container restarts.
- **Dynamic Plugin Boot Integration**:
  - Support for `AUTO_INSTALL_PLUGINS="ssh postgres redis"` in Docker environments to automatically pull, verify, and compile plugins on first boot.
  - Automatic protocol detection activates plugin inspectors declared in `tcp-warden.yaml`.

#### 3. Dual API Architecture & Unix Socket Support
- **Dual API Route Prefixes**:
  - Management API endpoints now respond both at root paths (`/stats`, `/services`, `/banlist`, `/ban`, `/unban`, `/events`, `/ping`) and standard REST paths (`/api/stats`, `/api/services`, `/api/banlist`, `/api/events`).
  - Added dedicated `/services` endpoint returning the active catalog of registered services, protocols, listeners, and upstreams.
- **IPC Unix Domain Sockets**:
  - Secure local inter-process communication via `api.socket` and environment variables `ROUTEWARDEN_API_SOCKET` / `ROUTEWARDEN_API_LISTEN`.
  - Automated file permissions handling (`0660` socket mode).

#### 4. Hardened Security, Privileges & Concurrency
- **Non-Root Port Capabilities**:
  - Automatically applies `setcap 'cap_net_bind_service=+ep'` to recompiled binaries in Docker, allowing unprivileged `routewarden` user (UID 1000) to bind low ports (<1024) safely.
- **Stream Buffer Preservation (`protocol.BufferedConn`)**:
  - Guarantees zero byte loss during protocol inspection handshakes before transitioning to raw bidirectional streaming.
- **Race Condition & Thread Safety**:
  - 100% race-condition free concurrency across all proxy pipelines and plugin inspectors verified with `go test -race -count=1 ./...`.
  - Converted internal byte and packet metrics to lock-free atomic counters (`atomic.Int64`).

#### 5. Sample Configurations & Deployment Topologies
- **Overhauled Configuration Samples**:
  - Modernized `samples/` directory with dedicated manifests: `databases.yaml`, `crowdsec.yaml`, `gaming-iot.yaml`, `local-test.yaml`, and `docker-compose.yaml`.
  - Cleaned default `tcp-warden.yaml` template to showcase modular plugin registration and upstream proxying.

---

## [v1.1.1] - 2026-09-29

### Improvements & Hardening

- **Instant Recompiled Binary Caching**:
  - Container entrypoint automatically persists recompiled daemon binaries in `/var/lib/routewarden/bin/tcp-warden`.
  - Subsequent container boots and restarts load the cached binary immediately without invoking `go build`, reducing startup time from seconds to milliseconds.
- **Dual API Route Prefixes**:
  - Management API now exposes convenience aliases directly at the root (`/stats`, `/services`, `/banlist`, `/ban`, `/unban`, `/events`, `/ping`) alongside their `/api/` counterparts (`/api/stats`, `/api/services`, etc.).
- **Container Permissions & Capability Security**:
  - Automatically provisions `cap_net_bind_service` on recompiled binaries, enabling unprivileged `routewarden` user to bind low ports (<1024) safely under Docker.

---

## [v1.1.0] - 2026-09-28

### Major Architecture Updates

- **Full Plugin Modularization**:
  - Decoupled all protocol inspectors (`ssh`, `smtp`, `pop3`, `imap`, `postgres`, `mysql`, `redis`, etc.) from the core binary into the dedicated [`routewarden/plugins`](https://github.com/routewarden/plugins) repository.
  - Core binary remains a lean, zero-bloat Layer 4 transparent proxy (`generic` / `tcp`).
- **Port Range Forwarding**:
  - **1:1 Port Mapping**: Maps continuous ingress port ranges directly to matching upstream port offsets (e.g. `:8000-8005` to `10.0.0.1:9000-9005`).
  - **Many-to-One Mapping**: Routes an entire range of ingress ports into a single backend ingress pool (e.g. `:8080-8085` to `10.0.0.1:80`).
- **Auto-Installation on Boot**:
  - Added support for `AUTO_INSTALL_PLUGINS="ssh postgres redis"` in Docker Compose.
  - Automatic protocol enablement: the daemon automatically detects protocols used in `tcp-warden.yaml` and activates the corresponding plugin.
- **Unix Domain Socket API**:
  - Added support for local IPC via `api.socket` and environment variables `ROUTEWARDEN_API_LISTEN` / `ROUTEWARDEN_API_SOCKET`.

---

## [v1.0.5] - 2026-09-26

### Key Highlights

- **Embedded Manifests (`//go:embed plugin.yaml`)**:
  - Standardized manifest embedding across all official plugins via Go 1.16+ `//go:embed plugin.yaml` and `sdk.MustParseManifest()`.
  - Enables in-memory metadata inspection without needing loose YAML files on disk at runtime.
- **Manifest Versioning Separation (`manifest_version`)**:
  - Decoupled `manifest_version` (format schema version, e.g. `"1.0.0"`) from plugin release `version` (e.g. `"1.1.0"`).
  - Plugin releases can now be updated and bumped independently without mutating or breaking manifest schema validation.
- **4-Step Plugin Verification Pipeline**:
  - Implemented a strict 4-step installation pipeline when running `tcp-warden plugins install <source>`:
    1. `[1/4] Validating manifest`: Validates `plugin.yaml` syntax, uniqueness, and required fields.
    2. `[2/4] Checking manifest compatibility`: Confirms the manifest format is supported by the running SDK.
    3. `[3/4] Compiling plugin`: Runs Go compiler sanity checks (`go vet` and dry-run build).
    4. `[4/4] Running tests`: Executes `go test -race -count=1 ./...` inside the plugin directory. If tests fail or race conditions are detected, the plugin is rejected before installation.
  - Simplified and standardized CLI progress reporting to clean single-line status messages.
- **Stream Buffer Preservation (`protocol.BufferedConn`)**:
  - Resolved potential data loss when transitioning from initial protocol inspection (using `bufio.Reader`) to raw bidirectional proxying (`protocol.Proxy`).
  - `BufferedConn` ensures any unconsumed buffered bytes are forwarded to the upstream connection before streaming raw packets.
- **Race Condition Hardening**:
  - Audited all 14 official plugins with `go test -race -count=1 ./...` with zero race warnings.
  - Atomic byte counters (`atomic.Int64`) implemented across all inspectors.

---

## [v1.0.4] - 2026-09-25

### Improvements & Fixes

- **Docker Volume Mounting & State Persistence**:
  - Hardened Docker volume configuration for `/var/lib/routewarden/plugins` and `/var/lib/routewarden/data`.
  - Ensured dynamic plugin registration survives container restarts and image updates.
- **Plugin Module Resolution**:
  - Improved local directory plugin resolution (`tcp-warden plugins install ./path`).
  - Added automatic fallback to shallow cloning for Git plugin repositories.

---

## [v1.0.3] - 2026-09-24

### Features & Usability

- **Fast Plugin Installs (`--no-build`)**:
  - Added `--no-build` flag to `tcp-warden plugins install` to allow batching multiple plugin installations before triggering a single compilation step.
- **Plugin Dependency Management**:
  - Handled nested dependency resolution when plugins require external third-party Go packages.
  - Added cache management via `tcp-warden plugins install --force` to purge corrupted plugin staging directories.

---

## [v1.0.2] - 2026-09-22

### Optimizations

- **Lightweight Docker Image (~25MB)**:
  - Migrated Docker distribution to a multi-stage Alpine build.
  - Stripped debug symbols and minimized binary footprint while preserving full statically linked CGO-free portability.
- **CLI Flag Normalization**:
  - Added short flags (`-c` for `--config`, `-v` for `--version`) across all root and subcommands.
  - Improved error messages for invalid YAML syntax with line and column indicators.

---

## [v1.0.1] - 2026-09-20

### Security & Engine

- **High-Performance IP Banning Engine**:
  - In-memory concurrent hash table for instant $\mathcal{O}(1)$ connection lookups.
  - Embedded SQLite database for crash-resilient ban persistence across daemon restarts.
- **Management API & SSE Stream**:
  - Added lightweight HTTP management API on `127.0.0.1:9091`.
  - Endpoints for querying metrics (`/health`, `/metrics`), managing bans (`GET /bans`, `POST /ban`, `POST /unban`), and streaming live security audit logs via Server-Sent Events (`GET /events`).
- **Token-Bucket Rate Limiting**:
  - Configurable per-service and global rate limits (`connections_per_minute` and `burst`).
  - Sub-millisecond connection evaluation with zero socket allocation overhead.

---

## [v1.0.0] - 2026-09-18

### Initial Release

- **Core L4 Security Proxy & Firewall**:
  - High-speed Layer 4 TCP proxy engine built on Go.
  - Anti-brute-force failure tracking with automatic IP banning.
  - Native support for SSH, SMTP, POP3, IMAP, and raw TCP pass-through.
- **Modular Plugin SDK (`plugins/sdk`)**:
  - Extensible plugin architecture enabling custom protocol inspectors.
  - In-memory self-testing interface (`SelfTest()`).
  - Security event auditing (`ctx.OnSecurityEvent()`) and auth failure reporting (`ctx.OnAuthFailure()`).
- **CrowdSec LAPI Integration (Optional)**:
  - Optional real-time ban decision synchronizer with CrowdSec Local API.
  - Fallback action policies: `ban`, `throttle`, or `bypass`.
- **Port Range Forwarding**:
  - Support for 1:1 and many-to-one port range mappings (e.g. `:8000-8005`).
