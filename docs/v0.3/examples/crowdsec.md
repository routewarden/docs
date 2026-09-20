# CrowdSec Integration & Security Logging (v0.3.2)

::: warning Legacy Version Notice
You are viewing archived documentation for **v0.3.2**. [Switch to Latest ➔](/traefik/getting-started)
:::

Connect RouteWarden to [CrowdSec](https://crowdsec.net/) to automatically turn blocked reconnaissance scans into immediate firewall bans across your entire infrastructure.

```
Attacker Probes /.env ──► RouteWarden Blocks & Emits JSON ──► CrowdSec Parses & Bans Attacker IP
```

---

## Why Pair RouteWarden with CrowdSec?

CrowdSec typically detects attacks by tailing standard web access logs and waiting for multiple suspicious requests to cross a threshold. While effective for broad traffic, this means vulnerability scanners still get multiple chances to probe your services before getting blocked.

Pairing RouteWarden directly with CrowdSec changes this dynamic:

| Feature | Standard Log Analysis | RouteWarden + CrowdSec |
|---|---|---|
| **First-Request Neutralization** | Requires multiple requests to cross threshold | Intercepted on the very first probe before reaching upstream backends |
| **Ban Speed** | Typically requires 5–10 requests | Immediate ban triggered on sensitive file reconnaissance |
| **Attacker Experience** | Standard 403 Forbidden | Choice of deception: fake `.env` credentials, slow tarpits, or connection drops |
| **Parsing Overhead** | CrowdSec must parse every web request | CrowdSec only processes discrete `routewarden_block` security events |
| **Anti-Evasion Normalization** | Complex URL-encoded paths can slip past naive regex | Evaluates canonical paths cleaned of double encoding, matrix params, and backslashes |

---

## How It Works

1. **Interception**: When a client requests a protected endpoint (such as `/.env`, `/.git/config`, or `/dump.sql`) or sends a blocked query string, RouteWarden intercepts the request according to your configured response mode (`json`, `html`, `fakeSuccess`, `silentDrop`, etc.).
2. **Structured Event Emission**: Along with the client response, RouteWarden emits a single-line JSON audit event to `stdout`:
   ```json
   {
     "type": "routewarden_block",
     "timestamp": "2026-09-19T15:20:00Z",
     "plugin": "routewarden",
     "client_ip": "198.51.100.42",
     "method": "GET",
     "path": "/.env",
     "request_uri": "/.env",
     "pattern": "(?i)(^|/)(\\.env.*)$",
     "action": "fakeSuccess",
     "reason": "path_blocked",
     "user_agent": "Mozilla/5.0 (compatible; Nuclei/v3.1.0)"
   }
   ```
3. **CrowdSec Parsing**: The custom RouteWarden parser ingests this structured event and extracts the client IP, probed path, HTTP method, and matched pattern.
4. **Instant Remediation**: The scenario flags the probe as high-confidence reconnaissance and immediately instructs your CrowdSec bouncers (firewall, iptables, Cloudflare) to ban the offending IP.

---

## Setup Walkthrough

### Step 1: Install the RouteWarden CrowdSec Parser

Create `/etc/crowdsec/parsers/s01-parse/routewarden-logs.yaml`:

```yaml
# /etc/crowdsec/parsers/s01-parse/routewarden-logs.yaml
onsuccess: next_stage
name: routewarden/parser
description: "Parse RouteWarden security block events from Traefik & Caddy"
filter: "evt.Line.Raw contains 'routewarden_block'"
nodes:
  - grok:
      pattern: '.*\{"type":"routewarden_block",%{GREEDYDATA:json_raw}\}'
      apply_on: Line.Raw
  - json:
      target_field: Parsed
      apply_on: json_raw
statics:
  - meta: log_type
    value: routewarden_block
  - meta: source_ip
    expression: "evt.Parsed.client_ip"
  - meta: http_path
    expression: "evt.Parsed.path"
  - meta: http_method
    expression: "evt.Parsed.method"
  - meta: http_user_agent
    expression: "evt.Parsed.user_agent"
  - meta: routewarden_pattern
    expression: "evt.Parsed.pattern"
  - meta: routewarden_action
    expression: "evt.Parsed.action"
```

---

### Step 2: Install the RouteWarden Threat Scenario

Create `/etc/crowdsec/scenarios/routewarden-threat.yaml`:

```yaml
# /etc/crowdsec/scenarios/routewarden-threat.yaml
type: trigger
name: routewarden/sensitive-endpoint-scan
description: "Ban IPs probing sensitive paths intercepted by RouteWarden"
filter: "evt.Meta.log_type == 'routewarden_block'"
blackhole: 1h
labels:
  type: scan
  remediation: true
  service: http
  confidence: 3
  spoofable: 0
  behavior: "http:probing"
scope:
  type: ip
  expression: evt.Meta.source_ip
```

---

### Step 3: Configure CrowdSec Log Acquisition (`acquis.yaml`)

CrowdSec reads logs through an acquisition datasource configured in `/etc/crowdsec/acquis.yaml`. You can ingest RouteWarden logs via **Docker container logs** or directly from **local log files** on disk.

::: code-group

```yaml [Docker Container Logs]
# /etc/crowdsec/acquis.yaml
# Ingest directly from container stdout/stderr
source: docker
container_name:
  - traefik
  - caddy
labels:
  type: routewarden
```

```yaml [File-Based: Traefik Log File]
# /etc/crowdsec/acquis.yaml
# Ingest Traefik output written to a file
filenames:
  - /var/log/traefik/traefik.log
labels:
  type: routewarden
```

```yaml [File-Based: Caddy Log File]
# /etc/crowdsec/acquis.yaml
# Ingest Caddy stdout or custom logfile
filenames:
  - /var/log/caddy/caddy.log
labels:
  type: routewarden
```

```yaml [File-Based: Shared Directory Wildcard]
# /etc/crowdsec/acquis.yaml
# Matches any active or rotated proxy log files
filenames:
  - /var/log/proxies/*.log
labels:
  type: routewarden
```

```yaml [Systemd Journal Ingestion]
# /etc/crowdsec/acquis.yaml
# Ingest Traefik or Caddy running as a systemd unit
source: journalctl
journalctl_filter:
  - _SYSTEMD_UNIT=traefik.service
  - _SYSTEMD_UNIT=caddy.service
labels:
  type: routewarden
```

:::

#### How to direct Gateway output to a log file

If you choose file-based acquisition, configure your gateway to write logs to disk:

::: code-group

```yaml [Traefik File Logging (traefik.yml)]
# Static Traefik Configuration
log:
  level: INFO
  filePath: "/var/log/traefik/traefik.log"
  format: common
```

```bash [Traefik CLI / Docker Compose]
# Redirect stdout into a shared volume on host
services:
  traefik:
    image: traefik:v3.1
    # ...
    volumes:
      - /var/log/traefik:/var/log/traefik
    # When Traefik writes to /var/log/traefik/traefik.log:
    command:
      - "--log.filePath=/var/log/traefik/traefik.log"
```

```nginx [Caddy File Logging (Caddyfile)]
# Caddyfile global block redirecting standard output to a file
{
    order route_warden before reverse_proxy
    log {
        output file /var/log/caddy/caddy.log {
            roll_size 50mb
            roll_keep 5
        }
        format console
    }
}
```

:::

> [!TIP]
> **Docker Volume Sharing for File-Based Acquisition**: If CrowdSec runs inside a Docker container while reading a file from the host, ensure the log directory is mounted in both containers:
> ```yaml
> volumes:
>   - /var/log/traefik:/var/log/traefik:ro
> ```

---

### Step 4: Configure the Gateway (Traefik or Caddy)

Security logging is **enabled by default** (`securityLog: true` / `security_log true`).

::: code-group

```yaml [Traefik (File / Dynamic YAML)]
http:
  middlewares:
    routewarden-shield:
      plugin:
        routewarden:
          enabled: true
          # Emits structured JSON events on stdout for CrowdSec
          securityLog: true
          enableDefaultPatterns: true
          # Deceive attackers with convincing dummy credentials
          response:
            mode: fakeSuccess
            statusCode: 200
```

```yaml [Traefik (Docker Compose Labels)]
services:
  app:
    image: my-app:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`example.com`)"
      - "traefik.http.routers.app.middlewares=routewarden-shield"
      - "traefik.http.middlewares.routewarden-shield.plugin.routewarden.enabled=true"
      - "traefik.http.middlewares.routewarden-shield.plugin.routewarden.securityLog=true"
      - "traefik.http.middlewares.routewarden-shield.plugin.routewarden.response.mode=fakeSuccess"
```

```nginx [Caddy (Caddyfile)]
{
    order route_warden before reverse_proxy
}

example.com {
    route_warden {
        enabled true
        # Emits structured JSON events on stdout for CrowdSec
        security_log true
        enable_default_patterns true
        response {
            mode fake_success
            status_code 200
        }
    }
    reverse_proxy app:8080
}
```

```json [Caddy (JSON API)]
{
  "handler": "route_warden",
  "enabled": true,
  "security_log": true,
  "enable_default_patterns": true,
  "response": {
    "mode": "fakeSuccess",
    "status_code": 200
  }
}
```

:::

---

---

## Complete Docker Compose Example

Here is a practical Docker Compose setup running Traefik with RouteWarden, CrowdSec, and a protected web container:

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v3.1
    container_name: traefik
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden"
      - "--experimental.plugins.routewarden.version=v0.3.2"
    ports:
      - "80:80"
      - "8080:8080" # Dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: unless-stopped

  crowdsec:
    image: crowdsecurity/crowdsec:latest
    container_name: crowdsec
    environment:
      COLLECTIONS: "crowdsecurity/traefik crowdsecurity/http-cve"
    volumes:
      - ./crowdsec/acquis.yaml:/etc/crowdsec/acquis.yaml:ro
      - ./crowdsec/parsers:/etc/crowdsec/parsers/s01-parse:ro
      - ./crowdsec/scenarios:/etc/crowdsec/scenarios:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - crowdsec-db:/var/lib/crowdsec/data/
    restart: unless-stopped

  web:
    image: nginx:alpine
    container_name: web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=PathPrefix(`/`)"
      - "traefik.http.routers.web.entrypoints=web"
      - "traefik.http.routers.web.middlewares=sec-shield"
      - "traefik.http.middlewares.sec-shield.plugin.routewarden.enabled=true"
      - "traefik.http.middlewares.sec-shield.plugin.routewarden.securityLog=true"
      - "traefik.http.middlewares.sec-shield.plugin.routewarden.response.mode=json"

volumes:
  crowdsec-db:
```

---

## Testing the Integration

### 1. Send a Test Probe

Simulate a vulnerability scanner probing for exposed configuration files:

```bash
curl -i -H "User-Agent: Nuclei/v3.1.0" http://localhost/.env
```

### 2. Verify Structured Security Log Emission

Check Traefik or Caddy output for the security block record:

```bash
docker logs traefik | grep routewarden_block
```

Example JSON output:
```json
{"action":"json","client_ip":"172.18.0.1","method":"GET","path":"/.env","pattern":"(?i)(^|/)(\\.env.*|.*\\.(txt|log|bak|backup|sql|conf|config|ini|yaml|yml))$","plugin":"routewarden","reason":"path_blocked","request_uri":"/.env","timestamp":"2026-09-19T15:30:12Z","type":"routewarden_block","user_agent":"Nuclei/v3.1.0"}
```

### 3. Check Active CrowdSec Decisions

Verify that CrowdSec parsed the event and issued a ban:

```bash
# View trigger alerts
docker exec -t crowdsec cscli alerts list

# View active firewall remediation decisions
docker exec -t crowdsec cscli decisions list
```

Output:
```text
+----+--------------------------------+-----------------+--------------------------------------+--------+---------+----+--------+--------------------+----------+
| ID |             SOURCE             |   SCOPE:VALUE   |                REASON                | ACTION | COUNTRY | AS | EVENTS |     EXPIRATION     | ALERT ID |
+----+--------------------------------+-----------------+--------------------------------------+--------+---------+----+--------+--------------------+----------+
|  1 | crowdsec                       | Ip:172.18.0.1   | routewarden/sensitive-endpoint-scan  | ban    |         |    |      1 | 3h59m58s           |        1 |
+----+--------------------------------+-----------------+--------------------------------------+--------+---------+----+--------+--------------------+----------+
```

The client IP is now banned by CrowdSec across all attached bouncers.

---

## SIEM and Log Shipper Ingestion

Because RouteWarden emits single-line JSON with `type: "routewarden_block"`, you can easily pipe these logs into your existing observability stack without custom grok patterns:

- **Elasticsearch / Filebeat**: Ingest with standard JSON processors and enrich `client_ip` with GeoIP data.
- **Grafana Loki / Promtail**: Parse with `{type="routewarden_block"} | json` for instant dashboard metrics and alerts.
- **Datadog / Splunk**: Automatic JSON facet extraction for `pattern`, `action`, `reason`, and `user_agent`.
