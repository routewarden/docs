---
title: Modular Protocol Plugins for TCP Warden
description: Extend TCP Warden with modular protocol inspectors from routewarden/plugins for HTTP, databases, caches, message queues, game servers, and IoT brokers.
---

# Modular Protocol Plugins

To keep the core `tcp-warden` binary lightweight (~25MB) and rock-solid, protocol-specific inspectors are decoupled into the dedicated **[`routewarden/plugins`](https://github.com/routewarden/plugins)** repository.

Core protocols (`ssh`, `smtp`, `pop3`, `imap`, and raw `tcp`) are built directly into the daemon. All other protocol inspectors can be installed on demand with a single CLI command or declared in your YAML configuration.

---

## Official Plugins Directory

RouteWarden provides **14 official plugins** ready for production use:

| Plugin | Protocol(s) | Key Protection Capabilities |
| :--- | :--- | :--- |
| **[`http`](https://github.com/routewarden/plugins/tree/develop/http)** | `http` | Layer 7 HTTP/1.x filtering: Host header whitelisting, User-Agent blocking, path allowlists, and regex path/header blocking. Seamless WebSocket upgrade pass-through. |
| **[`postgres`](https://github.com/routewarden/plugins/tree/develop/postgres)** | `postgres`, `postgresql` | Decodes `StartupMessage`, SSL negotiation, SCRAM-SHA-256 and MD5 authentication failures (`28P01` / `28000`), and brute-force tracking. |
| **[`mysql`](https://github.com/routewarden/plugins/tree/develop/mysql)** | `mysql`, `mariadb` | Handshake sequence decoding, `CLIENT_SSL` negotiation, `caching_sha2_password` exchange, and access denied (`1045`/`1044`) mitigation. |
| **[`redis`](https://github.com/routewarden/plugins/tree/develop/redis)** | `redis`, `resp` | RESP2/RESP3 command firewall: blocks dangerous commands (`FLUSHALL`, `CONFIG`, `SHUTDOWN`), tracks `-WRONGPASS` auth failures, and rate limits requests. |
| **[`mongodb`](https://github.com/routewarden/plugins/tree/develop/mongodb)** | `mongodb` | OP_MSG wire protocol inspection: tracks authentication errors (codes `18`, `334`), and intercepts destructive operations (`drop`, `dropDatabase`, `shutdown`). |
| **[`memcached`](https://github.com/routewarden/plugins/tree/develop/memcached)** | `memcached` | ASCII protocol firewall: intercepts admin commands (`flush_all`, `shutdown`), tracks invalid auth, and handles multi-key queries safely. |
| **[`tls_sni`](https://github.com/routewarden/plugins/tree/develop/tls_sni)** | `tls`, `tls-sni`, `https` | Transparent Layer 4 TLS ClientHello inspection to route or filter by domain name (SNI) without terminating TLS encryption or needing certificates. |
| **[`amqp`](https://github.com/routewarden/plugins/tree/develop/amqp)** | `amqp`, `rabbitmq` | AMQP 0-9-1 connection/channel frame inspection: decodes `Connection.StartOk` and tracks SASL PLAIN authentication failures. |
| **[`ldap`](https://github.com/routewarden/plugins/tree/develop/ldap)** | `ldap` | LDAPv3 ASN.1 BER message decoding: detects Simple Bind authentication failures (`resultCode: 49`) and mitigates dictionary attacks against Active Directory/OpenLDAP. |
| **[`vnc`](https://github.com/routewarden/plugins/tree/develop/vnc)** | `vnc`, `rfb` | RFB 3.3/3.7/3.8 protocol negotiation: tracks VNC authentication failures (`SecurityResult: 1`) and isolates remote desktop brute-force attempts. |
| **[`ftp`](https://github.com/routewarden/plugins/tree/develop/ftp)** | `ftp` | RFC 959 control connection inspection, `AUTH TLS`/`SSL` handover, anonymous login restrictions, and authentication error (`530`) triggers. |
| **[`mqtt`](https://github.com/routewarden/plugins/tree/develop/mqtt)** | `mqtt` | IoT broker protection: parses MQTT `CONNECT` packets, enforces maximum ClientID length, and blocks malicious ClientID prefixes. |
| **[`minecraft`](https://github.com/routewarden/plugins/tree/develop/minecraft)** | `minecraft` | Minecraft Java Server List Ping (SLP) inspector: blocks malformed handshake floods and enforces allowed protocol versions. |
| **[`echo_filter`](https://github.com/routewarden/plugins/tree/develop/echo_filter)** | `echo`, `stream-filter` | Bidirectional stream filter demonstrating real-time regex/keyword payload sanitization and interception. |

---

## Installation & Management

### 1. Command Line Installation

Install any plugin from the official repository or a local path:

```bash
# Using short name (pulls from official repository)
tcp-warden plugins install http
tcp-warden plugins install redis
tcp-warden plugins install postgres

# From custom Git URL
tcp-warden plugins install https://github.com/my-org/tcp-warden-kafka

# From local directory (for testing custom plugins)
tcp-warden plugins install ./my-plugin
```

::: tip What happens during installation?
1. **Source Staging**: Clones repository or copies local files.
2. **Manifest Validation**: Verifies `plugin.yaml` syntax and required fields.
3. **Automated Self-Test**: Runs `go test -v ./...` inside the plugin. If tests fail, the plugin is rejected to keep your proxy stable.
4. **Registration**: Adds import to `plugins/all/all.go`.
5. **Compilation**: Rebuilds the `tcp-warden` binary (skip with `--no-build`).
:::

### 2. Declarative Configuration (`tcp-warden.yaml`)

You can declare required plugins in `tcp-warden.yaml`. When the daemon starts, it automatically pulls and initializes any missing plugins:

```yaml
plugins:
  http:
    enabled: true
    source: "https://github.com/routewarden/plugins/http"
  redis:
    enabled: true
    source: "https://github.com/routewarden/plugins/redis"
  mongodb:
    enabled: true
    source: "https://github.com/routewarden/plugins/mongodb"
```

### 3. Managing Installed Plugins

```bash
# List all plugins and their status
tcp-warden plugins list

# Enable or disable a plugin
tcp-warden plugins enable redis
tcp-warden plugins disable redis

# Uninstall a plugin and recompile
tcp-warden plugins uninstall redis
```

---

## Plugin Configuration Examples

Below are common service configurations using official plugins:

### HTTP Guard (`http`)

Protects HTTP applications with Host header validation, User-Agent filtering, and regex path blocking:

```yaml
services:
  web_guard:
    listen: ":8080"
    upstream: "127.0.0.1:80"
    protocol: "http"
    rate_limit:
      connections_per_minute: 120
      burst: 30
    plugin_config:
      allowed_hosts:
        - "api.example.com"
        - "app.example.com"
      blocked_paths:
        - "^/admin(/.*)?$"
        - "\\.(env|git|bak|sql)$"
      blocked_headers:
        User-Agent: "(?i)(sqlmap|nikto|acunetix|masscan)"
```

### Database Protection (`postgres` & `mongodb`)

Tracks failed authentication attempts and blocks destructive operations:

```yaml
services:
  pg_bastion:
    listen: ":5432"
    upstream: "10.0.0.15:5432"
    protocol: "postgres"
    max_auth_failures: 3
    ban_duration: "2h"

  mongo_guard:
    listen: ":27017"
    upstream: "10.0.0.20:27017"
    protocol: "mongodb"
    max_auth_failures: 5
    plugin_config:
      blocked_ops:
        - "drop"
        - "dropDatabase"
        - "shutdown"
```

### In-Memory Cache Firewall (`redis`)

Blocks dangerous administrative commands while allowing application queries:

```yaml
services:
  redis_proxy:
    listen: ":6380"
    upstream: "127.0.0.1:6379"
    protocol: "redis"
    plugin_config:
      blocked_commands:
        - "FLUSHALL"
        - "FLUSHDB"
        - "CONFIG"
        - "SHUTDOWN"
```

### Transparent TLS SNI Routing (`tls_sni`)

Inspects the TLS `ClientHello` Server Name Indication (SNI) at Layer 4 and filters traffic by domain name without terminating TLS certificates:

```yaml
services:
  sni_proxy:
    listen: ":443"
    upstream: "10.0.0.10:443"
    protocol: "tls_sni"
    plugin_config:
      allowed_domains:
        - "*.example.com"
        - "example.com"
      blocked_domains:
        - "internal.example.com"
```

---

## Docker Persistence & Caching

When running in Docker, mount the named volume `tcp-warden-plugins` to `/var/lib/routewarden/plugins` to persist installed plugins across container restarts:

```yaml
services:
  tcp-warden:
    image: routewarden/tcp-warden:latest
    volumes:
      - tcp-warden-config:/etc/routewarden
      - tcp-warden-plugins:/var/lib/routewarden/plugins
      - tcp-warden-logs:/var/log/routewarden

volumes:
  tcp-warden-config:
  tcp-warden-plugins:
  tcp-warden-logs:
```

---

## Next Steps

- Want to create your own protocol inspector? Follow the [Plugin Development & Integration Guide](./plugin-development).
- Learn more about proxy listeners and port ranges in the [Configuration Reference](./configuration).
