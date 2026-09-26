---
title: TCP Warden CLI Reference
description: Complete command-line interface documentation for tcp-warden subcommands and flags.
---

# CLI Reference

The `tcp-warden` binary provides built-in subcommands for starting the proxy, validating YAML configuration, installing modular protocol plugins, and managing active IP bans.

---

## Global Syntax

```bash
tcp-warden [command] [flags]
```

---

## Commands

### `run` (Default)

Starts the TCP proxy daemon and binds configured service listeners.

```bash
# Run with default config (auto-resolves ./tcp-warden.yaml or /etc/routewarden/tcp-warden.yaml)
tcp-warden run

# Run with custom configuration file
tcp-warden run --config /etc/routewarden/custom.yaml
```

| Flag | Shorthand | Description | Default |
| :--- | :--- | :--- | :--- |
| `--config` | `-c` | Path to YAML configuration file | `tcp-warden.yaml` |

---

### `validate`

Validates YAML syntax, port collisions, CIDR format, and protocol dependencies without starting listeners.

```bash
tcp-warden validate --config /etc/routewarden/tcp-warden.yaml
```

**Exit Codes**:
* `0`: Configuration is valid.
* `1`: Syntax or rule validation error (details printed to `stderr`).

---

### `plugins`

Subcommands for discovering, installing, testing, and managing modular protocol inspectors.

#### `plugins list`
Displays all installed modular plugins, versions, protocols, and current activation status:
```bash
tcp-warden plugins list
```

#### `plugins install`
Pulls a plugin from a Git repository or local folder, runs pre-flight tests, and registers the plugin:
```bash
# Install using official plugin short name
tcp-warden plugins install http
tcp-warden plugins install redis
tcp-warden plugins install postgres

# Install from custom Git repository
tcp-warden plugins install https://github.com/routewarden/plugins/postgres

# Install from local source directory
tcp-warden plugins install ../plugins/redis

# Force re-download and bypass cache
tcp-warden plugins install mysql --force
```

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--force` | Overwrite existing installation and purge cache | `false` |
| `--no-build` | Skip rebuilding the `tcp-warden` binary | `false` |
| `--cache-dir` | Path to plugin cache directory | `$ROUTEWARDEN_PLUGINS_CACHE` |

#### `plugins enable`
Tests the plugin using synthetic net.Pipe self-tests and enables it in `tcp-warden.yaml`:
```bash
tcp-warden plugins enable postgres
```

#### `plugins disable`
Disables an active plugin and sets `enabled: false` in `tcp-warden.yaml`:
```bash
tcp-warden plugins disable postgres
```

#### `plugins test`
Executes in-memory self-tests across all registered plugins:
```bash
tcp-warden plugins test
```

#### `plugins uninstall`
Removes plugin source, unregisters import, and rebuilds the binary:
```bash
tcp-warden plugins uninstall postgres
```

---

### `status`

Queries metrics from a running daemon via the management API:

```bash
tcp-warden status --api http://127.0.0.1:9091
```

---

### `banlist`

Displays active IP bans, offending services, and remaining expiration times:

```bash
tcp-warden banlist --api http://127.0.0.1:9091
```

---

### `ban`

Manually ban an IP address across all services:

```bash
tcp-warden ban 198.51.100.55 --duration 24h --reason "manual audit block"
```

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--duration` | Ban expiration duration (e.g. `1h`, `24h`, `7d`) | `1h` |
| `--reason` | Human-readable reason for the ban | `manual ban` |
| `--api` | Management API base URL | `http://127.0.0.1:9091` |

---

### `unban`

Removes an active ban for a specific IP address:

```bash
tcp-warden unban 198.51.100.55
```

---

### `version`

Displays the compiled version, Git commit hash, and build timestamp:

```bash
tcp-warden version
```
