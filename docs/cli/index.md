# RouteWarden CLI (`rwarden`)

`rwarden` is the official developer CLI, policy compiler, configuration validator, and real-time observability dashboard for the RouteWarden security suite.

It enables security and platform teams to evaluate path rules offline, validate configurations against official JSON schemas, compile universal policies for Traefik, Caddy, NGINX, and TCP Warden, and spin up an embedded web dashboard with zero runtime dependencies.

---

## Key Features

- **Offline Path & Anti-Evasion Simulator (`test`)**:
  Simulate full multi-layer URL decoding, query parameter inspection, backslash normalization, semicolon parameter stripping, and IP allowlist evaluation without running any reverse proxy.
- **Strict Schema & Syntax Validation (`validate`)**:
  Validate `routewarden.json` (HTTP gateways) and `tcp-warden.yaml` (L4 daemon) against their formal JSON schemas with clear diagnostics for syntax errors, regex mistakes, and invalid CIDR notations.
- **Multi-Target Policy Generator (`generate`)**:
  Compile a single, universal `routewarden.json` security policy into target-specific configurations:
  - Traefik Dynamic Configuration (YAML and TOML)
  - Traefik Docker Compose Labels
  - Caddyfile directive blocks
  - NGINX / OpenResty Lua initialization tables
  - TCP Warden YAML configuration
- **Ephemeral Gateway Sandbox (`sandbox`)**:
  Launch isolated, pre-configured Traefik, Caddy, or NGINX containers in Docker to verify your rules and response modes live against automated attack test suites.
- **Embedded Real-Time Security Dashboard (`dashboard`)**:
  Self-hosted real-time web UI pre-compiled and embedded inside the Go binary (`go:embed`). Features Docker socket auto-discovery, live event feeds, 24-hour attack analytics, deep IP threat scoring, and Tailscale/NetBird mesh VPN detection.
- **Official JSON Schema Export (`schema`)**:
  Export official JSON Schemas for instant IDE autocomplete (VS Code, JetBrains, Neovim) and CI/CD automated linting.

---

## Quick Start

### 1. Install `rwarden`

Install the latest pre-compiled binary via the universal one-liner script:

```bash
curl -fsSL https://routewarden.github.io/install.sh | bash
```

Alternatively, run without installation using the multi-arch Docker image:

```bash
docker run --rm ghcr.io/routewarden/cli:latest version
```

### 2. Test a Sensitive Path

Simulate candidate path extraction and anti-evasion matching on an encoded exploit string:

```bash
rwarden test "/static/%252e%252e/.env"
```

Output:
```text
🔍 Testing: GET /static/%252e%252e/.env
  Candidate paths extracted (2):
    - /static/%252e%252e/.env
    - /.env

Result: 🛑 BLOCKED (HTTP Status 403)
  Reason:  block_pattern_match
  Target:  /.env
  Pattern: (?i)\.env
```

### 3. Validate Policy Offline

Verify your policy before committing or deploying:

```bash
rwarden validate routewarden.json
```

### 4. Launch the Security Dashboard

Start the live monitoring dashboard with automatic Docker gateway discovery:

```bash
rwarden dashboard
```

Open `http://127.0.0.1:9090` to observe live blocked probes, attack analytics, and threat intelligence.

---

## Documentation Sections

| Section | Description |
|:---|:---|
| [**Installation**](/cli/installation) | Install script, pre-built binary archives, Docker container, and source build |
| [**Commands Reference**](/cli/commands) | Complete CLI syntax and options for `test`, `validate`, `schema`, `generate`, and `sandbox` |
| [**Security Dashboard**](/cli/dashboard) | Live event streaming, Docker discovery, analytics, IP threat scoring, and REST API |
| [**JSON Schema & CI/CD**](/cli/schema) | IDE integration (VS Code, JetBrains, Neovim), `routewarden.json` workflows, and CI/CD pipelines |
| [**Changelog & Releases**](/cli/changelog) | Release notes and version history for `rwarden` |
