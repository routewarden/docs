---
title: CrowdSec LAPI Integration for TCP Warden
description: Connect TCP Warden with CrowdSec Local API (LAPI) for automated collaborative threat detection and real-time IP banning.
---

# CrowdSec LAPI Integration

RouteWarden TCP Warden integrates directly with **[CrowdSec](https://www.crowdsec.net/)**:

1. **Logs Security Events**: Writes structured JSONL logs for every connection attempt, failed login, or blocked action.
2. **Blocks Threats in Real Time**: Acts as a native CrowdSec bouncer, automatically polling your CrowdSec Local API (LAPI) to block community-reported and local bad IPs before they ever reach your applications.

---

## Architecture

```
[Inbound Connection]
         │
         ▼
[TCP Warden Pipeline]
         │
         ├─► [CrowdSec Cache Check] ──► Match? ──► [Instant Ban / Drop / Tarpit]
         │
         └─► [Stream Inspection]
                   │
                   ▼ (Auth Failures / Port Scans)
         [Write to /var/log/routewarden/tcp-warden.jsonl]
                   │
                   ▼
         [CrowdSec Daemon (Log Acquis)]
                   │
                   ▼
         [RouteWarden Parsers & Scenarios]
                   │
                   ▼ (Threshold Exceeded)
         [New Remediation Decision Pushed to LAPI]
```

---

## Configuration

Enable CrowdSec in `tcp-warden.yaml`:

```yaml
crowdsec:
  enabled: true
  lapi_url: "http://127.0.0.1:8080"
  api_key: "${CROWDSEC_API_KEY}"
  update_frequency: "10s"
  fallback_action: "ban" # "ban" | "throttle" | "bypass"
```

---

## CrowdSec Parser & Scenarios

TCP Warden ships with custom CrowdSec parsers and scenarios located in the repository under `crowdsec/`.

### 1. Log Acquisition (`acquis.yaml`)

Configure CrowdSec to ingest the TCP Warden JSONL log file:

```yaml
filenames:
  - /var/log/routewarden/tcp-warden.jsonl
labels:
  type: routewarden-tcp
```

### 2. Parser (`parsers/s01-parse/routewarden-tcp-warden.yaml`)

```yaml
filter: "evt.Line.Labels.type == 'routewarden-tcp'"
onsuccess: next_stage
name: routewarden/tcp-warden-parser
description: "Parse RouteWarden TCP Warden structured JSONL security logs"
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
```

### 3. Detection Scenarios

* **SSH Brute Force** (`routewarden-tcp-ssh-bf.yaml`): Detects repeated SSH authentication failures within a 60-second window.
* **SMTP Spam / Brute Force** (`routewarden-tcp-smtp-bf.yaml`): Detects senders repeatedly hitting blocked domains or failing authentication.
* **Port Scan Detector** (`routewarden-tcp-portscan.yaml`): Flags IPs attempting connection floods across multiple unconfigured or closed ports.

---

## Docker Compose Full-Stack Example

Deploy TCP Warden alongside CrowdSec in a unified stack:

```yaml
services:
  tcp-warden:
    image: routewarden/tcp-warden:latest
    container_name: tcp-warden
    restart: unless-stopped
    network_mode: host
    volumes:
      - tcp-warden-config:/etc/routewarden
      - tcp-warden-plugins:/var/lib/routewarden/plugins
      - tcp-warden-logs:/var/log/routewarden
    environment:
      - CROWDSEC_API_KEY=${CROWDSEC_API_KEY}

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
  tcp-warden-logs:
  crowdsec-db:
  crowdsec-config:
```

### Registering the Bouncer Key

Generate an API key in CrowdSec and export it:

```bash
docker compose exec crowdsec cscli bouncers add tcp-warden-bouncer
# Copy the generated API key into your .env as CROWDSEC_API_KEY
```
