---
title: Log Levels — TCP Warden
description: Configure TCP Warden operational verbosity and security event JSONL filtering with the log_level setting. Understand the two log streams and how each level affects them.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Level Reference Table (code block for visual clarity) ─────────────────
const level_overview = buildSnippet({
  lang: 'yaml',
  code: `global:
  # Accepted values (case-insensitive):
  #   debug | info | warn | error | off
  log_level: "warn"   # default`
})

const levelSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: level_overview.cleanCode, html: level_overview.html, hasDiff: false },
  ]
}))

// ─── Per-level examples ─────────────────────────────────────────────────────
const debug_cfg = buildSnippet({
  lang: 'yaml',
  code: `global:
  log_level: "debug"
  log_file: "/var/log/routewarden/tcp-warden.jsonl"`
})

const info_cfg = buildSnippet({
  lang: 'yaml',
  code: `global:
  # "info" includes routine operational status and all connection events.
  log_level: "info"
  log_file: "/var/log/routewarden/tcp-warden.jsonl"`
})

const warn_cfg = buildSnippet({
  lang: 'yaml',
  code: `global:
  # "warn" is the default setting.
  # Suppresses high-volume "allowed" events and keeps the JSONL feed
  # focused on meaningful security signals: blocked connections and
  # authentication failures. Recommended for production and CrowdSec.
  log_level: "warn"
  log_file: "/var/log/routewarden/tcp-warden.jsonl"`
})

const error_cfg = buildSnippet({
  lang: 'yaml',
  code: `global:
  # "error" retains only "blocked" events in the JSONL stream.
  # Daemon warnings (plugin failures, API errors, etc.) are suppressed.
  # Use when you only care about raw block/ban decisions, not auth failures.
  log_level: "error"
  log_file: "/var/log/routewarden/tcp-warden.jsonl"`
})

const off_cfg = buildSnippet({
  lang: 'yaml',
  code: `global:
  # "off" silences all output — both operational messages and JSONL events.
  # Use only in test harnesses or when external tooling manages all logging.
  log_level: "off"`
})

const exampleSnippets = computed(() => ({
  tcp: [
    { filename: 'debug', lang: 'yaml', code: debug_cfg.cleanCode, html: debug_cfg.html, hasDiff: false },
    { filename: 'info', lang: 'yaml', code: info_cfg.cleanCode, html: info_cfg.html, hasDiff: false },
    { filename: 'warn (default)', lang: 'yaml', code: warn_cfg.cleanCode, html: warn_cfg.html, hasDiff: false },
    { filename: 'error', lang: 'yaml', code: error_cfg.cleanCode, html: error_cfg.html, hasDiff: false },
    { filename: 'off', lang: 'yaml', code: off_cfg.cleanCode, html: off_cfg.html, hasDiff: false },
  ]
}))

// ─── JSONL event examples ────────────────────────────────────────────────────
const allowed_event = buildSnippet({
  lang: 'json',
  code: `{"type":"security_event","timestamp":"2026-09-30T09:42:11.320Z","plugin":"tcp-warden","service":"ssh_bastion","protocol":"ssh","client_ip":"10.0.0.5","country_code":"LAN","flag_emoji":"🏠","action":"allowed","reason":"session_complete","bytes_in":2048,"bytes_out":1024,"duration_ms":3201}`
})

const auth_failure_event = buildSnippet({
  lang: 'json',
  code: `{"type":"security_event","timestamp":"2026-09-30T09:42:31.005Z","plugin":"tcp-warden","service":"ssh_bastion","protocol":"ssh","client_ip":"203.0.113.42","country_code":"CN","country_name":"China","flag_emoji":"🇨🇳","action":"auth_failure","reason":"attempt 2/5","bytes_in":512,"bytes_out":256,"duration_ms":122}`
})

const blocked_event = buildSnippet({
  lang: 'json',
  code: `{"type":"security_event","timestamp":"2026-09-30T09:43:10.881Z","plugin":"tcp-warden","service":"ssh_bastion","protocol":"ssh","client_ip":"198.51.100.9","country_code":"RU","country_name":"Russia","flag_emoji":"🇷🇺","action":"blocked","reason":"banned: max_auth_failures_exceeded (5)","duration_ms":0}`
})

const eventSnippets = computed(() => ({
  tcp: [
    { filename: 'action: allowed', lang: 'json', code: allowed_event.cleanCode, html: allowed_event.html, hasDiff: false },
    { filename: 'action: auth_failure', lang: 'json', code: auth_failure_event.cleanCode, html: auth_failure_event.html, hasDiff: false },
    { filename: 'action: blocked', lang: 'json', code: blocked_event.cleanCode, html: blocked_event.html, hasDiff: false },
  ]
}))

// ─── docker-compose env override ────────────────────────────────────────────
const env_override = buildSnippet({
  lang: 'yaml',
  code: `services:
  tcp-warden:
    image: ghcr.io/routewarden/tcp-warden:latest
    environment:
      - ROUTEWARDEN_LOG_LEVEL=warn   # overrides log_level in tcp-warden.yaml`
})

const envSnippets = computed(() => ({
  tcp: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: env_override.cleanCode, html: env_override.html, hasDiff: false },
  ]
}))

// ─── Startup banner ─────────────────────────────────────────────────────────
const startup_banner = buildSnippet({
  lang: 'plaintext',
  code: `🛡️  Starting TCP Warden...
   Config:     /etc/routewarden/tcp-warden.yaml
   Services (3):
     • ssh_bastion  [ssh]   :2222 -> 127.0.0.1:22 (enabled)
     • db_proxy     [postgres]  :5432 -> 10.0.0.15:5432 (enabled)
     • cache        [redis]  :6380 -> 127.0.0.1:6379 (enabled)
   Log file:   /var/log/routewarden/tcp-warden.jsonl
   Log level:  warn`
})

const bannerSnippets = computed(() => ({
  tcp: [
    { filename: 'Terminal', lang: 'plaintext', code: startup_banner.cleanCode, html: startup_banner.html, hasDiff: false },
  ]
}))
</script>

# Log Levels

TCP Warden uses a single `log_level` setting to control the verbosity of **both** its logging subsystems simultaneously.

<CodeViewer :snippets="levelSnippets" />

---

## Two Independent Log Streams

TCP Warden produces two distinct categories of log output, both gated by `log_level`:

| Stream | Format | Destination | Purpose |
| :--- | :--- | :--- | :--- |
| **Operational logs** | Human-readable text | `stderr` | Startup banners, plugin status, API listener confirmations, daemon warnings |
| **Security events** | Structured JSONL | `stdout` + `log_file` | Per-connection audit records consumed by CrowdSec, dashboards, and SIEMs |

Both streams respect `log_level` independently: operational messages below the threshold are dropped from `stderr`, and security events with actions below the threshold are never written to `stdout` or `log_file`.

---

## Level Reference

| Level | Operational logs | Security events written | Typical use case |
| :---: | :--- | :--- | :--- |
| `debug` | All messages including internal trace | All events (`allowed`, `auth_failure`, `blocked`) | Local development, troubleshooting |
| `info` | Operational status, plugin status, API listeners | All events (`allowed`, `auth_failure`, `blocked`) | Detailed traffic auditing |
| `warn` | **Default.** Warnings and errors only (plugin failures, sync errors) | `auth_failure` and `blocked` events only | **Standard production deployments & CrowdSec** |
| `error` | Errors only | `blocked` and `banned` events only | High-traffic servers; minimal log volume |
| `off` | Nothing | Nothing | Test harnesses; external log management |

### Security Event Action Mapping

The `action` field in each JSONL `SecurityEvent` determines the minimum level required for that event to be written:

| `action` value | Written when `log_level` is | Suppressed when |
| :--- | :--- | :--- |
| `allowed` | `debug` or `info` | `warn`, `error`, or `off` |
| `auth_failure` | `debug`, `info`, or `warn` | `error` or `off` |
| `blocked` / `banned` | `debug`, `info`, `warn`, or `error` | `off` only |

::: tip Why this design?
`allowed` events are the highest volume by far — every successful legitimate connection generates one. Suppressing them at `warn` and above keeps log files compact and ensures CrowdSec and SIEMs only process meaningful security signals, not routine traffic.
:::

---

## Examples by Level

<CodeViewer :snippets="exampleSnippets" />

---

## Security Event Format

Each JSONL line is a single `SecurityEvent` object. Here are real examples for each `action` type:

<CodeViewer :snippets="eventSnippets" />

### Event Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `type` | `string` | Always `"security_event"` |
| `timestamp` | `string` | RFC 3339 UTC timestamp |
| `plugin` | `string` | Always `"tcp-warden"` |
| `service` | `string` | Service name from configuration |
| `protocol` | `string` | Protocol handler (`ssh`, `tcp`, `smtp`, etc.) |
| `client_ip` | `string` | Source IP address |
| `country_code` | `string` | ISO 3166-1 alpha-2 code (`"US"`, `"LAN"` for private ranges) |
| `country_name` | `string` | Country name (omitted for private ranges) |
| `flag_emoji` | `string` | Country flag emoji (`🏠` for LAN) |
| `action` | `string` | `allowed`, `auth_failure`, `blocked`, or `banned` |
| `reason` | `string` | Specific reason string (e.g. `"ip_denied"`, `"crowdsec_ban: ..."`) |
| `bytes_in` | `int64` | Bytes received from client (omitted when `0`) |
| `bytes_out` | `int64` | Bytes sent to client (omitted when `0`) |
| `duration_ms` | `int64` | Connection duration in milliseconds |

---

## Environment Variable Override

`log_level` can also be set via the `ROUTEWARDEN_LOG_LEVEL` environment variable, which takes precedence over the YAML value. This is convenient for container deployments:

<CodeViewer :snippets="envSnippets" />

---

## Startup Banner

TCP Warden prints the active log level at startup so you can confirm the setting at a glance:

<CodeViewer :snippets="bannerSnippets" />

> [!TIP] CrowdSec & Log Levels
> When running TCP Warden alongside CrowdSec, set `log_level: "warn"`. This keeps the JSONL audit file focused on `auth_failure` and `blocked` events — the exact signals CrowdSec scenarios are built to detect — without flooding the file with `allowed` records from legitimate traffic. See the [CrowdSec Integration Guide](./crowdsec) for full setup details.
