---
title: HTTP Management API & Live Events
description: Simple REST endpoints and live Server-Sent Events (SSE) stream for monitoring and managing TCP Warden.
---

# HTTP API & Live Events

TCP Warden includes a built-in HTTP server on port `9091` (configurable via `api.listen`).

Use it to:
- Check daemon health and uptime.
- View real-time traffic and connection counts per service.
- View, add, or remove active IP bans.
- Stream live security events directly in your terminal.

---

## Authentication

If you set `auth_token` in your `tcp-warden.yaml`, pass it in the `Authorization` header:

```bash
curl -H "Authorization: Bearer my-secret-token" http://127.0.0.1:9091/stats
```

*(The `/health` endpoint is always accessible without a token so health checks and container probes keep working).*

---

## Endpoints

### 1. Health Check (`GET /health`)

A quick check to confirm the daemon is up and running. Perfect for Docker health checks or Kubernetes probes.

```bash
curl -s http://127.0.0.1:9091/health
```

**Example Response**:
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

---

### 2. Traffic & Connection Stats (`GET /stats`)

Shows how many connections are active, total allowed and blocked requests, and bytes transferred for each service.

```bash
curl -s http://127.0.0.1:9091/stats
```

**Example Response**:
```json
{
  "services": {
    "ssh": {
      "active_connections": 1,
      "total_allowed": 142,
      "total_blocked": 8,
      "bytes_in": 1048576,
      "bytes_out": 4194304
    },
    "postgres": {
      "active_connections": 5,
      "total_allowed": 2340,
      "total_blocked": 0,
      "bytes_in": 52428800,
      "bytes_out": 104857600
    }
  },
  "uptime_seconds": 3600
}
```

---

### 3. View Banned IPs (`GET /banlist`)

Lists all currently banned IPs, why they were banned, and when the ban expires.

```bash
curl -s http://127.0.0.1:9091/banlist
```

**Example Response**:
```json
{
  "bans": [
    {
      "ip": "198.51.100.45",
      "reason": "max_auth_failures_exceeded (3)",
      "service": "ssh",
      "banned_at": "2026-09-25T21:30:00Z",
      "expires_at": "2026-09-25T22:30:00Z",
      "remaining": "45m0s"
    }
  ]
}
```

---

### 4. Manually Ban an IP (`POST /ban`)

Block an offending IP address across all services:

```bash
curl -X POST http://127.0.0.1:9091/ban \
  -H "Content-Type: application/json" \
  -d '{"ip": "203.0.113.50", "duration": "24h", "reason": "suspicious port scan"}'
```

---

### 5. Unban an IP (`POST /unban`)

Remove a ban immediately if an IP was blocked by mistake:

```bash
curl -X POST http://127.0.0.1:9091/unban \
  -H "Content-Type: application/json" \
  -d '{"ip": "203.0.113.50"}'
```

---

### 6. Live Security Events Stream (`GET /events`)

Watch security decisions live as they happen using **Server-Sent Events (SSE)**. You can pipe this into monitoring tools, Slack bots, or simply watch in your terminal:

```bash
curl -N http://127.0.0.1:9091/events
```

**Live Output Example**:
```
event: security_event
data: {"service":"ssh","client_ip":"198.51.100.80","country":"CN","action":"auth_failure","reason":"failed login attempt 1/3","timestamp":"2026-09-25T21:55:01Z"}

event: security_event
data: {"service":"ssh","client_ip":"198.51.100.80","country":"CN","action":"banned","reason":"max failures exceeded","timestamp":"2026-09-25T21:55:04Z"}

event: security_event
data: {"service":"http","client_ip":"203.0.113.12","country":"US","action":"blocked","reason":"blocked_path_/.env","timestamp":"2026-09-25T21:55:10Z"}
```
