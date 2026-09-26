---
title: TCP Warden Configuration Reference
description: Comprehensive configuration reference for tcp-warden.yaml, including rate limiting, geo-blocking, protocol guards, and JSON schema validation.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Global Schema Snippet ───────────────────────────────────────────────────
const global_schema = buildSnippet({
  lang: 'yaml',
  code: `# yaml-language-server: $schema=https://routewarden.github.io/tcp-warden/tcp-warden.schema.json

global:
  max_connections: 10000
  ban_duration: "1h"
  ban_after_failures: 5
  tarpit_ms: 1000
  log_level: "info"
  log_file: "/var/log/routewarden/tcp-warden.jsonl"
  geoip_db: "/etc/routewarden/GeoLite2-Country.mmdb"
  ip_filter:
    allow:
      - "127.0.0.1/32"
      - "10.0.0.0/8"
    deny:
      - "198.51.100.0/24"
  geo_block:
    deny_countries:
      - "KP"
    allow_countries: []

api:
  enabled: true
  listen: "127.0.0.1:9091"
  auth_token: "\${ROUTEWARDEN_API_TOKEN}"

crowdsec:
  enabled: true
  lapi_url: "http://127.0.0.1:8080"
  api_key: "\${CROWDSEC_API_KEY}"
  update_frequency: "10s"
  fallback_action: "ban"

plugins:
  postgres:
    enabled: true
    source: "https://github.com/routewarden/plugins/postgres"
  redis:
    enabled: true
    source: "https://github.com/routewarden/plugins/redis"
  tls_sni:
    enabled: true
    source: "https://github.com/routewarden/plugins/tls_sni"`
})

// ─── Services Examples ────────────────────────────────────────────────────────
const ssh_service = buildSnippet({
  lang: 'yaml',
  code: `services:
  ssh_bastion:
    listen: ":2222"
    upstream: "127.0.0.1:22"
    protocol: "ssh"
    rate_limit:
      connections_per_minute: 20
      burst: 5
    ip_filter:
      allow:
        - "10.0.0.0/8"
        - "192.168.1.0/24"
      deny: []
    geo_block:
      deny_countries:
        - "RU"
        - "CN"
      allow_countries: []
    max_auth_failures: 3
    ban_after_failures: 3
    ban_duration: "2h"
    response:
      mode: "reject"
    ssh:
      banner: "RouteWarden SSH Guard"
      max_auth_tries: 3`
})

const smtp_service = buildSnippet({
  lang: 'yaml',
  code: `services:
  mail_guard:
    listen: ":2525"
    upstream: "127.0.0.1:25"
    protocol: "smtp"
    smtp:
      require_starttls: true
      max_recipients: 50
      blocked_sender_domains:
        - "*.tempmail.com"
        - "spam.org"`
})

const port_range_service = buildSnippet({
  lang: 'yaml',
  code: `services:
  # 1:1 Port Range Mapping (8000 -> 9000, 8001 -> 9001, ..., 8005 -> 9005)
  microservices_1to1:
    listen: ":8000-8005"
    upstream: "10.0.0.10:9000-9005"
    protocol: "tcp"

  # Many-to-One Port Mapping (all ports 8080..8085 route to backend port 80)
  http_gateway_many_to_one:
    listen: ":8080-8085"
    upstream: "10.0.0.20:80"
    protocol: "http"
    plugin_config:
      blocked_paths:
        - "^/admin(/.*)?$"
        - "\\.(env|git|bak|sql)$"
      blocked_headers:
        User-Agent: "(?i)(sqlmap|nikto|acunetix)"`
})

const db_service = buildSnippet({
  lang: 'yaml',
  code: `services:
  db_proxy:
    listen: ":5432"
    upstream: "10.0.0.15:5432"
    protocol: "postgres"
    max_auth_failures: 5
    ban_after_failures: 5
    ban_duration: "1h"

  cache_proxy:
    listen: ":6380"
    upstream: "127.0.0.1:6379"
    protocol: "redis"
    plugin_config:
      blocked_commands:
        - "FLUSHALL"
        - "FLUSHDB"
        - "CONFIG"
        - "SHUTDOWN"`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'Full Schema', lang: 'yaml', code: global_schema.cleanCode, html: global_schema.html, hasDiff: false },
    { filename: 'Port Ranges & HTTP', lang: 'yaml', code: port_range_service.cleanCode, html: port_range_service.html, hasDiff: false },
    { filename: 'SSH Guard', lang: 'yaml', code: ssh_service.cleanCode, html: ssh_service.html, hasDiff: false },
    { filename: 'DB & Redis Guard', lang: 'yaml', code: db_service.cleanCode, html: db_service.html, hasDiff: false },
    { filename: 'SMTP Guard', lang: 'yaml', code: smtp_service.cleanCode, html: smtp_service.html, hasDiff: false },
  ]
}))

// ─── Port Range Snippets ────────────────────────────────────────────────────
const port_range_1to1 = buildSnippet({
  lang: 'yaml',
  code: `services:
  # 1:1 Port Range: each ingress port maps to an offset on upstream
  # Port 8000 -> 9000, 8001 -> 9001, ..., 8005 -> 9005
  microservice_fleet:
    listen: ":8000-8005"
    upstream: "10.0.0.10:9000-9005"
    protocol: "tcp"`
})

const port_range_many_to_one = buildSnippet({
  lang: 'yaml',
  code: `services:
  # Many-to-One Port Range: all ingress ports route to a single backend
  # Ports 8080..8085 all forward into a single HTTP gateway or proxy
  http_gateway_fleet:
    listen: ":8080-8085"
    upstream: "10.0.0.20:80"
    protocol: "http"
    plugin_config:
      blocked_paths:
        - "^/admin(/.*)?$"
        - "\\.(env|git|bak|sql)$"
      blocked_headers:
        User-Agent: "(?i)(sqlmap|nikto|acunetix)"`
})

const portRangeSnippets = computed(() => ({
  tcp: [
    { filename: '1:1 Port Mapping', lang: 'yaml', code: port_range_1to1.cleanCode, html: port_range_1to1.html, hasDiff: false },
    { filename: 'Many-to-One Mapping', lang: 'yaml', code: port_range_many_to_one.cleanCode, html: port_range_many_to_one.html, hasDiff: false },
  ]
}))

// ─── Validate Snippets ────────────────────────────────────────────────────────
const validate_cmd = buildSnippet({
  lang: 'bash',
  code: `# Validate config syntax, CIDRs, duplicate ports, and plugin dependencies
tcp-warden validate --config /etc/routewarden/tcp-warden.yaml

# Output:
# ✓ Configuration /etc/routewarden/tcp-warden.yaml is valid!
#   • Global Max Connections: 10000
#   • Services Configured:    4
#   • CrowdSec Enabled:       true`
})

const validate_docker = buildSnippet({
  lang: 'bash',
  code: `# Run validation inside a running Docker container
docker compose exec tcp-warden tcp-warden validate --config /etc/routewarden/tcp-warden.yaml`
})

const validateSnippets = computed(() => ({
  tcp: [
    { filename: 'CLI Command', lang: 'bash', code: validate_cmd.cleanCode, html: validate_cmd.html, hasDiff: false },
    { filename: 'Docker Compose', lang: 'bash', code: validate_docker.cleanCode, html: validate_docker.html, hasDiff: false },
  ]
}))

// ─── Schema Auto-Completion Snippets ─────────────────────────────────────────
const schema_inline = buildSnippet({
  lang: 'yaml',
  code: `# yaml-language-server: $schema=https://routewarden.github.io/tcp-warden/tcp-warden.schema.json

global:
  max_connections: 10000

services:
  ssh_bastion:
    listen: ":2222"
    upstream: "127.0.0.1:22"`
})

const schema_vscode = buildSnippet({
  lang: 'json',
  code: `{
  "yaml.schemas": {
    "https://routewarden.github.io/tcp-warden/tcp-warden.schema.json": "tcp-warden*.yaml"
  }
}`
})

const schemaSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: schema_inline.cleanCode, html: schema_inline.html, hasDiff: false },
    { filename: '.vscode/settings.json', lang: 'json', code: schema_vscode.cleanCode, html: schema_vscode.html, hasDiff: false },
  ]
}))
</script>

# Configuration Reference

TCP Warden is configured via a single declarative YAML file (default: `tcp-warden.yaml`).

::: tip Schema Auto-Completion
Enable real-time autocomplete, tooltips, and validation in VS Code or JetBrains editors by adding the JSON Schema header at the top of your YAML file or mapping it in your workspace settings:

<CodeViewer :snippets="schemaSnippets" />
:::

---

## Configuration Schema

Full reference with global policy defaults, management API, CrowdSec integration, plugin declarations, and service definitions:

<CodeViewer :snippets="configSnippets" />

---

## Global Settings (`global`)

Daemon-wide defaults for connection limits, ban rules, and logging.

| Setting | Type | Default | What it means |
| :--- | :--- | :--- | :--- |
| `max_connections` | `int` | `10000` | Total active connections allowed across all services at once. |
| `ban_duration` | `duration` | `"1h"` | How long an offending IP stays banned (e.g., `"1h"`, `"24h"`). |
| `ban_after_failures` | `int` | `5` | Failed attempts within the sliding window before an IP is banned. |
| `tarpit_ms` | `int` | `1000` | Milliseconds to stall banned or challenged connections before closing. |
| `log_level` | `string` | `"info"` | Log verbosity: `debug`, `info`, `warn`, or `error`. |
| `log_file` | `string` | — | Path to JSONL audit log file (leave empty to log to stdout). |
| `geoip_db` | `string` | — | Path to MaxMind GeoLite2 Country database (`.mmdb`). |
| `ip_filter.allow` | `[]CIDR` | `[]` | Subnets that are always allowed (e.g. `["10.0.0.0/8"]`). |
| `ip_filter.deny` | `[]CIDR` | `[]` | Subnets that are always blocked immediately. |
| `geo_block.deny_countries` | `[]string` | `[]` | Two-letter country codes to block (e.g. `["KP"]`). |

---

## Management API (`api`)

Settings for the local HTTP administration and metrics server (port `9091`).

| Setting | Type | Default | What it means |
| :--- | :--- | :--- | :--- |
| `enabled` | `bool` | `true` | Turns the management HTTP server on or off. |
| `listen` | `string` | `"127.0.0.1:9091"` | Address and port to bind for management API requests. |
| `auth_token` | `string` | — | Optional secret token required in the `Authorization` header. |

---

## CrowdSec Bouncer (`crowdsec`)

Connects TCP Warden to your CrowdSec Local API (LAPI) to automatically block malicious IPs.

| Setting | Type | Default | What it means |
| :--- | :--- | :--- | :--- |
| `enabled` | `bool` | `false` | Enables real-time CrowdSec ban enforcement. |
| `lapi_url` | `string` | — | URL of your CrowdSec instance (e.g. `"http://127.0.0.1:8080"`). |
| `api_key` | `string` | — | Bouncer API key generated via `cscli bouncers add`. |
| `update_frequency` | `duration` | `"10s"` | How often to refresh active ban decisions from CrowdSec. |
| `fallback_action` | `string` | `"ban"` | Action when an IP is flagged: `ban`, `throttle`, or `bypass`. |

---

## Services (`services`)

Each key under `services` defines an isolated Layer 4 proxy listener. Common service fields:

| Field | Type | Description |
| :--- | :--- | :--- |
| `listen` | `string` | Single port (`":2222"`) or port range (`":8000-8005"`). |
| `upstream` | `string` | Backend target: single address (`"127.0.0.1:22"`), single backend for many-to-one ranges (`"10.0.0.1:80"`), or matching 1:1 range (`"10.0.0.1:9000-9005"`). |
| `protocol` | `string` | Protocol handler: `ssh`, `smtp`, `pop3`, `imap`, `tcp`, or any loaded plugin name (`http`, `postgres`, `redis`, `mongodb`, etc.). |
| `plugin_config` | `map` | Protocol-specific inspector options passed directly to the active plugin. |
| `rate_limit.connections_per_minute` | `int` | Token-bucket rate: connections allowed per minute per IP. |
| `rate_limit.burst` | `int` | Maximum burst allowance above the rate limit. |
| `max_auth_failures` | `int` | Maximum auth failures before banning the client IP. |
| `ban_duration` | `duration` | Overrides `global.ban_duration` for this service. |
| `response.mode` | `string` | Rejection strategy: `reject` | `drop` | `tarpit` | `silent`. |

---

## Port Range Forwarding

TCP Warden supports listening on continuous port ranges:

- **1:1 Port Mapping**: Each incoming port forwards directly to its corresponding port on the upstream target.
- **Many-to-One Port Mapping**: An entire range of ingress ports forwards into a single backend (ideal for HTTP gateways and proxy fleets).

<CodeViewer :snippets="portRangeSnippets" />

---

## Plugin Configuration (`plugin_config`)

When using a modular plugin from `routewarden/plugins`, use `plugin_config` to customize the inspector's behavior:

| Plugin | Key Options | Example Usage |
| :--- | :--- | :--- |
| **`http`** | `allowed_hosts`, `blocked_paths` (regex), `blocked_headers` (regex) | Intercept sensitive paths (`/\.env`), block scanner User-Agents. |
| **`redis`** | `blocked_commands` | Intercept destructive commands (`FLUSHALL`, `CONFIG`, `SHUTDOWN`). |
| **`mongodb`** | `blocked_ops` | Intercept collection drops (`drop`, `dropDatabase`, `shutdown`). |
| **`tls_sni`** | `allowed_domains`, `blocked_domains` | Filter TLS SNI domain names with wildcard support (`*.example.com`). |
| **`mqtt`** | `max_client_id_len`, `blocked_client_prefixes` | Enforce IoT device naming standards and block scanner prefixes. |
| **`minecraft`** | `blocked_protocol_versions` | Reject outdated or vulnerable game client versions. |


---

## Response Actions (`response.mode`)

Choose how TCP Warden handles blocked or challenged connections:

| Mode | What it does | Best used for |
| :--- | :--- | :--- |
| `reject` | Closes the connection immediately with a TCP RST. | Clean, fast rejection with zero latency. |
| `drop` | Closes the socket silently without sending any data. | Hiding services from automated port scanners. |
| `tarpit` | Stalls the connection for `tarpit_ms` before closing. | Slowing down aggressive scanners and wasting bot concurrency. |
| `silent` | Terminates without writing to logs or events. | Silently discarding high-volume spoofed traffic. |

---

## Configuration Validation

Always validate your configuration file before starting or reloading the proxy daemon:

<CodeViewer :snippets="validateSnippets" />

