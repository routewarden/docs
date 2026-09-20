# RouteWarden for NGINX & OpenResty

**RouteWarden for NGINX** (`github.com/routewarden/nginx-warden`) is the official OpenResty / NGINX Lua security module. It runs directly inside NGINX worker memory during the `access_by_lua` evaluation phase, intercepting reconnaissance bots, path traversal attacks, and probes for sensitive files before requests reach upstream applications.

---

## Capabilities Overview

- **In-Memory Lua Engine**: High-performance request inspection running on LuaJIT without upstream proxy latency or external network roundtrips.
- **Automated Asset Shielding**: Blocks scanner attempts targeting `.env`, `.git`, `.aws`, `.ssh`, database dumps (`.sql`, `.tar.gz`, `.bak`), server status endpoints (`/actuator`, `phpinfo.php`), and package manager manifests.
- **Anti-Evasion Normalization**: Transparently strips semicolon matrix parameters (`/;param/.env`), resolves nested percent-encoding (`%252e%252e`), converts Windows backslashes (`\`), and strips null bytes (`%00`).
- **Flexible Network Filtering**: Whitelists trusted CIDR subnets (`10.0.0.0/8`) and client IPs (`127.0.0.1`, `::1`) with native support for `X-Forwarded-For` and `X-Real-IP`.
- **Active Defense Modes**: Respond with custom JSON errors, branded HTML pages, interactive Turnstile/hCaptcha challenges, silent drops, or bot-neutralizing gzip decompression bombs.
- **Query Parameter Inspection**: Optional deep inspection of URI query strings for sensitive file targets.
- **CrowdSec-Compatible Logging**: Outputs structured JSON security events on stdout for SIEM threat monitoring and 1-strike firewall bans.

---

## Quick Navigation

| Guide | Description |
|---|---|
| [**Getting Started**](/nginx/getting-started) | Docker setup, OpenResty installation, and lua-nginx-module configuration. |
| [**Configuration Reference**](/nginx/configuration) | Directives, options, and response configurations for `nginx.conf`. |
| [**Recipes & Blueprints**](/nginx/examples) | Real-world NGINX configurations for API cloaking, honeypots, and allowlists. |

---

## Configuration Preview

```nginx
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;/etc/nginx/lua/lib/?/init.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        warden = routewarden.new({
            enabled = true,
            enable_default_patterns = true,
            path_patterns = {
                "(?i)^/admin(/.*)?$",
                "(?i)^/api/internal(/.*)?$"
            },
            allowed_ips = {
                "10.0.0.0/8",
                "192.168.1.100"
            },
            response = {
                mode = "json",
                status_code = 404,
                body = '{"error":"Not Found","message":"Endpoint unavailable"}'
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
