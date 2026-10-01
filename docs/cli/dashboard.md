# Security Dashboard (`rwarden dashboard`)

`rwarden dashboard` is a self-hosted, real-time web interface embedded directly inside the `rwarden` Go binary via `go:embed`. It provides unified observability across Traefik, Caddy, NGINX, and TCP Warden with zero external dependencies, no Node.js runtime, and no external database.

![RouteWarden Dashboard - Live Event Feed](/dashboard-feed.png)

---

## Key Capabilities

- **Zero-Config Docker Discovery**: Attaches directly to the local Docker daemon socket (`/var/run/docker.sock`) to auto-discover and stream logs from running Traefik, Caddy, and NGINX gateway containers in real time.
- **Log File Tailing**: Tail local log files or wildcard patterns (e.g. `/var/log/routewarden/*.log`) with automatic log rotation handling.
- **Real-Time Live Feed**: Low-latency WebSocket / SSE stream of blocked requests, client IPs with flag emojis, matched URI patterns, HTTP methods, and triggered response modes.
- **Visual Analytics**: Interactive 24-hour attack timelines, blocks per minute, top attacked endpoints, top offender IPs, response mode breakdown (`block`, `tarpit`, `gzipBomb`, `silentDrop`, `fakeSuccess`), and gateway distribution.
- **v1.2 Config Viewer**: Inspect running container configuration and `routewarden.json` labels directly from the UI without leaving the dashboard.
- **GeoIP & Autonomous System Intelligence**: Country resolution with flag emojis via embedded MaxMind GeoLite2 MMDB or live fallback, including ASN, ISP, and location metadata.
- **Tailscale & NetBird Mesh Auto-Detection**: Native identification for Tailscale (`100.64.0.0/10`, `fd7a:115c:a1e0::/48`) and NetBird (`100.64.0.0/16`, `fd00::/8`) overlay networks as well as RFC 5737 testnets (`203.0.113.0/24`).
- **Deep IP Intelligence View**: Comprehensive threat risk scoring (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), payload patterns, targeted gateways, and paginated event histories per IP.
- **Zero-Dependency Single Binary**: The modern React SPA frontend is pre-compiled and embedded directly inside the `rwarden` Go binary (`go:embed`). No Node.js runtime, external database, or cloud dependencies required.

---

## Dashboard Views

### 1. Live Event Feed

Stream security events from all gateways with instant search, container filtering, pause/resume, and server-assisted pagination.

![RouteWarden Dashboard - Live Event Feed](/dashboard-feed.png)

### 2. Analytics & Attack Trends

Inspect 24-hour, 6-hour, and 1-hour attack timelines, rolling block rates, and distribution charts for endpoints, offender IPs, and defense actions.

![RouteWarden Dashboard - Attack Analytics & Statistics](/dashboard-stats.png)

### 3. Sources & Container Management

Monitor all discovered Docker containers and tailed log files. Inspect the active `routewarden.json` configuration for any gateway with a single click.

![RouteWarden Dashboard - Active Log Sources & Containers](/dashboard-sources.png)

### 4. Deep IP Intelligence & Risk Scoring

Analyze any IP address with behavioral profiling, ASN/ISP lookup, geographic location, and threat risk assessment.

![RouteWarden Dashboard - IP Threat Intelligence](/dashboard-ip-details.png)

### 5. Mesh VPN & Private Overlay Recognition

Automatic recognition of Tailscale and NetBird mesh peers (`100.64.0.0/10` CGNAT, `fd7a:115c:a1e0::/48`, and `fd00::/8` ULA) with dedicated `🔒` indicator badges.

![RouteWarden Dashboard - Tailscale & NetBird VPN Intelligence](/dashboard-ip-vpn.png)

---

## CLI Usage Examples

::: code-group

```bash [CLI]
# 1. Start dashboard with Docker auto-discovery and open browser automatically
rwarden dashboard

# 2. Bind to a custom port without auto-opening the browser
rwarden dashboard --port 8080 --no-open

# 3. Tail one or more local RouteWarden log files
rwarden dashboard --log /var/log/routewarden.log

# 4. Tail wildcard patterns and multiple log sources simultaneously
rwarden dashboard --log "/var/log/routewarden/*.log" --log /var/log/nginx/access.log

# 5. Standalone file-only mode (disable Docker socket discovery)
rwarden dashboard --no-docker --log /var/log/routewarden.log

# 6. Customize memory retention (number of past events loaded)
rwarden dashboard --history 2500 --port 9090

# 7. Ingest structured logs from RouteWarden TCP Warden
rwarden dashboard --log /var/log/routewarden/tcp-warden.jsonl

# 8. Connect directly to running TCP Warden daemon via SSE API (auto-reconnects)
rwarden dashboard --tcp-warden http://127.0.0.1:9091
```

```bash [Docker]
# Auto-discover gateway containers (Traefik, Caddy, NGINX, TCP Warden) via Docker socket
docker run -d \
  --name routewarden-dashboard \
  --restart unless-stopped \
  -p 9090:9090 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  ghcr.io/routewarden/cli:latest

# Or tail log files from a host volume
docker run -d \
  --name routewarden-dashboard \
  --restart unless-stopped \
  -p 9090:9090 \
  -v /var/log/routewarden:/logs:ro \
  ghcr.io/routewarden/cli:latest \
  dashboard --host 0.0.0.0 --no-docker --log "/logs/*.log"
```

```yaml [Docker Compose]
version: "3.8"

services:
  traefik:
    image: traefik:v3.3
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/etc/traefik/traefik.yml:ro

  tcp-warden:
    image: ghcr.io/routewarden/tcp-warden:latest
    container_name: tcp-warden
    restart: unless-stopped
    ports:
      - "9091:9091"
      - "2222:2222"
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
      - tcp-warden-data:/var/lib/routewarden

  routewarden-dashboard:
    image: ghcr.io/routewarden/cli:latest
    container_name: routewarden-dashboard
    restart: unless-stopped
    ports:
      - "9090:9090"
    environment:
      - TCP_WARDEN_URL=http://tcp-warden:9091
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    command: ["dashboard", "--host", "0.0.0.0", "--no-open", "--tcp-warden", "http://tcp-warden:9091"]

volumes:
  tcp-warden-data:
```

:::

---

## Command Flags

| Flag | Type | Default | Description |
|:---|:---|:---|:---|
| `--port` | int | `9090` | Port to serve the dashboard web interface |
| `--host` | string | `127.0.0.1` | Host address to bind (`0.0.0.0` in Docker / remote access) |
| `--log` | string | `""` | Path or glob pattern to log file(s) to tail (repeatable) |
| `--no-docker` | bool | `false` | Disable Docker daemon socket discovery |
| `--socket` | string | `/var/run/docker.sock` | Path to Docker daemon Unix socket |
| `--tcp-warden` | string | `"http://127.0.0.1:9091"` | URL or socket to TCP Warden management API (or set `TCP_WARDEN_URL`) |
| `--history` | int | `1000` | Number of events retained in memory and loaded on startup |
| `--no-open` | bool | `false` | Do not automatically launch the system default browser |

---

## Built-in REST & WebSocket Endpoints

The dashboard server exposes an HTTP API for external integrations, status checks, and monitoring systems:

| Endpoint | Method | Description |
|:---|:---|:---|
| `/api/health` | `GET` | Health check returning status, version, and active client count |
| `/api/events?n=500` | `GET` | Fetch the last `n` recorded security events as JSON |
| `/api/stats?hours=24` | `GET` | Aggregated analytics snapshot (rates, top IPs, top paths, response modes, gateway distribution) |
| `/api/sources` | `GET` | List of active log sources (Docker containers & tailed files) and their statuses |
| `/api/sources/clear` | `POST` | Remove stopped or disconnected log sources from memory |
| `/api/config/:id` | `GET` | Retrieve and parse `routewarden.json` configuration from a Docker container |
| `/api/geoip?ip=...` | `GET` | Resolve IP geolocation, country code, flag emoji, and ISP details |
| `/api/ip/:ip` | `GET` | Deep intelligence summary for a specific IP (threat score, top paths, methods, history) |
| `/ws/events` | `GET` | Real-time WebSocket connection for live event streaming |
