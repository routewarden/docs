---
title: Pre-Configured Dashboard & Panels — RouteWarden Dashboard
description: Comprehensive breakdown of the pre-configured Grafana threat intelligence dashboard, visualization panels, metric widgets, and interactive filters.
---

# Pre-Configured Dashboard & Panels

RouteWarden comes with an out-of-the-box, professionally crafted Grafana dashboard (**"RouteWarden — Threat & Security Intelligence"**, embedded in `routewarden-overview.json`). It provisions automatically when launching the stack via `rwarden dashboard` or Docker Compose.

---

## Key Dashboard Panels

### 1. Key Security Counters (KPI Widgets)

At the top of the dashboard, four high-visibility stat panels provide an immediate posture overview:

- **Blocked Attacks**: Total number of malicious requests or probes intercepted by RouteWarden within the selected time window. Rendered in vivid threat red.
- **Total Inspected Events**: Complete volume of gateway traffic evaluated against RouteWarden security rules.
- **Whitelist Bypasses**: Legitimate traffic successfully bypassing checks via trusted IP CIDRs or bypass headers.
- **Attack Ratio (%)**: Percentage calculation of hostile requests relative to total traffic (`(Blocked / Total) * 100`). Gives immediate insight into active DDoS or brute-force campaigns.

---

### 2. Attack Timelines (Multi-Series Time Graph)

Visualizes threat activity across time:
- **`BLOCK` Series (Red)**: Attacks blocked by sensitive path detection, regex signatures, anti-evasion traps, or IP denies.
- **`ALLOW` Series (Green)**: Clean traffic permitted to reach backend application services.
- **`THROTTLED` Series (Amber)**: Requests delayed via tarpit or rate-limited before downstream forwarding.
- **`BYPASS` Series (Blue)**: Requests originating from trusted internal CIDRs or verified reverse proxy hops.

Spikes in red indicate port scanning, credential stuffing, or vulnerability scanner activity (such as Nuclei, Nikto, or sqlmap).

---

### 3. Verdict & Status Code Distribution

Two donut graphs illustrate your traffic breakdown:
- **Verdict Distribution**: Quick proportion breakdown of `BLOCK` vs `ALLOW` vs `THROTTLED`.
- **Status Code Distribution**: Shows HTTP status codes returned by the gateway (e.g. `403 Forbidden`, `404 Not Found`, `429 Too Many Requests`, `200 OK`).

---

### 4. Top Attacked Targets (Target URIs)

A horizontal bar chart listing the most heavily probed paths and endpoints across all protected web applications:
- `/.env`, `/.git/config`, `/.aws/credentials`
- `/wp-login.php`, `/xmlrpc.php`, `/administrator`
- `/actuator/health`, `/actuator/env`, `/metrics`
- `/phpmyadmin/`, `/pma/`, `/admin.php`

This reveals automated reconnaissance tooling attempting to locate leaked credentials or misconfigured administrative interfaces.

---

### 5. Top Offender IPs & GeoIP

A ranked bar chart displaying the top client IP addresses responsible for blocked attacks:
- Automatically resolved against GeoIP country database (e.g. `US`, `DE`, `CN`, `LAN`).
- Displays country name and country flag emoji (e.g. 🇩🇪 Germany, 🇺🇸 United States, 🏠 Local Network).
- Highlights repeat offenders to facilitate upstream firewall bans (e.g. via Cloudflare, AWS WAF, or CrowdSec).

---

### 6. Top Triggered Signatures & Rules

Identifies which defense rules are firing most frequently:
- **Sensitive Files Rule**: Hits on hidden files, source control folders, and configuration backups.
- **Path Traversal Rule**: Directory escape attempts (e.g. `../..`, `%252e%252e`).
- **SQLi / Injection Patterns**: Attempts to pass malicious payloads into URI queries or paths.
- **Protocol Violations**: Layer 4 triggers such as DNS query flood or SSH dictionary attacks.

---

### 7. Live Security Event Feed (Real-Time SIEM Log)

A dedicated log viewer streaming security events with zero latency:
- Automatically colored based on severity: **WARN/ERROR** for blocks, **INFO** for standard bypasses.
- Expands to show full structured metadata for any event:
  - Exact timestamp (nanosecond precision)
  - Ingress Gateway (`traefik`, `caddy`, `nginx`, `tcp-warden`)
  - Client IP & Country Code
  - Request Path & HTTP Method
  - Response Mode executed (e.g. `silentDrop`, `tarpit`, `gzipBomb`, `fakeSuccess`, `json`)
  - Triggered Pattern or Reason

---

## Interactive Filters & Template Variables

The dashboard includes top-bar interactive dropdowns that dynamically alter all queries without editing panels:

| Filter Variable | Options | Description |
|:---|:---|:---|
| **Gateway** | `All`, `traefik`, `caddy`, `nginx`, `tcp-warden` | Filter logs to a specific reverse proxy or Layer 4 daemon |
| **Verdict** | `All`, `BLOCK`, `ALLOW`, `THROTTLED` | Focus exclusively on hostile attacks or audit permitted flows |
| **Time Range** | Last 5m, 15m, 1h, 6h, 24h, 7d | Adjust time resolution for real-time triage or historical audits |
| **Auto-Refresh** | Off, 5s, 10s, 30s, 1m | Real-time monitoring mode for Security Operations Centers (SOC) |
