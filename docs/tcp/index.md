---
title: TCP Warden — Protocol-Aware L4 Security Proxy & Firewall
description: High-performance Layer 4 reverse proxy, rate limiter, protocol firewall, and honeypot for non-HTTP infrastructure services.
---

# RouteWarden TCP Warden

<p class="tagline" style="font-size: 1.25rem; color: var(--vp-c-text-2); margin-bottom: 1.5rem;">
Ultra-fast, protocol-aware Layer 4 reverse proxy, connection rate limiter, brute-force firewall, and modular protocol inspector built with Go.
</p>

::: tip Core Highlights
* **8-Stage L4 Pipeline**: Concurrency limits, Failure tracker, CIDR filtering, Geo-blocking, Token-bucket rate limiting, Protocol inspection, Tarpit/Drop responses, and Security auditing.
* **Standard Built-in Protocols**: Native deep inspection for **SSH** (v1 rejection, banner customization, credential monitoring), **SMTP** (domain blocklists, STARTTLS enforcement), **POP3**, **IMAP**, and generic **TCP**.
* **Decoupled Modular Plugins**: 14 official protocol inspectors for **HTTP**, **PostgreSQL**, **MySQL**, **Redis**, **MongoDB**, **Memcached**, **AMQP**, **LDAP**, **VNC**, **FTP**, **TLS SNI**, **MQTT**, and **Minecraft** ship in the dedicated [`routewarden/plugins`](https://github.com/routewarden/plugins) repository.
* **CrowdSec LAPI Bouncer**: Native real-time integration with CrowdSec Local API for automated collaborative IP banning.
* **Management & SSE Observability**: REST endpoints and live Server-Sent Events stream (`/events`) on port `:9091`.
* **Zero External Dependencies**: Single static Go binary or lightweight Alpine container (`~25MB`) with Docker volume persistence.
:::

---

## Architecture & Pipeline

Unlike traditional L4 proxies like HAProxy or NGINX Stream that treat TCP streams as opaque byte buffers, RouteWarden TCP Warden implements an **8-stage protocol-aware pipeline**:

```
[Inbound Client Connection]
           │
           ▼
[Stage 1: Concurrency Limiting] ───────► (Exceeded: Instant Drop/Reject)
           │
           ▼
[Stage 2: Failure Tracker & Banlist] ──► (Banned IP: Tarpit or Drop)
           │
           ▼
[Stage 3: CrowdSec Real-Time Cache] ──► (CrowdSec Decision: Ban/Throttle)
           │
           ▼
[Stage 4: IP Filter (Allow / Deny)] ───► (Subnet Denied: Terminate)
           │
           ▼
[Stage 5: Geo-Blocking (Country MMDB)] ► (Country Denied: Terminate)
           │
           ▼
[Stage 6: Rate Limiting (Token Bucket)]► (Burst Exceeded: Reject)
           │
           ▼
[Stage 7: Protocol Validation & Upstream]
           │
           ├─► Standard: SSH / SMTP / POP3 / IMAP / TCP
           └─► Modular Plugin: Postgres, MySQL, Redis, TLS SNI, etc.
           │
           ▼
[Stage 8: Metrics, Events & Audit Log] ──► (JSONL Audit Log + SSE Stream)
```

### Pipeline Stages Explained

| Stage | Name | Description |
| :--- | :--- | :--- |
| **Stage 1** | **Concurrency Limiting** | Enforces `global.max_connections` (e.g., 10,000) using atomic counters to prevent resource starvation. |
| **Stage 2** | **Failure Tracker & Banlist** | Thread-safe in-memory banlist tracking consecutive authentication failures within sliding time windows. Bans offenders for configured durations. |
| **Stage 3** | **CrowdSec LAPI Sync** | Interrogates local CrowdSec bouncer cache for active community remediation decisions (ban, throttle, bypass). |
| **Stage 4** | **IP Filtering** | Fast IPv4 and IPv6 subnet checking using `net.IPNet` allowlists and denylists. |
| **Stage 5** | **Geo-Blocking** | Fast lookup against MaxMind GeoLite2 databases to enforce country-level access policies. |
| **Stage 6** | **Token-Bucket Rate Limiter** | Per-client connection throttling with configurable connections-per-minute and burst allowance. |
| **Stage 7** | **Protocol Inspection** | Performs state-machine protocol analysis (e.g. SSL negotiation, SASL, ClientHello SNI) before establishing bidirectional proxying. |
| **Stage 8** | **Audit Logging & SSE** | Emits structured JSONL audit events and broadcasts real-time security events over Server-Sent Events (`:9091/events`). |

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

const quick_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  tcp-warden:
    image: routewarden/tcp-warden:latest
    container_name: tcp-warden
    restart: unless-stopped
    network_mode: host
    volumes:
      - tcp-warden-config:/etc/routewarden # [!code ++]
      - tcp-warden-plugins:/var/lib/routewarden/plugins # [!code ++]
      - tcp-warden-logs:/var/log/routewarden # [!code ++]

volumes:
  tcp-warden-config:
  tcp-warden-plugins:
  tcp-warden-logs:`
})

const quick_yaml = buildSnippet({
  lang: 'yaml',
  code: `# yaml-language-server: $schema=https://routewarden.github.io/tcp-warden/tcp-warden.schema.json
global:
  max_connections: 10000
  audit_log: /var/log/routewarden/tcp-warden.jsonl

services:
  ssh-bastion: # [!code ++]
    listen: ":2222" # [!code ++]
    upstream: "127.0.0.1:22" # [!code ++]
    protocol: ssh # [!code ++]
    rate_limit: # [!code ++]
      connections_per_minute: 10 # [!code ++]
      burst: 5 # [!code ++]
    failure_tracker: # [!code ++]
      max_failures: 5 # [!code ++]
      window: 10m # [!code ++]
      ban_duration: 1h # [!code ++]

  postgres-cluster: # [!code ++]
    listen: ":5432" # [!code ++]
    upstream: "10.0.0.15:5432" # [!code ++]
    protocol: postgres # [!code ++]`
})

const quick_cli = buildSnippet({
  lang: 'bash',
  code: `# 1. Start daemon in Docker Compose
docker compose up -d

# 2. Check service status and active connections
docker compose exec tcp-warden tcp-warden status

# 3. Install Postgres protocol inspector plugin on demand
docker compose exec tcp-warden tcp-warden plugins install postgres

# 4. Stream real-time connection events
curl -N http://127.0.0.1:9091/events`
})

const quickStartSnippets = computed(() => ({
  tcp: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: quick_compose.cleanCode, html: quick_compose.html, hasDiff: quick_compose.hasDiff },
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: quick_yaml.cleanCode, html: quick_yaml.html, hasDiff: quick_yaml.hasDiff },
    { filename: 'CLI & Docker', lang: 'bash', code: quick_cli.cleanCode, html: quick_cli.html, hasDiff: quick_cli.hasDiff },
  ]
}))
</script>

---

## 30-Second Quick Start

Deploy and configure TCP Warden in seconds:

<CodeViewer :snippets="quickStartSnippets" />

---

## Quick Navigation

<div class="tip custom-block" style="padding-top: 8px">

- **[Getting Started & Docker](./getting-started)**: Installation, running in Docker Compose with named volumes, and first-run setup.
- **[Configuration Reference](./configuration)**: Complete syntax for `tcp-warden.yaml`, port ranges, and global options.
- **[Modular Protocol Plugins](./plugins)**: Discovering, installing, and configuring official plugins from `routewarden/plugins`.
- **[Plugin Development Guide](./plugin-development)**: Build, test, and integrate custom Layer 4 protocol inspectors.
- **[CrowdSec Integration](./crowdsec)**: Hooking up CrowdSec LAPI, detection scenarios, and remediation actions.
- **[Management API & SSE](./api)**: Querying metrics, monitoring live connection streams, and health checks.
- **[CLI Reference](./cli)**: Command-line syntax for `run`, `validate`, `plugins`, `ban`, and `status`.

</div>
