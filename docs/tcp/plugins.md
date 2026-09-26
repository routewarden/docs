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

| Plugin | Protocol(s) | What it does |
| :--- | :--- | :--- |
| **[`http`](https://github.com/routewarden/plugins/tree/develop/http)** | `http` | Blocks vulnerability scanners (User-Agent), regex path attacks (e.g. `/.env`, `/admin`), and validates Host headers. Transparent WebSocket pass-through. |
| **[`postgres`](https://github.com/routewarden/plugins/tree/develop/postgres)** | `postgres`, `postgresql` | Catches failed password attempts (`28P01`) and automatically bans brute-force bots targeting PostgreSQL. |
| **[`mysql`](https://github.com/routewarden/plugins/tree/develop/mysql)** | `mysql`, `mariadb` | Detects Access Denied errors (`1045`) and mitigates credential brute-forcing against MySQL and MariaDB. |
| **[`redis`](https://github.com/routewarden/plugins/tree/develop/redis)** | `redis`, `resp` | Command firewall: blocks dangerous commands (`FLUSHALL`, `CONFIG`, `SHUTDOWN`) and bans repeated wrong passwords (`-WRONGPASS`). Supports RESP2 & RESP3. |
| **[`mongodb`](https://github.com/routewarden/plugins/tree/develop/mongodb)** | `mongodb` | Wire protocol firewall: blocks destructive commands (`drop`, `dropDatabase`, `shutdown`) and bans failed authentications. |
| **[`memcached`](https://github.com/routewarden/plugins/tree/develop/memcached)** | `memcached` | Protects caches by blocking administrative wipe commands (`flush_all`) and tracking unauthorized attempts. |
| **[`tls_sni`](https://github.com/routewarden/plugins/tree/develop/tls_sni)** | `tls`, `tls-sni`, `https` | Inspects domain names (SNI) at Layer 4 to allow, block, or route domains without needing TLS certificates or decryption. |
| **[`amqp`](https://github.com/routewarden/plugins/tree/develop/amqp)** | `amqp`, `rabbitmq` | Protects RabbitMQ and AMQP brokers by tracking SASL authentication failures and malicious connection frames. |
| **[`ldap`](https://github.com/routewarden/plugins/tree/develop/ldap)** | `ldap` | Detects failed LDAP bind attempts (`resultCode: 49`) to protect Active Directory and OpenLDAP from credential stuffing. |
| **[`vnc`](https://github.com/routewarden/plugins/tree/develop/vnc)** | `vnc`, `rfb` | Protects remote desktop servers by detecting and banning VNC brute-force login attempts. |
| **[`ftp`](https://github.com/routewarden/plugins/tree/develop/ftp)** | `ftp` | Monitors control connections, restricts anonymous logins, and blocks repeated FTP authentication failures (`530`). |
| **[`mqtt`](https://github.com/routewarden/plugins/tree/develop/mqtt)** | `mqtt` | Protects IoT brokers by enforcing valid client IDs and blocking scanner or bot prefixes. |
| **[`minecraft`](https://github.com/routewarden/plugins/tree/develop/minecraft)** | `minecraft` | Protects game servers from ping floods, malformed handshake packets, and unsupported client versions. |
| **[`echo_filter`](https://github.com/routewarden/plugins/tree/develop/echo_filter)** | `echo`, `stream-filter` | Example bidirectional stream filter that inspects and sanitizes text keywords in real time. |

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
