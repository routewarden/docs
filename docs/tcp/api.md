---
title: Management API & Server-Sent Events
description: Administrative REST and live Server-Sent Events (SSE) stream endpoints exposed by RouteWarden TCP Warden.
---

# Management API & Server-Sent Events

TCP Warden includes a built-in HTTP server on port `9091` (configurable via `api.listen`) providing health monitoring, service statistics, banlist management, and real-time event streaming.

---

## Authentication

If `api.auth_token` is configured in `tcp-warden.yaml`, all requests (except `/health`) require an HTTP `Authorization` header:

```bash
curl -H "Authorization: Bearer my-secret-token" http://127.0.0.1:9091/stats
```

---

## Endpoints

### 1. Health Probe (`GET /health`)

Lightweight liveness probe for Docker healthchecks and Kubernetes probes.

```bash
curl -s http://127.0.0.1:9091/health
```

**Response (`200 OK`)**:
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

---

### 2. Service Statistics (`GET /stats`)

Returns aggregated connection metrics and byte counters per configured service.

```bash
curl -s http://127.0.0.1:9091/stats
```

**Response (`200 OK`)**:
```json
{
  "services": {
    "ssh": {
      "active_connections": 2,
      "total_allowed": 1420,
      "total_blocked": 38,
      "bytes_in": 1048576,
      "bytes_out": 4194304
    },
    "postgres": {
      "active_connections": 15,
      "total_allowed": 8920,
      "total_blocked": 12,
      "bytes_in": 52428800,
      "bytes_out": 104857600
    }
  },
  "uptime_seconds": 86400
}
```

---

### 3. Active Banlist (`GET /banlist`)

Lists all currently banned IP addresses, ban reasons, offending service, and expiration timestamps.

```bash
curl -s http://127.0.0.1:9091/banlist
```

**Response (`200 OK`)**:
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

### 4. Manual IP Ban (`POST /ban`)

Manually ban an IP address across all services or for a specific service.

```bash
curl -X POST http://127.0.0.1:9091/ban \
  -H "Content-Type: application/json" \
  -d '{"ip": "203.0.113.50", "duration": "24h", "reason": "abusive scanning"}'
```

---

### 5. Manual IP Unban (`POST /unban`)

Lift an active ban immediately:

```bash
curl -X POST http://127.0.0.1:9091/unban \
  -H "Content-Type: application/json" \
  -d '{"ip": "203.0.113.50"}'
```

---

### 6. Live Security Events Stream (`GET /events`)

A high-performance **Server-Sent Events (SSE)** endpoint streaming live connection decisions as they occur in the 8-stage pipeline.

```bash
curl -N http://127.0.0.1:9091/events
```

**Stream Output**:
```
event: security_event
data: {"service":"ssh","client_ip":"198.51.100.80","country":"CN","action":"auth_failure","reason":"attempt 1/3","bytes_in":0,"bytes_out":0,"timestamp":"2026-09-25T21:55:01Z"}

event: security_event
data: {"service":"ssh","client_ip":"198.51.100.80","country":"CN","action":"banned","reason":"max_auth_failures_exceeded (3)","bytes_in":0,"bytes_out":0,"timestamp":"2026-09-25T21:55:04Z"}

event: security_event
data: {"service":"postgres","client_ip":"10.0.0.5","country":"US","action":"allowed","reason":"session_complete","bytes_in":8192,"bytes_out":16384,"timestamp":"2026-09-25T21:55:12Z"}
```
