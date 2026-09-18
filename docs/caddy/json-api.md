# Caddy JSON API Reference

Caddy features a dynamic REST API that allows updating configuration at runtime with zero downtime.

---

## 1. Module Handler Identification

RouteWarden registers itself in Caddy's HTTP middleware system under the ID:

```text
caddy.http.handlers.route_warden
```

When building routes via JSON, specify `"handler": "route_warden"` in your route handler list.

---

## 2. Complete JSON Schema

```json
{
  "handler": "route_warden",
  "enabled": true,
  "enable_default_patterns": true,
  "enable_default_allow_patterns": true,
  "check_query": false,
  "path_patterns": [
    "(?i)^/admin(/.*)?$",
    "(?i)^/api/internal(/.*)?$"
  ],
  "allow_patterns": [
    "(?i)^/api/internal/health$",
    "(?i)^/robots\\.txt$"
  ],
  "allowed_ips": [
    "10.0.0.0/8",
    "192.168.1.100"
  ],
  "methods": [
    "GET",
    "POST"
  ],
  "response": {
    "mode": "json",
    "status_code": 403,
    "body": "{\"error\":\"Forbidden: Internal Network Only\"}",
    "redirect_url": "",
    "proxy_url": "",
    "gzip_bomb_mb": 10,
    "retry_after_seconds": 60,
    "tarpit_delay_ms": 1000,
    "stream_size_mb": 5,
    "captcha": {
      "provider": "turnstile",
      "site_key": "0x4AAAAAAAxxyyzz"
    }
  }
}
```

---

## 3. Dynamic Runtime Update (cURL Example)

Push a new security policy into a running Caddy instance without restarting the daemon:

```bash
curl -X POST http://localhost:2019/config/apps/http/servers/srv0/routes/0/handle/0 \
  -H "Content-Type: application/json" \
  -d '{
    "handler": "route_warden",
    "enabled": true,
    "enable_default_patterns": true,
    "allowed_ips": ["10.0.0.0/8"],
    "methods": ["GET", "POST"],
    "response": {
      "mode": "json",
      "status_code": 404,
      "body": "{\"error\":\"Not Found\"}"
    }
  }'
```
