# Getting Started with RouteWarden for NGINX & OpenResty

**RouteWarden for NGINX** (`github.com/routewarden/nginx-warden`) provides zero-dependency Lua middleware for OpenResty and NGINX servers equipped with `lua-nginx-module`. It executes inside worker processes during the `access_by_lua` phase to filter malicious requests before reverse-proxying.

---

## Prerequisites

- **OpenResty** (v1.19+ recommended) OR
- **Standard NGINX** compiled with:
  - `lua-nginx-module` (v0.10.15+)
  - `ngx_devel_kit` (NDK)
  - LuaJIT 2.1

---

## Installation Methods

### Option 1: Docker with OpenResty (Recommended)

The simplest deployment uses the official `openresty/openresty:alpine` image:

```dockerfile
FROM openresty/openresty:alpine

# Copy RouteWarden into OpenResty Lua library search path
COPY lib/resty/routewarden /usr/local/openresty/site/lualib/resty/routewarden

# Copy your NGINX configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

Run container:

```bash
docker run -d -p 80:80 -p 443:443 --name my-web-proxy my-openresty-app
```

### Option 2: Docker Compose

```yaml
services:
  nginx:
    image: openresty/openresty:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./lib/resty/routewarden:/usr/local/openresty/site/lualib/resty/routewarden:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - backend

  backend:
    image: hashicorp/http-echo
    command: ["-text=Hello from backend"]
```

### Option 3: Manual Installation on Existing NGINX

1. Clone or download `nginx-warden`:
   ```bash
   git clone https://github.com/routewarden/nginx-warden.git /etc/nginx/lua/nginx-warden
   ```

2. Point `lua_package_path` to the library inside the `http {}` block in `/etc/nginx/nginx.conf`:
   ```nginx
   http {
       lua_package_path "/etc/nginx/lua/nginx-warden/lib/?.lua;/etc/nginx/lua/nginx-warden/lib/?/init.lua;;";
       ...
   }
   ```

---

## Configuration

You can configure RouteWarden in OpenResty using either **`routewarden.json` (Recommended JSON Schema)** or inline Lua tables directly in `nginx.conf`.

### Option 1: `routewarden.json` (Recommended Universal Schema)

#### How `routewarden.json` Works with NGINX & OpenResty

Rather than hardcoding security rules directly into `nginx.conf`, OpenResty loads your centralized `routewarden.json` file at worker startup via `cjson.decode()` and initializes `routewarden.new(cfg)`. 

This enables you to:
1. Validate rules offline with `rwarden validate --config /etc/nginx/routewarden.json` before reloading NGINX.
2. Share the exact same security policy across NGINX, Traefik, and Caddy clusters without rewriting syntax.
3. Benefit from JSON Schema IDE autocompletion and linting in your repositories.

::: code-group

```json [/etc/nginx/routewarden.json]
// Validate: rwarden validate --config /etc/nginx/routewarden.json (or via docker: docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest validate --config /routewarden.json)
// Generate OpenResty Lua table for nginx.conf:
//   CLI:    rwarden generate --target nginx --config routewarden.json
//   Docker: docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target nginx --config /routewarden.json
{
  "$schema": "https://routewarden.github.io/cli/schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "enableDefaultAllowPatterns": true,
  "checkQuery": true,
  "checkHeaders": ["X-Forwarded-Uri", "X-Rewrite-URL"],
  "allowedIps": ["127.0.0.1", "10.0.0.0/8"],
  "methods": ["GET", "POST"],
  "response": {
    "mode": "json",
    "statusCode": 403,
    "body": "{\"error\":\"Forbidden\",\"message\":\"Blocked by RouteWarden Shield\"}"
  }
}
```

```nginx [/etc/nginx/nginx.conf]
http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;

    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    # Step 1: Load external routewarden.json on worker init
    init_by_lua_block {
        local cjson = require("cjson")
        local routewarden = require("resty.routewarden")

        local f = io.open("/etc/nginx/routewarden.json", "r")
        if f then
            local content = f:read("*all")
            f:close()
            local cfg = cjson.decode(content)
            warden = routewarden.new(cfg)
        else
            ngx.log(ngx.ERR, "Failed to load routewarden.json, falling back to defaults")
            warden = routewarden.new({ enabled = true })
        end
    }

    server {
        listen 80;
        server_name example.com;

        # Step 2: Hook RouteWarden into request access phase
        access_by_lua_block {
            warden:check()
        }

        location / {
            proxy_pass http://backend_upstream;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

:::

Validate before reloading NGINX:

::: code-group

```bash [CLI]
rwarden validate --config /etc/nginx/routewarden.json
```

```bash [Docker]
docker run --rm -v /etc/nginx:/etc/nginx:ro ghcr.io/routewarden/cli:latest validate --config /etc/nginx/routewarden.json
```

:::

---

### Option 2: Inline Lua Configuration

If you prefer keeping your configuration entirely in `nginx.conf`:

```nginx
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        warden = routewarden.new({
            enabled = true,
            security_log = true,
            enable_default_patterns = true,
            methods = { "GET", "HEAD" },
            allowed_ips = {
                "127.0.0.1",
                "10.0.0.0/8"
            },
            response = {
                mode = "json",
                status_code = 403
            }
        })
    }

    server {
        listen 80;
        server_name example.com;

        access_by_lua_block {
            warden:check()
        }

        location / {
            proxy_pass http://backend_upstream;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

---

## Verification

Send a benign request:

```bash
curl -I http://localhost/index.html
# HTTP/1.1 200 OK
```

Test protection against sensitive files:

```bash
curl -i http://localhost/.env
# HTTP/1.1 403 Forbidden
# Content-Type: application/json
# {"status":403,"error":"Forbidden","message":"Access denied: sensitive route"}
```

Test anti-evasion double URL-encoded payload:

```bash
curl -i "http://localhost/%252e%252e/.env"
# HTTP/1.1 403 Forbidden
```

Exempt trusted IP:

```bash
curl -i -H "X-Forwarded-For: 10.0.1.5" http://localhost/.env
# Passes through to upstream
```

---

## Next Steps

- Explore [Using routewarden.json in Production](/core/cli#using-routewarden-json-in-production).
- Review [NGINX Configuration Reference](/nginx/configuration) for all directives and options.
- Read [Production Recipes & Blueprints](/nginx/examples) for Kubernetes Ingress and Docker configurations.
