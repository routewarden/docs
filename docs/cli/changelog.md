# RouteWarden CLI Changelog

All notable changes to the RouteWarden CLI (`rwarden`) are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and the CLI adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v4.0.1] - 2026-09-26 (Latest)

### Added
- **Multi-App Version Sync**:
  - Unified version synchronizer and multi-target documentation linking in RouteWarden ecosystem docs.
- **Enhanced Error Diagnostics**:
  - Clearer syntax error messages when validating malformed `tcp-warden.yaml` configurations.

---

## [v4.0.0] - 2026-09-25

### Added
- **RouteWarden TCP Warden Integration (`rwarden generate tcp-warden` & `rwarden validate`)**:
  - Declarative generation of `tcp-warden.yaml` configurations directly from centralized RouteWarden JSON policies.
  - Strict syntax, schema, and CIDR validation for `tcp-warden.yaml` via CLI arguments or stdin pipelines.
- **Real-Time TCP Monitoring in RouteWarden Dashboard**:
  - Direct ingestion and real-time visualization of structured `tcp-warden.jsonl` event streams.
  - GeoIP mapping, protocol breakdowns, connection velocity metrics, and dynamic ban tracking.
- **RouteWarden TCP Warden Standalone Application** ([TCP Warden Docs](/tcp/)):
  - Dedicated, zero-allocation Layer 4 TCP security proxy daemon for SSH, SMTP, POP3, IMAP, and generic TCP tunnels.
  - Bidirectional CrowdSec integration (LAPI bouncer decision ingestion and scenario log export).
  - Built-in management REST and SSE API (`:9091`) with hot-reload support (`SIGHUP`).
  - Official JSON Schema `tcp-warden.schema.json` and Docker Compose recipes.

---

## [v3.0.0] - 2026-09-25

### Added
- **Self-Hosted Security Dashboard (`rwarden dashboard`)**:
  - Real-time, zero-dependency web UI embedded in the `rwarden` binary — no Node.js, no external database, no cloud services required.
  - **Zero-Config Docker Discovery**: Auto-detects and streams logs from running Traefik, Caddy, and NGINX containers via the local Docker socket.
  - **Log File Tailing**: Tail local log files or wildcard glob patterns with automatic log rotation support.
  - **Real-Time Live Event Feed**: WebSocket / SSE stream of blocked requests with full-text search, container filtering, pause/resume, and clear controls.
  - **Attack Analytics**: Interactive timelines (24h, 6h, 1h), blocks-per-minute chart, top attacked endpoints, top offender IPs, and response mode distribution.
  - **Sources & Container Management**: View all active log sources with live status badges and one-click filtering.
- **v1.2 — GeoIP & IP Intelligence**:
  - Country resolution with flag emojis via embedded GeoLite2 MMDB or `ip-api.com` live fallback.
  - **Deep IP Intelligence** (`/api/ip/:ip`): Threat risk score, ISP / ASN resolution, geographic location, behavioral patterns, top targeted endpoints, and paginated event history.
  - **Config Viewer** (`/api/config/:id`): Inspect and render the live `routewarden.json` from any discovered container.
- **Tailscale & NetBird Mesh VPN Auto-Detection**:
  - Native identification of Tailscale CGNAT peers (`100.64.0.0/10`) and NetBird ULA overlay peers (`fd00::/8`) with dedicated metadata and flag emoji (`🔒`).
  - RFC 5737 documentation ranges correctly classified as `LAN / Reserved Test Network`.

---

## [v2.1.0] - 2026-09-24

### Added
- **Flexible Positional Arguments & Lenient Flag Parsing**:
  - Direct positional inputs for all commands: `rwarden test /.env`, `rwarden validate [config]`, `rwarden generate <target> [config]`, and `rwarden sandbox <target> [config]`.
  - Flags can now be placed interchangeably before or after positional arguments.
  - Automatic fallback to `routewarden.json` in current working directory when `--config` is omitted in `validate` and `generate`.
- **Shorthand Flag Aliases**:
  - Added `-c` for `--config`, `-t` for `--target`, `-q` for `--query`, `-X` and `-m` for `--method`, `-H` (repeatable) for `--header`, `-n` for `--dry-run`, `-d` for `--detach`, `-p` for `--print-config`, and `-v` for `version`.
- **Target & Format Aliases**:
  - Target generator and sandbox accept standard aliases: `yaml`, `yml`, `toml`, `compose`, `labels`, `docker-compose`, `caddyfile`, `openresty`.
- **Production Gateway Config Adaptation in Sandbox**:
  - Support for passing complete, production Traefik (`traefik.yaml`, `traefik.toml`), Docker Compose (`docker-compose.yaml`), Caddy (`Caddyfile`), and NGINX (`nginx.conf`) files directly to `rwarden sandbox`.
  - In-memory auto-adaptation: rewrites external upstream backend URLs, proxies, and certificates for isolated local testing without modifying original configuration files.
  - Live probe testing (`--test`) accommodates upstream reachability (HTTP 200, 502, 504) as allowlist pass-through.
- **Dedicated Sandbox Teardown Command**:
  - `rwarden cleanup` (and `rwarden sandbox cleanup`) to stop and prune dangling or detached sandbox containers in one command.

### Fixed
- Fixed RE2 regex backreference in Traefik label parsing to ensure 100% Go regexp standard library compliance.
- Prevented multiline upstream regex greediness in NGINX config adaptation from corrupting `server {` blocks.
- Injected missing `middlewares:` parent block in synthetic Traefik sandbox YAML generation.
- Enhanced label normalization to recognize root-level response parameters (`status`, `statusCode`, `mode`, `action`, `customResponseText`).
- Removed legacy direct boolean `silentDrop` property from `Config` schema, structs, and Docker label converters.

---

## [v2.0.0] - 2026-09-21

### Added
- **Ephemeral Gateway Sandbox (`rwarden sandbox`)**:
  - Spin up live, ephemeral container environments for **Traefik**, **Caddy**, and **NGINX (OpenResty)** pre-configured with RouteWarden security rules.
  - Automatically translates and mounts native dynamic configurations into isolated test containers.
  - Interactive foreground mode with instant graceful teardown on `Ctrl+C`.
  - Detached background mode (`--detach` / `-d`) for local dev workflows and integration testing.
  - Automated probe testing (`--test`) to execute live HTTP test suites asserting blocking and bypass behavior.
  - Dry-run mode (`--dry-run`) to inspect generated gateway configurations and exact Docker run commands without launching containers.
- **Custom RouteWarden Plugin Support**:
  - `--plugin-version`: Specify custom plugin version/tag/branch for testing specific releases.
  - `--plugin-path`: Mount local plugin repository directories for real-time plugin development.
- **Pre-flight Environment Validation**:
  - Added early Docker installation and daemon accessibility checks to fail fast with actionable guidance.
- **Enhanced Container Tooling**:
  - Included `docker-cli` inside the RouteWarden container image (`ghcr.io/routewarden/cli`).

---

## [v1.1.0] - 2026-09-21

### Added
- **Multi-Gateway Config Generator (`generate`)**:
  - Convert `routewarden.json` into native configuration for Traefik Dynamic YAML, Traefik Docker Labels, Caddy Caddyfile, and NGINX / OpenResty Lua.
  - Added support for `--config -` to stream configuration via standard input.
- **Client IP Whitelist Simulation (`test --ip`)**:
  - Test client IP evaluation against CIDR blocks and single IP allowlists offline.
- **HTTP Header Smuggling Inspection (`test --header`)**:
  - Test custom headers in `Key:Value` format to evaluate reverse proxy path normalization anti-evasion.
- **Config & Query Precedence in Offline Testing**:
  - Added `--config <path>` flag to `rwarden test`.
  - Added `--check-query` boolean flag.
- **Comprehensive Configuration Validation (`validate`)**:
  - Added HTTP status code range checks (100–599).
  - Added response mode validation and required target URL validation.
  - Added CAPTCHA provider validation.

---

## [v1.0.0] - 2026-09-20

### Initial Release
- **Path Anti-Evasion Inspection Engine (`test`)**:
  - Offline candidate path extraction simulating Traefik and Caddy middleware pipelines.
  - Recursive multi-layer URL percent-decoding (`%252e%252e`).
  - Semicolon matrix parameter stripping (`/;param/.env`).
  - Windows/IIS backslash normalization (`\..\`).
  - Null-byte injection scrubbing (`%00`).
  - Dot-segment path traversal resolving (`/static/../.env`).
  - Default block pattern matching across sensitive files.
  - Default allow pattern overrides.
- **Configuration Validator (`validate`)**:
  - Offline schema validation of `routewarden.json`.
  - Detection of invalid regular expressions and malformed CIDR blocks.
- **Official JSON Schema Export (`schema`)**:
  - CLI command emitting `config.schema.json` directly for IDE integration.
- **Distribution**:
  - Single-binary zero-dependency Go distribution for macOS, Linux, and Windows.
  - Automated installation script (`curl -fsSL https://routewarden.github.io/install.sh | bash`).
  - Official multi-architecture Docker container image on GitHub Container Registry (`ghcr.io/routewarden/cli:latest`).
