---
title: CrowdSec Integration for TCP Warden (Optional)
description: Step-by-step guide to connect TCP Warden with CrowdSec Local API (LAPI) for automated collaborative threat detection and real-time IP banning.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 0. Architecture Diagram ────────────────────────────────────────────────
const arch_diagram = buildSnippet({
  lang: 'plaintext',
  code: `[ Inbound Client Connection ]
               │
               ▼
   [ TCP Warden Pipeline ]
               │
               ├─► [ Step A: CrowdSec Local Cache Check ]
               │         │
               │         ├─► IP Match? ──► [ Instant Ban / Drop / Tarpit ]
               │         │
               │         └─► Clean? ────► [ Proceed to Upstream ]
               │
               └─► [ Step B: Protocol Inspection & Auth Monitoring ]
                         │
                         ▼ (Emits auth failures, scan patterns, etc.)
               [ Write to /var/log/routewarden/tcp-warden.jsonl ]
                         │
                         ▼
               [ CrowdSec Daemon (Log Acquisition) ]
                         │
                         ▼
               [ RouteWarden Custom Parsers & Scenarios ]
                         │
                         ▼ (Attack Threshold Exceeded)
               [ Push New Remediation Decision to CrowdSec LAPI ]`
})

const archSnippets = computed(() => ({
  tcp: [
    { filename: 'Collaborative Loop', lang: 'plaintext', code: arch_diagram.cleanCode, html: arch_diagram.html, hasDiff: false },
  ]
}))

// ─── 1. Configuration (tcp-warden.yaml) ──────────────────────────────────────
const crowdsec_config = buildSnippet({
  lang: 'yaml',
  code: `# CrowdSec LAPI Bouncer integration in tcp-warden.yaml
crowdsec:
  enabled: true
  lapi_url: "http://127.0.0.1:8080"
  api_key: "\${CROWDSEC_API_KEY}"
  update_frequency: "10s"
  fallback_action: "ban" # "ban" | "throttle" | "bypass"`
})

const crowdsecConfigSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: crowdsec_config.cleanCode, html: crowdsec_config.html, hasDiff: false },
  ]
}))

// ─── 2. Log Acquisition (acquis.yaml) ────────────────────────────────────────
const acquis_yaml = buildSnippet({
  lang: 'yaml',
  code: `# /etc/crowdsec/acquis.d/tcp-warden.yaml
filenames:
  - /var/log/routewarden/tcp-warden.jsonl
labels:
  type: routewarden-tcp`
})

const acquisSnippets = computed(() => ({
  tcp: [
    { filename: 'acquis.yaml', lang: 'yaml', code: acquis_yaml.cleanCode, html: acquis_yaml.html, hasDiff: false },
  ]
}))

// ─── 3. Parser (routewarden-tcp-warden.yaml) ─────────────────────────────────
const parser_yaml = buildSnippet({
  lang: 'yaml',
  code: `# /etc/crowdsec/parsers/s01-parse/routewarden-tcp-warden.yaml
filter: "evt.Line.Labels.type == 'routewarden-tcp'"
onsuccess: next_stage
name: routewarden/tcp-warden-parser
description: "Parse TCP Warden structured JSONL security logs"
nodes:
  - grok:
      pattern: '^%{GREEDYDATA:raw_json}$'
      apply_on: Line.Raw
  - json:
      target: evt.Parsed
      apply_on: raw_json
statics:
  - meta: service
    expression: "evt.Parsed.service"
  - meta: source_ip
    expression: "evt.Parsed.client_ip"
  - meta: action
    expression: "evt.Parsed.action"
  - meta: reason
    expression: "evt.Parsed.reason"`
})

const parserSnippets = computed(() => ({
  tcp: [
    { filename: 'routewarden-tcp-warden.yaml', lang: 'yaml', code: parser_yaml.cleanCode, html: parser_yaml.html, hasDiff: false },
  ]
}))

// ─── 4. Docker Compose Full-Stack ───────────────────────────────────────────
const compose_yaml = buildSnippet({
  lang: 'yaml',
  code: `services:
  # TCP Warden
  tcp-warden:
    image: ghcr.io/routewarden/tcp-warden:latest
    container_name: tcp-warden
    restart: unless-stopped
    network_mode: host
    volumes:
      - tcp-warden-config:/etc/routewarden
      - tcp-warden-plugins:/var/lib/routewarden/plugins
      - tcp-warden-data:/var/lib/routewarden
      - tcp-warden-logs:/var/log/routewarden
    environment:
      - CROWDSEC_API_KEY=\${CROWDSEC_API_KEY}

  # CrowdSec Security Engine
  crowdsec:
    image: crowdsecurity/crowdsec:latest
    container_name: crowdsec
    restart: unless-stopped
    environment:
      - COLLECTIONS=crowdsecurity/linux
    volumes:
      - ./crowdsec/acquis.yaml:/etc/crowdsec/acquis.d/tcp-warden.yaml:ro
      - ./crowdsec/parsers:/etc/crowdsec/parsers:ro
      - ./crowdsec/scenarios:/etc/crowdsec/scenarios:ro
      - tcp-warden-logs:/var/log/routewarden:ro
      - crowdsec-db:/var/lib/crowdsec/data
      - crowdsec-config:/etc/crowdsec
    ports:
      - "8080:8080"

volumes:
  tcp-warden-config:
  tcp-warden-plugins:
  tcp-warden-data:
  tcp-warden-logs:
  crowdsec-db:
  crowdsec-config:`
})

const composeSnippets = computed(() => ({
  tcp: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: compose_yaml.cleanCode, html: compose_yaml.html, hasDiff: false },
  ]
}))

const start_stack = buildSnippet({
  lang: 'bash',
  code: `docker compose up -d`
})

const startStackSnippets = computed(() => ({
  tcp: [
    { filename: 'Terminal', lang: 'bash', code: start_stack.cleanCode, html: start_stack.html, hasDiff: false },
  ]
}))

// ─── 5. Register Bouncer Key ────────────────────────────────────────────────
const register_bouncer = buildSnippet({
  lang: 'bash',
  code: `# Register TCP Warden as a bouncer in CrowdSec
docker compose exec crowdsec cscli bouncers add tcp-warden-bouncer

# Output example:
# Api key for 'tcp-warden-bouncer':
#    a1b2c3d4e5f678901234567890abcdef
#
# Add this key to your .env file:
echo "CROWDSEC_API_KEY=a1b2c3d4e5f678901234567890abcdef" >> .env`
})

const bouncerKeySnippets = computed(() => ({
  tcp: [
    { filename: 'Terminal', lang: 'bash', code: register_bouncer.cleanCode, html: register_bouncer.html, hasDiff: false },
  ]
}))

// ─── 6. Verification Snippets ───────────────────────────────────────────────
const verify_commands = buildSnippet({
  lang: 'bash',
  code: `# 1. Verify TCP Warden health & CrowdSec status
curl -s http://127.0.0.1:9091/health
# Expected output contains:
# {"status":"ok","version":"1.2.1","crowdsec":{"status":"healthy","decisions":1250,"update_frequency":"10s"}}

# 2. List registered bouncers in CrowdSec
docker compose exec crowdsec cscli bouncers list

# 3. View active decision / ban records in CrowdSec
docker compose exec crowdsec cscli decisions list`
})

const verifySnippets = computed(() => ({
  tcp: [
    { filename: 'Verification', lang: 'bash', code: verify_commands.cleanCode, html: verify_commands.html, hasDiff: false },
  ]
}))

const health_response = buildSnippet({
  lang: 'json',
  code: `{
  "status": "ok",
  "version": "1.2.1",
  "crowdsec": {
    "status": "healthy",
    "decisions": 1250,
    "update_frequency": "10s"
  }
}`
})

const healthResponseSnippets = computed(() => ({
  tcp: [
    { filename: 'Response (200 OK)', lang: 'json', code: health_response.cleanCode, html: health_response.html, hasDiff: false },
  ]
}))
</script>

# CrowdSec Integration <Badge type="info" text="Optional" />

TCP Warden is built to run fully autonomously, but it also natively supports bidirectional integration with **[CrowdSec](https://www.crowdsec.net/)**.

::: info Optional Integration
TCP Warden operates as a complete standalone proxy and firewall without CrowdSec. All core features—including GeoIP filtering, CIDR allow/deny lists, token-bucket rate limiting, protocol inspection, brute-force failure tracking, and embedded SQLite ban storage—function out of the box with zero external dependencies.

Only follow this guide if you wish to link TCP Warden to CrowdSec for collaborative community blocklists and centralized multi-server decision sharing.
:::

---

## How the Integration Works

The integration forms a closed-loop security cycle:

1. **Log Acquisition (Outbound Threat Feed)**: TCP Warden records every connection attempt, authentication failure, and port scan to `/var/log/routewarden/tcp-warden.jsonl`. CrowdSec tail-reads this file, applying custom parsers and detection scenarios.
2. **LAPI Bouncer (Inbound Enforcement)**: TCP Warden acts as a high-performance CrowdSec remediation bouncer. It periodically polls CrowdSec Local API (LAPI) for active decisions and drops or tarpits malicious IPs at Layer 4 before they consume backend server resources.

<CodeViewer :snippets="archSnippets" />

---

## Step-by-Step Setup Guide

Follow these sequential steps to deploy the combined TCP Warden and CrowdSec stack.

### Step 1: Set Up Log Acquisition (`acquis.yaml`)

Tell CrowdSec where to find TCP Warden's structured JSONL audit log:

<CodeViewer :snippets="acquisSnippets" />

---

### Step 2: Install Custom Parser & Scenarios

TCP Warden ships with custom CrowdSec parsers and scenarios located in the repository under `crowdsec/`:

#### Parser (`parsers/s01-parse/routewarden-tcp-warden.yaml`)

Extracts `service`, `client_ip`, `action`, and `reason` fields from incoming audit records:

<CodeViewer :snippets="parserSnippets" />

#### Scenarios

Install or mount the scenarios from the `crowdsec/scenarios/` directory:

* **SSH Brute Force** (`routewarden-tcp-ssh-bf.yaml`): Detects repeated SSH authentication failures within a 60-second window.
* **SMTP Spam / Brute Force** (`routewarden-tcp-smtp-bf.yaml`): Detects senders repeatedly hitting blocked domains or failing authentication.
* **Port Scan Detector** (`routewarden-tcp-portscan.yaml`): Flags IPs attempting connection floods across unconfigured or closed ports.

---

### Step 3: Register the Bouncer API Key

In CrowdSec, create a bouncer entry for TCP Warden to obtain an API key:

<CodeViewer :snippets="bouncerKeySnippets" />

---

### Step 4: Configure `tcp-warden.yaml`

Enable the CrowdSec bouncer section in your `tcp-warden.yaml`:

<CodeViewer :snippets="crowdsecConfigSnippets" />

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enabled` | `bool` | `false` | Set to `true` to activate CrowdSec decision polling. |
| `lapi_url` | `string` | `"http://127.0.0.1:8080"` | URL of your CrowdSec Local API service. |
| `api_key` | `string` | — | Bouncer API token obtained in Step 3. |
| `update_frequency` | `duration` | `"10s"` | Interval for polling new ban/unban decisions. |
| `fallback_action` | `string` | `"ban"` | Strategy when decisions match: `ban`, `throttle`, or `bypass`. |

---

### Step 5: Full-Stack Docker Compose Deployment

Run both services in a unified Docker Compose file with shared log and data volumes:

<CodeViewer :snippets="composeSnippets" />

Start the stack:

<CodeViewer :snippets="startStackSnippets" />

---

### Step 6: Verify the Integration

Verify that TCP Warden successfully connects to CrowdSec LAPI and receives active decisions:

<CodeViewer :snippets="verifySnippets" />

In the [Management Dashboard](./api) or via `curl http://127.0.0.1:9091/health`, the health response will show the active CrowdSec connection status:

<CodeViewer :snippets="healthResponseSnippets" />

---

> [!TIP] Architectural Deep Dive & Comparison
> Want to understand the fundamental architectural differences between TCP Warden and CrowdSec, and why they work best together? Check out the [TCP Warden FAQ & Comparison Guide](./faq).
