# Commands Reference

`rwarden` provides a unified command-line interface for path testing, configuration verification, schema export, and gateway generation.

---

## 1. Test URL Paths & Queries (`test`)

Simulate candidate path extraction, normalization, and pattern matching on an arbitrary path without starting Traefik, Caddy, or NGINX:

::: code-group

```bash [CLI]
# Test a sensitive file path (positional or --path)
rwarden test /.env
rwarden test --path "/.env"

# Test double URL encoding anti-evasion
rwarden test "/static/%252e%252e/.env"

# Test query string inspection (-q or --query)
rwarden test -q "file=secret.conf" /search

# Test custom HTTP methods (-X, -m, or --method)
rwarden test -X POST /wp-config.php

# Test custom HTTP headers (-H or --header, repeatable)
rwarden test -H "X-Forwarded-Uri: /.env" /api

# Test against a custom RouteWarden config file (-c or --config)
rwarden test -c routewarden.json /admin/dashboard

# Test client IP whitelisting
rwarden test -c routewarden.json --ip "10.0.0.1" /admin

# Pipe configuration via stdin
cat routewarden.json | rwarden test -c - /admin
```

```bash [Docker]
# Test a sensitive path
docker run --rm ghcr.io/routewarden/cli:latest test /.env

# Test double URL encoding anti-evasion
docker run --rm ghcr.io/routewarden/cli:latest test "/static/%252e%252e/.env"

# Test evasion via query inspection
docker run --rm ghcr.io/routewarden/cli:latest test -q "file=secret.conf" /search

# Test against custom config file
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest test -c /routewarden.json --ip "10.0.0.1" /admin
```

:::

### Flags

| Flag | Type | Default | Description |
|:---|:---|:---|:---|
| `[path]`, `--path` | string | `""` | Request path to evaluate (e.g. `/.env` or `/api/v1`) |
| `-c`, `--config` | string | `""` | Path to `routewarden.json` (or `-` for stdin) |
| `-q`, `--query` | string | `""` | Query string to evaluate for path evasion payloads |
| `-X`, `-m`, `--method` | string | `"GET"` | HTTP method (e.g. `GET`, `POST`, `HEAD`) |
| `-H`, `--header` | string | `""` | Optional header in `Key:Value` format (repeatable) |
| `--ip` | string | `""` | Client IP address to evaluate against `allowedIps` |
| `--check-query` | bool | `true` | Enable or disable query string inspection |

### Example Output

```text
🔍 Testing: GET /static/%252e%252e/.env
  Candidate paths extracted (2):
    - /static/%252e%252e/.env
    - /.env

Result: 🛑 BLOCKED (HTTP Status 403)
  Reason:  block_pattern_match
  Target:  /.env
  Pattern: (?i)\.env
```

---

## 2. Validate Configurations (`validate`)

Validate a RouteWarden JSON or TCP Warden YAML configuration file before deploying:

::: code-group

```bash [CLI]
# Validate routewarden.json directly (positional or --config)
rwarden validate routewarden.json
rwarden validate -c routewarden.json

# Auto-detects routewarden.json in current directory if omitted
rwarden validate

# Validate tcp-warden.yaml configuration
rwarden validate tcp-warden.yaml

# Validate piped config via stdin
cat routewarden.json | rwarden validate -c -
```

```bash [Docker]
# Validate mounted config file
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest validate --config /routewarden.json

# Validate mounted tcp-warden.yaml file
docker run --rm -v $(pwd)/tcp-warden.yaml:/tcp-warden.yaml ghcr.io/routewarden/cli:latest validate --config /tcp-warden.yaml
```

:::

### Example Output

```text
✔ Schema validation passed: routewarden.json is valid!
  - 14 built-in block patterns active
  - 5 allow rules configured
  - Response mode: json (HTTP 403)
  - 3 allowed IP CIDR blocks evaluated
```

---

## 3. Output JSON Schema (`schema`)

Output the official RouteWarden JSON Schemas directly to stdout:

::: code-group

```bash [CLI]
# Output HTTP Gateway Schema (routewarden.json)
rwarden schema > routewarden.schema.json

# Output TCP Warden L4 Proxy Schema (tcp-warden.yaml)
rwarden schema --tcp > tcp-warden.schema.json
```

```bash [Docker]
docker run --rm ghcr.io/routewarden/cli:latest schema > routewarden.schema.json
```

:::

---

## 4. Generate Gateway Configs (`generate`)

Compile a universal `routewarden.json` policy into target reverse proxy syntax:

::: code-group

```bash [CLI]
# Traefik: dynamic YAML middleware definition
rwarden generate traefik-yaml routewarden.json > traefik-middleware.yaml

# Traefik: dynamic TOML middleware definition
rwarden generate traefik-toml routewarden.json > traefik-middleware.toml

# Traefik: Docker Compose labels block
rwarden generate traefik-labels routewarden.json

# Caddy: Caddyfile directive block
rwarden generate caddy routewarden.json

# NGINX / OpenResty: Lua init table for nginx.conf
rwarden generate nginx routewarden.json

# TCP Warden: tcp-warden.yaml configuration
rwarden generate tcp-warden routewarden.json > tcp-warden.yaml
```

```bash [Docker]
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate traefik-yaml /routewarden.json
```

:::

### Supported Targets

| Target | Alias | Description |
|:---|:---|:---|
| `traefik-yaml` | `traefik`, `yaml` | Traefik Dynamic File Provider YAML |
| `traefik-toml` | `toml` | Traefik Dynamic File Provider TOML |
| `traefik-labels` | `labels`, `compose` | Docker Compose container label syntax |
| `caddy` | `caddyfile` | Native Caddyfile `route_warden` directive block |
| `nginx` | `openresty`, `lua` | OpenResty `init_by_lua_block` Lua table |
| `tcp-warden` | `tcp`, `l4` | TCP Warden daemon YAML configuration |

---

## 5. Live Gateway Sandbox (`sandbox`)

Spin up an ephemeral, isolated container running Traefik, Caddy, or NGINX loaded with your security policy for live testing:

::: code-group

```bash [CLI]
# Start a Traefik sandbox on localhost:8080
rwarden sandbox traefik routewarden.json

# Start a Caddy sandbox with automatic test suite execution
rwarden sandbox caddy routewarden.json --test

# Start an NGINX sandbox in detached background mode
rwarden sandbox nginx routewarden.json --detach

# Dry-run: view generated container command without launching
rwarden sandbox traefik routewarden.json --dry-run
```

:::

### Sandbox Testing Probes

When running in sandbox mode, you can execute HTTP requests against `http://localhost:8080`:

```bash
# Sensitive file attack (should return 403 Forbidden)
curl -i http://localhost:8080/.env

# Directory traversal attempt (should return 403 Forbidden)
curl -i "http://localhost:8080/static/..%2f.env"

# Safe RFC endpoint (should return 200 or upstream response)
curl -i http://localhost:8080/robots.txt
```

---

## 6. Cleanup Sandbox Containers (`cleanup`)

Stop and remove all running or detached RouteWarden sandbox test containers:

```bash
rwarden cleanup
```

---

## 7. Version Information (`version`)

Check installed binary version:

```bash
rwarden version
```
