---
title: Security Observability Stack (Grafana, Loki & Alloy) — RouteWarden CLI
description: Turnkey cloud-native security dashboard and log parsing with Grafana, Loki, and Alloy for Traefik, Caddy, NGINX, and TCP Warden.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 0. Architecture Overview Mermaid & Diagram Snippet ─────────────────────
const mermaid_raw = `flowchart LR
    subgraph Gateways ["RouteWarden Gateways"]
        T["Traefik"]
        C["Caddy"]
        N["NGINX"]
        TCP["TCP Warden"]
    end

    subgraph Shipper ["Log Collector"]
        A["Grafana Alloy\\n(Container & File Discovery)"]
    end

    subgraph Engine ["Log Storage"]
        L["Grafana Loki\\n(LogQL Indexing)"]
    end

    subgraph UI ["Observability & SIEM"]
        G["Grafana\\n(Pre-configured Dashboard)"]
    end

    T -->|JSON logs| A
    C -->|JSON logs| A
    N -->|JSON logs| A
    TCP -->|JSON logs| A

    A -->|loki.write| L
    L -->|LogQL| G`

const arch_mermaid = buildSnippet({
  lang: 'mermaid',
  code: mermaid_raw,
})

const arch_graph_svg = `<div class="rw-graph-container">
  <svg viewBox="0 0 1280 272" fill="none" xmlns="http://www.w3.org/2000/svg" class="rw-graph-svg">
    <defs>
      <linearGradient id="grad-gateways" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6366f1" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#6366f1" stop-opacity="0.01"/>
      </linearGradient>
      <linearGradient id="grad-alloy" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.02"/>
      </linearGradient>
      <linearGradient id="grad-loki" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f97316" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#f97316" stop-opacity="0.02"/>
      </linearGradient>
      <linearGradient id="grad-grafana" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ec4899" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#ec4899" stop-opacity="0.02"/>
      </linearGradient>
      <!-- Arrow markers -->
      <marker id="arrow-indigo" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="10" markerHeight="10" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#6366f1"/>
      </marker>
      <marker id="arrow-amber" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="10" markerHeight="10" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#f59e0b"/>
      </marker>
      <marker id="arrow-orange" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="10" markerHeight="10" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#f97316"/>
      </marker>
    </defs>

    <!-- 1. GATEWAYS -->
    <rect x="12" y="12" width="200" height="248" rx="10" class="rw-g-box" fill="url(#grad-gateways)"/>
    <text x="24" y="32" class="rw-g-header">ROUTEWARDEN GATEWAYS</text>

    <rect x="22" y="44" width="180" height="44" rx="6" class="rw-g-node"/>
    <circle cx="38" cy="66" r="5" fill="#00a8cc"/>
    <text x="52" y="62" class="rw-g-title">Traefik</text>
    <text x="52" y="77" class="rw-g-desc">HTTP/S Reverse Proxy</text>

    <rect x="22" y="94" width="180" height="44" rx="6" class="rw-g-node"/>
    <circle cx="38" cy="116" r="5" fill="#14b8a6"/>
    <text x="52" y="112" class="rw-g-title">Caddy</text>
    <text x="52" y="127" class="rw-g-desc">Auto-HTTPS Gateway</text>

    <rect x="22" y="144" width="180" height="44" rx="6" class="rw-g-node"/>
    <circle cx="38" cy="166" r="5" fill="#10b981"/>
    <text x="52" y="162" class="rw-g-title">NGINX</text>
    <text x="52" y="177" class="rw-g-desc">OpenResty Lua Edge</text>

    <rect x="22" y="194" width="180" height="44" rx="6" class="rw-g-node"/>
    <circle cx="38" cy="216" r="5" fill="#6366f1"/>
    <text x="52" y="212" class="rw-g-title">TCP Warden</text>
    <text x="52" y="227" class="rw-g-desc">Layer 4 TCP &amp; UDP Shield</text>

    <!-- Connector 1: fan-in -> Alloy -->
    <circle cx="212" cy="66"  r="3.5" fill="#6366f1"/>
    <circle cx="212" cy="116" r="3.5" fill="#6366f1"/>
    <circle cx="212" cy="166" r="3.5" fill="#6366f1"/>
    <circle cx="212" cy="216" r="3.5" fill="#6366f1"/>
    <path d="M 212 66  C 245 66,  245 142, 265 142" stroke="#6366f1" stroke-width="2" fill="none" opacity="0.75"/>
    <path d="M 212 116 C 242 116, 245 142, 265 142" stroke="#6366f1" stroke-width="2" fill="none" opacity="0.75"/>
    <path d="M 212 166 C 242 166, 245 142, 265 142" stroke="#6366f1" stroke-width="2" fill="none" opacity="0.75"/>
    <path d="M 212 216 C 245 216, 245 142, 265 142" stroke="#6366f1" stroke-width="2" fill="none" opacity="0.75"/>
    <line x1="265" y1="142" x2="328" y2="142" stroke="#6366f1" stroke-width="3" marker-end="url(#arrow-indigo)"/>
    <rect x="237" y="116" width="70" height="22" rx="6" class="rw-g-pill"/>
    <text x="272" y="131" text-anchor="middle" class="rw-g-pill-txt" fill="#6366f1">JSON logs</text>

    <!-- 2. ALLOY -->
    <rect x="332" y="12" width="185" height="248" rx="10" class="rw-g-box" fill="url(#grad-alloy)"/>
    <text x="344" y="32" class="rw-g-header" fill="#d97706">LOG COLLECTOR</text>

    <rect x="342" y="44" width="165" height="198" rx="8" class="rw-g-card"/>
    <rect x="342" y="44" width="165" height="36" rx="8" fill="#f59e0b" fill-opacity="0.12"/>
    <circle cx="360" cy="62" r="6" fill="#f59e0b"/>
    <text x="372" y="67" class="rw-g-card-title">Grafana Alloy</text>

    <text x="354" y="102" class="rw-g-tag" fill="#d97706">OpenTelemetry Shipper</text>
    <text x="354" y="124" class="rw-g-item">• Docker socket discovery</text>
    <text x="354" y="143" class="rw-g-item">• loki.process JSON parse</text>
    <text x="354" y="162" class="rw-g-item">• Structured label index</text>
    <text x="354" y="181" class="rw-g-item">• UDP Syslog (1514/udp)</text>

    <rect x="354" y="200" width="141" height="24" rx="4" class="rw-g-port-box"/>
    <text x="424" y="216" text-anchor="middle" class="rw-g-port-txt">HTTP :12345 · UDP :1514</text>

    <!-- Connector 2: Alloy -> Loki -->
    <circle cx="517" cy="142" r="3.5" fill="#f59e0b"/>
    <line x1="517" y1="142" x2="633" y2="142" stroke="#f59e0b" stroke-width="3" marker-end="url(#arrow-amber)"/>
    <rect x="542" y="116" width="70" height="22" rx="6" class="rw-g-pill"/>
    <text x="577" y="131" text-anchor="middle" class="rw-g-pill-txt" fill="#d97706">loki.write</text>

    <!-- 3. LOKI -->
    <rect x="637" y="12" width="185" height="248" rx="10" class="rw-g-box" fill="url(#grad-loki)"/>
    <text x="649" y="32" class="rw-g-header" fill="#ea580c">LOG STORAGE</text>

    <rect x="647" y="44" width="165" height="198" rx="8" class="rw-g-card"/>
    <rect x="647" y="44" width="165" height="36" rx="8" fill="#f97316" fill-opacity="0.12"/>
    <circle cx="665" cy="62" r="6" fill="#f97316"/>
    <text x="677" y="67" class="rw-g-card-title">Grafana Loki</text>

    <text x="659" y="102" class="rw-g-tag" fill="#ea580c">High-Perf Chunk Storage</text>
    <text x="659" y="124" class="rw-g-item">• TSDB index &amp; retention</text>
    <text x="659" y="143" class="rw-g-item">• Fast stream metadata</text>
    <text x="659" y="162" class="rw-g-item">• LogQL query execution</text>
    <text x="659" y="181" class="rw-g-item">• Zero-config container</text>

    <rect x="659" y="200" width="141" height="24" rx="4" class="rw-g-port-box"/>
    <text x="729" y="216" text-anchor="middle" class="rw-g-port-txt">HTTP API :3100</text>

    <!-- Connector 3: Loki -> Grafana -->
    <circle cx="822" cy="142" r="3.5" fill="#f97316"/>
    <line x1="822" y1="142" x2="938" y2="142" stroke="#f97316" stroke-width="3" marker-end="url(#arrow-orange)"/>
    <rect x="847" y="116" width="70" height="22" rx="6" class="rw-g-pill"/>
    <text x="882" y="131" text-anchor="middle" class="rw-g-pill-txt" fill="#ea580c">LogQL</text>

    <!-- 4. GRAFANA -->
    <rect x="942" y="12" width="210" height="248" rx="10" class="rw-g-box" fill="url(#grad-grafana)"/>
    <text x="954" y="32" class="rw-g-header" fill="#db2777">OBSERVABILITY &amp; SIEM</text>

    <rect x="952" y="44" width="190" height="198" rx="8" class="rw-g-card"/>
    <rect x="952" y="44" width="190" height="36" rx="8" fill="#ec4899" fill-opacity="0.12"/>
    <circle cx="970" cy="62" r="6" fill="#ec4899"/>
    <text x="982" y="67" class="rw-g-card-title">Grafana</text>

    <text x="964" y="102" class="rw-g-tag" fill="#db2777">Security SIEM UI</text>
    <text x="964" y="124" class="rw-g-item">• Live Threat Matrix</text>
    <text x="964" y="143" class="rw-g-item">• GeoIP World Map</text>
    <text x="964" y="162" class="rw-g-item">• HTTP &amp; UDP metrics</text>
    <text x="964" y="181" class="rw-g-item">• Pre-built dashboard</text>

    <rect x="964" y="200" width="158" height="24" rx="4" class="rw-g-port-box"/>
    <text x="1043" y="216" text-anchor="middle" class="rw-g-port-txt">Web UI :3000</text>
  </svg>
</div>`

const archSnippets = computed(() => ({
  cli: [
    { filename: 'Architecture Graph', lang: 'mermaid', code: mermaid_raw, html: arch_graph_svg, hasDiff: false },
    { filename: 'Mermaid Source', lang: 'mermaid', code: arch_mermaid.cleanCode, html: arch_mermaid.html, hasDiff: false },
  ],
}))

// ─── 1. CLI Management Snippets ─────────────────────────────────────────────
const dashboard_up = buildSnippet({
  lang: 'bash',
  code: `# 1. Start the observability stack (launches Grafana at http://localhost:3000)
rwarden dashboard

# 2. Start on custom ports without auto-opening the browser
rwarden dashboard up --port 8080 --loki-port 3100 --no-open`,
})

const dashboard_status = buildSnippet({
  lang: 'bash',
  code: `# View running status of Grafana, Loki, and Alloy containers
rwarden dashboard status`,
})

const dashboard_down = buildSnippet({
  lang: 'bash',
  code: `# Stop the observability stack
rwarden dashboard down`,
})

const dashboard_export = buildSnippet({
  lang: 'bash',
  code: `# Export docker-compose.yml, config.alloy, and Grafana dashboard files to a local directory
rwarden dashboard export ./deploy/observability`,
})

const cliSnippets = computed(() => ({
  cli: [
    { filename: 'Launch Stack', lang: 'bash', code: dashboard_up.cleanCode, html: dashboard_up.html, hasDiff: false },
    { filename: 'Check Status', lang: 'bash', code: dashboard_status.cleanCode, html: dashboard_status.html, hasDiff: false },
    { filename: 'Stop Stack', lang: 'bash', code: dashboard_down.cleanCode, html: dashboard_down.html, hasDiff: false },
    { filename: 'Export Configs', lang: 'bash', code: dashboard_export.cleanCode, html: dashboard_export.html, hasDiff: false },
  ],
}))
</script>

# Security Observability Stack (Grafana, Loki & Alloy)

RouteWarden includes a complete, cloud-native security observability stack powered by **Grafana**, **Grafana Loki**, and **Grafana Alloy**.

It continuously ingests, parses, indexes, and visualizes structured security events across all your RouteWarden gateways (**Traefik**, **Caddy**, **NGINX**, and **TCP Warden**) with zero manual dashboard setup.

---

## Architecture Overview

<CodeViewer :snippets="archSnippets" />

### Core Components

1. **Grafana Alloy**: Modern OpenTelemetry-based collector. Discovers Docker containers via `/var/run/docker.sock` and host logs, normalizes RouteWarden JSON events (`loki.process`), extracts indexed stream labels (`verdict`, `status_code`, `gateway`, `method`, `protocol`, `transport`), and attaches structured metadata (`client_ip`, `path`, `matched_pattern`, `rule_id`, `service`).
2. **Grafana Loki**: Scalable, high-efficiency log aggregation engine that indexes metadata and provides lightning-fast LogQL queries.
3. **Grafana**: Pre-provisioned with the **"RouteWarden — Threat & Security Intelligence"** dashboard, pre-configured Loki data source, and ready-to-use threat panels.

---

## Quick Start CLI Management (`rwarden dashboard`)

The RouteWarden CLI embeds all Docker Compose, Alloy, and Grafana dashboard templates directly in the binary. You can launch, inspect, and stop the stack with single commands:

<CodeViewer :snippets="cliSnippets" />

---

## Dashboard Documentation Subsections

Explore the specialized guides below to configure logging, customize deployment, reuse existing infrastructure, or query events:

::: tip [Container Discovery & Opt-In Logging](/cli/dashboard/discovery-and-logging)
Configure container discovery via `/var/run/docker.sock`, understand the **pure opt-in model** (`routewarden.logs=true`), and inspect Layer 4 UDP protocol logs and network syslog (port 1514).
:::

::: tip [Pre-Configured Dashboard & Panels](/cli/dashboard/prebuilt-dashboard)
Detailed walkthrough of all built-in panels: KPI threat counters, multi-series attack timelines, top offender IPs with GeoIP flags, top probed targets, and interactive filter variables.
:::

::: tip [Standalone Docker Compose Deployment](/cli/dashboard/deployment)
Deploy in production without the CLI binary using standalone Docker Compose, configure `GF_*` environment variables, set up `docker-compose.override.yml`, and enable OAuth SSO (GitHub/Google).
:::

::: tip [Reusing an Existing Grafana & Loki Stack](/cli/dashboard/existing-stack)
Avoid redundant containers by importing the RouteWarden dashboard into your existing Grafana, integrating the parsing pipeline into your existing Alloy or Promtail, or running a lightweight shipper-only container.
:::

::: tip [LogQL Queries & Alerting Reference](/cli/dashboard/logql-reference)
LogQL cheat sheet for security operations (SOC), stream label specifications, high-cardinality metadata reference, and ready-to-use Grafana alert rule definitions.
:::

---

## Command Reference

| Subcommand / Flag | Type | Default | Description |
|:---|:---|:---|:---|
| `up` | subcommand | — | Launch Grafana, Loki, and Alloy stack via Docker Compose (default) |
| `down` | subcommand | — | Stop and tear down running observability stack containers |
| `status` | subcommand | — | Display status of Grafana, Loki, and Alloy containers |
| `export [dir]` | subcommand | `./observability` | Export compose, Alloy, and Grafana configs to disk |
| `--port` | int | `3000` | Port for Grafana dashboard UI |
| `--loki-port` | int | `3100` | Port for Loki log engine |
| `--dir` | string | `~/.routewarden/observability` | Working directory storing the stack files |
| `--no-open` | bool | `false` | Do not automatically launch the browser upon startup |
