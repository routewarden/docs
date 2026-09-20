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

## Basic Configuration

Configure RouteWarden in `nginx.conf`:

```nginx
worker_processes 1;
error_log /dev/stderr warn;

events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;

    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;/etc/nginx/lua/lib/?/init.lua;;";

    # Step 1: Initialize RouteWarden in the init_by_lua phase
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
