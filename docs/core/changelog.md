# Changelog & Migration Guide

All notable changes to the **RouteWarden** Traefik middleware plugin are documented below, along with breaking changes and migration advice between versions.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and RouteWarden adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.2.0] - 2026-09-24 (Latest)

### Key Highlights

- **RouteWarden CLI (`rwarden`) Multi-Target Generation**:
  - Upgraded `rwarden generate` with dedicated, explicit compile targets:
    - `--target traefik-yaml`: Compiles `routewarden.json` directly into Traefik Dynamic Configuration YAML format.
    - `--target traefik-toml`: Compiles `routewarden.json` directly into Traefik Dynamic Configuration TOML format.
    - `--target traefik-labels`: Compiles `routewarden.json` directly into Traefik Docker Compose label syntax.
    - `--target caddy`: Compiles `routewarden.json` directly into native Caddyfile directives.
    - `--target nginx`: Compiles `routewarden.json` directly into OpenResty Lua initialization tables.
  - Seamless pipeline from a single universal `routewarden.json` security policy to any target reverse proxy configuration.
- **Interactive CodeViewer & Setup Snippets**:
  - Implemented interactive `Diff` toggle across all gateways (`traefik`, `caddy`, `nginx`) in the 30-Second Setup documentation component.
  - Added dedicated `generate` tab for the `cli` gateway demonstrating on-the-fly compilation of `routewarden.json` into Traefik YAML/TOML/Labels, Caddyfile, and OpenResty Lua.
- **Unified Versioning Automation**:
  - Updated `scripts/update-version.sh` across `traefik-warden`, `caddy-warden`, and `nginx-warden` repositories to automatically synchronize `VERSIONING.md` alongside `version.json`, `README.md`, and source files upon release.
- **Gateway Plugin & Configuration Hardening**:
  - Enhanced Caddyfile parsing and validation in `caddy-warden` (`caddyfile.go`) for robust handling of custom parameters and block directives.
  - Enhanced OpenResty / NGINX Lua test suites and configuration validation in `nginx-warden` (`test_config.lua`).

---

## [v1.1.0] - 2026-09-20

### Key Highlights

- **Expanded Default Block Patterns**:
  - Added built-in protection across Traefik, Caddy, and NGINX for private cryptographic keys and certificates (`*.pem`, `*.key`, `*.crt`, `*.pfx`, `*.p12`, `*.jks`, `*.kdb`).
  - Added container manifest blocking (`Dockerfile*`, `docker-compose*.yml`, `docker-compose*.yaml`).
  - Added OS directory structure leak protection (`.DS_Store`).
  - Added CMS and framework configuration file protection (`wp-config.php*`, `configuration.php*`, `settings.py`, `local_settings.py`).
- **Header Injection & Forwarded Path Inspection (`checkHeaders` / `check_headers`)**:
  - Configurable header inspection list to neutralize HTTP reverse-proxy header smuggling (`X-Forwarded-Uri`, `X-Rewrite-URL`, `X-Original-URL`, `X-Custom-Path`).
  - Headers are passed through candidate path extraction and normalization before regex matching.
- **NGINX / OpenResty Performance & Context Auto-Population**:
  - Implemented worker-level regex caching to reuse compiled PCRE matchers across repeated requests and instances.
  - Enhanced `warden:check()` to automatically extract URI, query string, request method, remote address, and headers directly from NGINX context when called without arguments.
- **Dedicated RouteWarden CLI (`rwarden`) & GitHub Pages Portal**:
  - Created standalone `routewarden/cli` repository and documentation portal (`https://routewarden.github.io/cli/`).
  - Built high-performance CLI with `test` (offline path simulation), `validate` (configuration file & stdin verification), and `schema` (JSON Schema export) subcommands.
  - Provided containerized distribution via `ghcr.io/routewarden/cli:latest` alongside native binaries and one-line universal installer script (`curl -fsSL https://routewarden.github.io/cli/install.sh | bash`).
  - Added streamlined uninstallation instructions and containerized execution alternatives side-by-side.
- **Universal Configuration File (`routewarden.json`)**:
  - Full support for `routewarden.json` in production across Traefik, Caddy, and NGINX recipes and blueprints.
  - Decouples security policy definitions from proxy-specific config syntax for centralized auditing and GitOps workflows.
- **Interactive Pattern Checker & Security Playground**:
  - Upgraded live tester with full support for new v1.1.0 pattern categories (keys, container manifests, `.DS_Store`, CMS config).
  - Added support for header smuggling simulation and gateway export snippets.
- **Path Normalizer Fuzz Testing**:
  - Implemented continuous fuzz testing (`FuzzExtractCandidatePaths`) in Traefik and Caddy test suites targeting percent-decoding, null bytes, backslashes, and matrix parameters.

---

## [v1.0.0] - 2026-09-20

The `v1.0.0` milestone release marks general availability and multi-gateway parity for RouteWarden across **Traefik**, **Caddy**, and **NGINX / OpenResty**.

### Key Highlights

- **RouteWarden for NGINX & OpenResty (`nginx-warden`)**:
  - Full production-ready Lua implementation running in LuaJIT during the `access_by_lua` phase.
  - Zero external dependencies: pure OpenResty standard libraries (`ngx.re`, `resty.string`, bit operations).
  - Complete parity with Go implementations:
    - Recursive multi-layer URL percent-decoding (`%252e%252e`).
    - Semicolon matrix parameter stripping (`/;param/.env`).
    - Windows/IIS backslash normalization (`\..\`).
    - Null-byte injection scrubbing (`%00`).
    - Canonical path resolution and dot-segment traversal protection.
  - Full 13 response modes supported: `json`, `html`, `text`, `xml`, `redirect`, `captcha` (Turnstile/hCaptcha/reCAPTCHA), `silentDrop` (HTTP 444), `gzipBomb`, `tarpit`, `fakeSuccess`, `rateLimitChallenge`, `proxy`, and `infiniteStream`.
  - IPv4 and IPv6 exact address matching and CIDR subnet evaluation (`10.0.0.0/8`, `2001:db8::/32`).
  - Native client IP resolution prioritizing `X-Forwarded-For`, `X-Real-IP`, and socket `remote_addr`.
  - Structured JSON security logging (`security_log`) compatible with CrowdSec parsers and SIEM collectors.
- **Unified Multi-Gateway Parity (`traefik-warden`, `caddy-warden`, `nginx-warden`)**:
  - Consistent 30-case live verification suites across all supported gateways (`samples/`).
  - Unified configuration schema and parameter naming across reverse proxies.
- **Interactive Playground Expansion**:
  - Added dedicated **`NGINX (Lua)`** configuration export tab generating complete `init_by_lua_block` and `access_by_lua_block` snippets.
  - Added dedicated **`K8s (NGINX)`** export tab generating Kubernetes Ingress manifests with `nginx.ingress.kubernetes.io/server-snippet` and `configuration-snippet`.
  - Added custom hybrid syntax highlighting for YAML manifests with embedded Lua blocks.
  - Added URL parameter sharing support for `format=nginx` and `format=k8s_nginx`.
- **Complete Case Studies & Recipes Coverage**:
  - Integrated NGINX / OpenResty code tabs across all 7 production case studies (Immich, Webhooks, Observability Metrics, CMS Shield, Vaultwarden Admin Lockdown, Honeypot Strategies, CrowdSec Log Ingestion).
  - Added `NGINX / OpenResty (Docker Compose)` service definitions across all 6 core recipes.
- **Documentation Architecture & Versioning**:
  - Archived `v0.3.x` documentation preserved under `/v0.3/` (`traefik`, `caddy`, `core`, `examples`, `guide`, `reference`) with legacy version notices.
  - Promoted `v1.0.x (Latest)` with new dedicated NGINX sections (`/nginx/getting-started`, `/nginx/configuration`, `/nginx/examples`).
  - Updated snapshot automation tooling (`scripts/snapshot-version.mjs`) to include NGINX in version snapshots.

---

## [v0.3.x Series] (Archived)

The `v0.3.x` release series introduces granular HTTP method filtering (`methods` / `method` variable) across RouteWarden Core, Traefik, Caddy, Docker Compose, and Kubernetes gateways, alongside an upgraded interactive Pattern Checker & Security Playground.

### Breaking Changes & Upgrade Considerations

::: info Compatibility Notice
- **Non-breaking Addition**: `methods` is entirely optional. When omitted or left empty, patterns default to matching **ALL** HTTP methods, preserving full backward compatibility with `v0.2.x` configurations.
- **Case-Insensitive Method Matching**: Specified HTTP methods are matched case-insensitively (`GET`, `POST`, `HEAD`).
:::

### Version Differences (v0.2.x vs v0.3.x)

| Feature / Capability | v0.2.x | v0.3.x | Notes / Details |
|---|---|---|---|
| **HTTP Method Filtering** | ❌ Matches all methods | ✅ **`methods` / `method`** | Filter rules by specific HTTP verbs (e.g., `["POST", "PUT", "DELETE"]` for state-changing endpoints, leaving `GET` open). |
| **Caddy Method Directive** | ❌ Path regex only | ✅ **`method` subdirective** | Define method constraints directly in `route_warden` Caddyfile blocks and Caddy JSON matchers. |
| **Interactive Matrix Simulator** | ❌ Single URL check | ✅ **Multi-Verb Matrix** | Test and preview verdict and HTTP responses simultaneously across all selected HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`, etc.). |
| **Deterministic Syntax Highlighting** | ❌ Plain code block | ✅ **Multi-Gateway Highlighter** | Rich syntax highlighting for Caddyfile, Traefik YAML, Traefik TOML, Docker Compose, and Kubernetes manifests. |
| **Kubernetes Gateway Generation** | Traefik CRD only | ✅ **Traefik CRD & Caddy ConfigMap** | Generates native Traefik `Middleware` CRDs and Caddy `ConfigMap` manifests with proper ordering (`order route_warden before reverse_proxy`). |
| **Pattern Checker Architecture** | Single-column cards | ✅ **Inline 2-Column Grid** | Side-by-side color-differentiated Block (crimson) and Allow (emerald) lists with dynamic URL-to-regex compilation. |
| **CrowdSec / SIEM Security Logging** | ❌ None | ✅ **`securityLog` / `security_log`** | Single-line structured JSON security events on stdout for CrowdSec 1-strike auto-ban and SIEM threat monitoring. |

### [v0.3.3] - 2026-09-19

#### Added
- **CrowdSec & SIEM Structured Security Audit Logging (`securityLog` / `security_log`)**:
  - Added built-in structured security audit logging enabled by default across both `traefik-warden` (`securityLog: true`) and `caddy-warden` (`security_log true`).
  - When a request is blocked (via path patterns, query strings, or query parameters), RouteWarden emits a deterministic, single-line JSON payload to stdout with `type: "routewarden_block"`, `client_ip`, `path`, `pattern`, `action`, `reason`, and `user_agent`.
  - Added official CrowdSec parser (`routewarden-logs.yaml`) and trigger scenario (`routewarden-threat.yaml`) enabling instant 1-strike firewall auto-bans without multi-request thresholds or excessive log parsing overhead.
  - Added comprehensive [CrowdSec Integration Guide](/examples/crowdsec) covering Docker Compose setup, CrowdSec log acquisition, and SIEM ingestion.

---

### [v0.3.2] - 2026-09-18

#### Added
- **Diagnostic Debug Logging Flag (`debug`)**:
  - Added `debug` configuration boolean option across RouteWarden Core, Traefik, and Caddy gateways (defaults to `false`).
  - When `debug: true`, RouteWarden outputs detailed diagnostic logs to stdout / reverse proxy logging, capturing:
    - Inbound request method, client IP, and original raw URL path.
    - Candidate path transformations generated during multi-layer anti-evasion normalization (unescaping, matrix param stripping, backslash conversion, null-byte stripping, traversal cleanup).
    - Matched allowlist rules or blocking pattern hits with rule IDs, or non-matching verb bypass details.
  - Supported across Traefik YAML/TOML (`debug: true`), Docker Compose labels (`traefik.http.middlewares.<name>.plugin.routewarden.debug=true`), Caddyfile (`debug true`), and Caddy JSON API (`"debug": true`).

---

### [v0.3.0] - 2026-09-17

#### Added
- **Granular HTTP Method Filtering (`methods` / `method`)**:
  - **Traefik Middleware Configuration**: Added `methods` array property to path pattern rules (`pathPatterns[].methods` and `allowPatterns[].methods`), accepting standard HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`, etc.).
  - **Caddy Directive & JSON API**: Added `method <verbs...>` subdirective within `route_warden` Caddyfile blocks and method array matching in Caddy JSON configuration.
  - **Docker Compose & CLI Labels**: Added support for comma-separated method labels (e.g. `traefik.http.middlewares.shield.plugin.routewarden.pathPatterns[0].methods=GET,POST`).
  - **Kubernetes CRD & ConfigMap**: Integrated `methods` into Traefik `Middleware` CRDs and Caddy `ConfigMap` templates.
- **Interactive Security Playground & Pattern Checker**:
  - **Multi-Verb Selection & Simulation Matrix**: Select multiple HTTP verbs simultaneously and view immediate individual evaluation verdicts (BLOCK / ALLOW / PASS) and simulated HTTP protocol responses per verb.
  - **Auto-Generate Regex from URL**: Single-click `⚡ + Block Rule` and `⚡ + Allow Rule` actions compiling the active test path into optimized, anchored RE2 regular expressions (disabled when input is empty).
  - **Deterministic Syntax Highlighter**: Custom built-in tokenizer and highlighter engine with light/dark theme support for Caddyfile, Traefik YAML, Traefik TOML, Docker labels, and Kubernetes manifests.
  - **Dual Kubernetes Gateway Exports**: Dedicated generator tabs for both `K8s (Traefik)` Middleware CRD and `K8s (Caddy)` ConfigMap manifest.
  - **Inline Color-Differentiated Protection Layout**: Compact 2-column protection strip with crimson/red Block list and emerald/green Allow list.
  - **Gateway Container Theming**: Generated configuration block dynamically theme-colors its borders, tabs, copy button, and filename indicator based on the active gateway (Emerald for Caddy, Electric Blue for Traefik, Cyan for Docker).
- **Documentation Migration & Archived v0.2.x Snapshot**:
  - Archived `v0.2.x` documentation preserved under `/v0.2/` with legacy version notices and internal link rewrites.
  - Promoted `v0.3.x (Latest)` across navigation bar, version dropdown, and versioning tooling.

---

## [v0.2.x Series] (Archived)

The `v0.2.x` release series introduces CIDR/IP whitelisting, comprehensive anti-evasion hardening, a multi-mode response engine, and an interactive documentation site.

### Breaking Changes & Upgrade Considerations

::: danger Breaking Changes in v0.2.x
1. **Config Key Renaming (`blockPatterns` ➔ `pathPatterns`)**:
   - In `v0.1.0`, `blockPatterns` was used in some examples. In `v0.2.x`, `pathPatterns` is the primary configuration key. Although `blockPatterns` is retained as a backward-compatible alias in Go, configuring `pathPatterns` is recommended.
2. **Normalized Path Matching**:
   - Starting in `v0.2.0`, incoming paths are strictly canonicalized and anti-evasion decoded before regex evaluation. If your custom regex in `v0.1.x` relied on matched raw URL-encoded characters (such as `%2e` or `%2f`), it will no longer match because paths are decoded prior to inspection. Regexes should match raw plain path segments.
3. **Response Header Structure**:
   - Custom response headers in `response.headers` are now strictly validated against standard HTTP header formatting.
:::

### Version Differences (v0.1.x vs v0.2.x)

| Feature / Capability | v0.1.x | v0.2.x | Notes / Details |
|---|---|---|---|
| **IP / CIDR Whitelisting** | ❌ Not available | ✅ **`allowedIps`** | Whitelist IPs or subnets (e.g. `10.0.0.0/8`, `192.168.1.100`) to bypass blocking. |
| **Client IP Resolution** | ❌ None | ✅ **`X-Forwarded-For` & `X-Real-IP`** | Accurately tracks origin IP through reverse proxies and load balancers. |
| **Response Modes** | `json`, `html`, `text`, `redirect` | `json`, `html`, `text`, `xml`, `redirect`, `captcha`, `silentDrop`, `gzipBomb`, `tarpit`, `fakeSuccess`, `rateLimitChallenge`, `proxy`, `infiniteStream` | 13 deterministic error, challenge, deception, and active defense modes. |
| **Path Anti-Evasion** | Basic URL decode | Multi-layer decode, dot-segment traversal, IIS backslash & matrix param scrubbing | Neutralizes `%252e%252e`, `/;param/.env`, and `\\` evasion vectors. |
| **Test Suite Coverage** | ~60% basic tests | **94.5% statement coverage** | Isolated unit suites, race detection, and full edge case verification. |
| **Documentation** | Readme only | Interactive VitePress Wiki + Version Switching | Live searchable documentation with unified code tabs and live examples. |

### [v0.2.4] - 2026-09-17

#### Added
- **Multi-Mode Response Engine Expansion (13 Distinct Modes)**:
  - **Reverse Slowloris Tarpit (`mode: tarpit`)**: Stalls bot connections by trickling bytes at configurable intervals (`tarpitDelayMs: 1000`, `tarpitMaxDurationSeconds: 60`), tying up crawler socket and thread pools.
  - **Synthetic Honeypot Deception (`mode: fakeSuccess` / `mode: decoy`)**: Serves convincing mock payloads (`.env` credentials, Spring Actuator health JSON, dummy `git/HEAD`, fake `wp-login.php`, or sanitized PHP info) to bait scanners into reporting false positives and wasting attacker resources.
  - **Rate Limit Backoff Challenge (`mode: rateLimitChallenge` / `mode: ratelimit`)**: Returns HTTP `429 Too Many Requests` with a compliant `Retry-After: <seconds>` header (`retryAfterSeconds: 300`) to instruct polite crawlers to back off.
  - **XML Error Output (`mode: xml`)**: Outputs structured `<Error><Status>403</Status><Message>...</Message></Error>` or custom SOAP Fault bodies for enterprise and legacy integrations.
  - **Forensic Transparent Reverse Proxy (`mode: proxy` / `mode: mirror`)**: Transparently reverse-proxies unauthorized requests into an internal canary/honeypot container (`proxyUrl`) via `httputil.NewSingleHostReverseProxy` without alerting the attacker with a 302 redirect.
  - **Infinite Garbage Stream (`mode: infiniteStream` / `mode: garbagestream`)**: Continuous high-speed streaming of pseudo-random bytes (`streamSizeMB: 50`) to exhaust crawler disk storage or crash unbuffered parsers.
- **Official Repository Migration**:
  - Moved official project ownership and repository location to [**`https://github.com/routewarden/traefik-warden`**](https://github.com/routewarden/traefik-warden).
  - Updated Go module import path to `github.com/routewarden/traefik-warden`.
  - Updated documentation URL to [`https://routewarden.github.io/traefik-warden/`](https://routewarden.github.io/traefik-warden/).
- **Dedicated Response Modes Reference Guide (`docs/reference/response-modes.md`)**:
  - Comprehensive documentation covering all 13 response behaviors, threat model impact, operational considerations, crawler warnings, and configuration examples.
  - Integrated into top navigation and sidebar.
- **Automated GitHub Actions CI Workflow (`.github/workflows/ci.yml`)**:
  - Go test matrix running with data race detection (`go test -v -race ./...`) across Go 1.21, 1.22, and 1.23.
  - Node.js script testing, docs build verification, and step summary generation for PR status enforcement.

#### Changed
- Increased statement test coverage to **94.5%** with comprehensive unit and edge case tests across all response modes.

---

### [v0.2.3] - 2026-09-17

#### Added
- **Configurable Default Whitelist Flag (`enableDefaultAllowPatterns`)**:
  - Added `enableDefaultAllowPatterns` configuration flag (boolean, defaults to `true`).
  - When set to `false`, RouteWarden disables the built-in public whitelist (`/robots.txt`, `/sitemap.xml`, `/ads.txt`, `/security.txt`, and `/.well-known/*`), giving operators total zero-trust control over allowlists.
  - Retains backward compatibility where built-in paths remain automatically permitted by default.
- **Production Case Studies Suite (`docs/examples/`)**:
  - Added 6 in-depth architectural production case studies with Traefik configurations and threat model breakdowns:
    - **Dual-Router Immich Photo Sharing**: Exposing public sharing while cloaking internal administration and microservices (with Traefik routing rules and Immich external domain configuration).
    - **Zero-Trust Stripe & GitHub Webhook Ingress**: Locking down webhook receivers with payload inspection bypass while silently cloaking other paths.
    - **Prometheus & Spring Boot Actuator Cloaking**: VPN/LAN restriction of metrics, diagnostics, and management ports without exposing sensitive internal metadata.
    - **WordPress & CMS Admin Shielding**: Hardening `wp-login.php`, `xmlrpc.php`, and brute-force endpoints with dynamic IP bypass or CAPTCHA challenge.
    - **Vaultwarden Admin Lockdown**: Completely severing exposure of `/admin` endpoints while keeping password synchronization functional across mobile and browser clients.
    - **Honeypot Deflection, Silent Drops & Active Defense**: Deceiving automated vulnerability crawlers using HTTP 200 decoy responses, connection resets via `silentDrop`, active crawler neutralization via `gzipBomb`, and staging environment cloaking.
- **Dedicated Top Navigation & Homepage Discovery**:
  - Promoted "Case Studies" to the top navigation bar and sidebar in VitePress.
  - Added an interactive visual card grid on the documentation homepage highlighting key architectures and real-world threat protections.
- **Wildcard & Regex Subpath Pattern Conformance**:
  - Expanded test coverage and documentation on regex subpath matching (e.g., prefix anchors `^/api/users.*$`, exact paths, and query string separation).
- **Mobile Responsive Design Improvements**:
  - Compact collapsible search icon button on mobile screens (`<768px`) to prevent navigation clipping.
  - Mobile-optimized table horizontal scrolling and single-column responsive card layouts.
- **SEO & Social Preview Metadata**:
  - Added OpenGraph (`og:title`, `og:description`, `og:image`, `og:url`) and Twitter Card metadata to documentation pages.
- **Gzip Bomb Active Defense Mode (`mode: gzipBomb` / `mode: bomb`)**:
  - Added native decompression bomb response mode for active bot and vulnerability scanner neutralization.
  - Serves an HTTP 200/403 response with `Content-Encoding: gzip` streaming compressed zeroes using Go's `compress/gzip` with best compression.
  - Configurable `gzipBombMB` option (defaults to 10MB, requiring negligible server bandwidth while expanding to ~10GB in client memory, triggering OOM crashes on crawlers and scanners).
- **Static High-Resolution Icon**:
  - Rendered crisp 512×512 PNG asset (`assets/icon.png` and `docs/public/icon.png`) derived from the animated SVG vector.

#### Changed
- Enhanced `routewarden_test.go` and `config_test.go` with test assertions for `enableDefaultAllowPatterns` and wildcard patterns.

---

### [v0.2.2] - 2026-09-16

#### Added
- **Version Management & Snapshot Tooling**:
  - Added `VERSIONING.md` documenting RouteWarden's version lifecycle and documentation snapshotting process.
  - Automated Node.js scripts (`scripts/sync-version.mjs`, `scripts/snapshot-version.mjs`) with automated unit testing (`tests/scripts.test.mjs`).
  - Added version switcher supporting both current and snapshot versions (`docs/versions.json`).
- **Synchronized Multi-Format Configuration Tabs**:
  - Interactive multi-tab selector component synchronized across pages (YAML, TOML, Docker CLI, and K8s CRD).

#### Changed
- Consolidated root changelog and versioning documentation within `docs/reference/changelog.md`.
- Updated all reference guides and example Docker Compose files to reference `v0.2.2`.

---

### [v0.2.1] - 2026-09-16

#### Added
- **Interactive Documentation & Wiki Site (VitePress)**:
  - Official documentation site hosted on GitHub Pages ([`https://routewarden.github.io/traefik-warden/`](https://routewarden.github.io/traefik-warden/)).
  - Client-side full-text search, dark/light theme, and synchronized multi-format code previews (YAML, TOML, CLI).
  - Version switching across documentation branches (`v0.2.x` and `v0.1.x`).
- **In-Repo Examples Suite (`examples/`)**:
  - `01-basic-sensitive-files`: Quickstart shielding backend services against `.env`, `.git`, backups, and configs.
  - `02-global-entrypoint-shield`: Global entrypoint middleware shielding all services across Traefik without per-service labels.
  - `03-ip-whitelist-vpn`: Bypassing security checks for trusted CIDR / VPN networks.
  - `04-captcha-challenge`: Verification challenges with Cloudflare Turnstile and hCaptcha.
  - `05-kubernetes-ingressroute`: Kubernetes Traefik `Middleware` and `IngressRoute` CRD manifests.
- **Automated GitHub Pages CI/CD Pipeline**:
  - Added `.github/workflows/deploy-docs.yml` using GitHub Actions and `@actions/deploy-pages`.

#### Changed
- **Streamlined `README.md`**:
  - Simplified landing page with quickstart returning 404 Not Found error payloads.
  - Concise configuration summary table and badges linking to the documentation wiki.

---

### [v0.2.0] - 2026-09-16

#### Added
- **IP & CIDR Subnet Whitelisting (`allowedIps`)**:
  - Added `allowedIps` configuration supporting IPv4 addresses, IPv6 addresses, and CIDR subnet masks (e.g., `127.0.0.1`, `10.0.0.0/8`, `2001:db8::/32`).
  - Implemented client IP resolution with proxy forwarding support (`X-Forwarded-For`, `X-Real-IP`, and socket `RemoteAddr`).
  - Requests originating from whitelisted IPs/subnets bypass sensitive route blocking and proceed directly to downstream services.
- **Architectural Modularization**:
  - Split core plugin into clean decoupled components:
    - `config.go`: Schemas, default regex rules, and builder factory.
    - `ip_filter.go`: Dedicated IP address and CIDR subnet evaluation engine.
    - `path_normalizer.go`: Anti-evasion path normalizer and sanitizer.
    - `response_handler.go`: Multi-mode response engine (JSON, HTML, Captcha, Redirect, Text, Silent Drop).
    - `routewarden.go`: Middleware coordinator implementing Traefik's `http.Handler`.
- **Per-File Test Suites & Integration Pipeline**:
  - Split test coverage into dedicated files: `config_test.go`, `ip_filter_test.go`, `path_normalizer_test.go`, `response_handler_test.go`, and `routewarden_test.go`.
  - Added `integration_test.go` simulating a multi-middleware Traefik pipeline.
  - Increased statement test coverage to **92.6%**.
- **Branding & Visual Assets**:
  - Minimalist animated SVG line-art icon (`assets/icon.svg`).
  - GitHub social preview banner (`assets/banner.png`).
  - Architecture diagram (`assets/architecture.png`).

---

## [v0.1.x Series] — Legacy

### [v0.1.0] - 2026-09-16

#### Added
- **Core Middleware Engine**:
  - Traefik middleware conforming to Yaegi interpreter specifications using Go standard library (`net/http`, `regexp`, `context`).
  - Factory functions `CreateConfig()` and `New()`.
- **Sensitive Path & Extension Blocking**:
  - Default rule set for blocking `.env*`, `.git`, `.svn`, `.aws`, `.ssh`, backups (`.bak`, `.backup`, `.sql`, `.tar.gz`, `.zip`), configs (`.conf`, `.config`, `.ini`, `.yaml`, `.yml`), logs (`.log`), and debug/status endpoints (`phpinfo.php`, `/actuator/*`).
  - Configurable `pathPatterns` and `blockPatterns` for custom regex matching.
  - Configurable `allowPatterns` override list (defaults include `/robots.txt`, `/ads.txt`, `/security.txt`, and `/.well-known/*`).
- **Initial Response Actions**:
  - Support for `json`, `html`, `redirect`, and `text` modes.
  - Configurable status code (default `403`) and response headers.
- **Initial Anti-Evasion**:
  - Basic URL unescaping, backslash normalization, and semicolon matrix parameter stripping.
