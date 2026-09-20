# NGINX Cookbook & Recipes

Production patterns and ready-to-run configurations for deploying RouteWarden on **NGINX & OpenResty**.

---

## 1. Zero-Trust Admin & API Cloaking

Allow corporate VPN (`10.0.0.0/8`) and office IP (`192.168.1.100`) access to `/admin` and `/metrics` while returning a stealth 404 to public crawlers:

::: code-group

```json [routewarden.json]
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "pathPatterns": [
    "(?i)^/admin(/.*)?$",
    "(?i)^/metrics$"
  ],
  "allowPatterns": [
    "(?i)^/admin/health$"
  ],
  "allowedIps": [
    "10.0.0.0/8",
    "192.168.1.100"
  ],
  "methods": [
    "GET",
    "POST"
  ],
  "response": {
    "mode": "json",
    "statusCode": 404,
    "body": "{\"error\":\"Not Found\"}"
  }
}
```

```nginx [NGINX (OpenResty)]
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;/etc/nginx/lua/lib/?/init.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        warden = routewarden.new({
            enable_default_patterns = true,
            path_patterns = {
                "(?i)^/admin(/.*)?$",
                "(?i)^/metrics$"
            },
            allow_patterns = {
                "(?i)^/admin/health$"
            },
            allowed_ips = {
                "10.0.0.0/8",
                "192.168.1.100"
            },
            methods = { "GET", "POST" },
            response = {
                mode = "json",
                status_code = 404,
                body = '{"error":"Not Found"}'
            }
        })
    }

    server {
        listen 80;
        server_name app.example.com;

        access_by_lua_block {
            warden:check()
        }

        location / {
            proxy_pass http://backend_app:8080;
        }
    }
}
```

:::

---

## 2. Interactive Cloudflare Turnstile Challenge

Protect sensitive administrative or registration paths by presenting an interactive Cloudflare Turnstile challenge:

::: code-group

```json [routewarden.json]
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "pathPatterns": [
    "(?i)^/portal/sensitive(/.*)?$"
  ],
  "response": {
    "mode": "captcha",
    "statusCode": 403,
    "captcha": {
      "provider": "turnstile",
      "siteKey": "0x4AAAAAAAxxyyzz",
      "title": "Security Verification"
    }
  }
}
```

```nginx [NGINX (OpenResty)]
init_by_lua_block {
    local routewarden = require("resty.routewarden")

    warden = routewarden.new({
        path_patterns = {
            "(?i)^/portal/sensitive(/.*)?$"
        },
        response = {
            mode = "captcha",
            captcha = {
                provider = "turnstile",
                site_key = "0x4AAAAAAAxxyyzz",
                title = "Security Verification"
            }
        }
    })
}

server {
    listen 80;
    server_name portal.example.com;

    access_by_lua_block {
        warden:check()
    }

    location / {
        proxy_pass http://portal_backend:3000;
    }
}
```

:::

---

## 3. Honeypot Deception for Automated Scanners

Deceive vulnerability scanners targeting `.env` files and `.git` repositories by returning realistic synthetic mock data with HTTP 200 OK:

::: code-group

```json [routewarden.json]
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "response": {
    "mode": "fakeSuccess",
    "statusCode": 200
  }
}
```

```nginx [NGINX (OpenResty)]
init_by_lua_block {
    local routewarden = require("resty.routewarden")

    warden = routewarden.new({
        enable_default_patterns = true,
        response = {
            mode = "fakeSuccess",
            status_code = 200
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
        proxy_pass http://upstream_service:8080;
    }
}
```

:::

---

## 4. Gzip Bomb Active Defense

Neutralize aggressive scrapers and crawlers probing for backup archives or database dumps by delivering a 10MB gzip bomb that expands to ~10GB in client memory:

::: code-group

```json [routewarden.json]
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "pathPatterns": [
    "(?i)^/.*\\.(sql|dump|bak|tar\\.gz)$"
  ],
  "response": {
    "mode": "gzipBomb",
    "statusCode": 200,
    "gzipBombMB": 10
  }
}
```

```nginx [NGINX (OpenResty)]
init_by_lua_block {
    local routewarden = require("resty.routewarden")

    warden = routewarden.new({
        path_patterns = {
            "(?i)^/.*\\.(sql|dump|bak|tar\\.gz)$"
        },
        response = {
            mode = "gzipBomb",
            gzip_bomb_mb = 10
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
        proxy_pass http://upstream_service:8080;
    }
}
```

:::

---

## 5. Silent Connection Drop (HTTP 444)

Reset TCP connections immediately for high-risk intrusion attempts without returning any HTTP headers:

::: code-group

```json [routewarden.json]
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "pathPatterns": [
    "(?i)^/wp-admin(/.*)?$",
    "(?i)^/xmlrpc\\.php$"
  ],
  "response": {
    "mode": "silentDrop"
  }
}
```

```nginx [NGINX (OpenResty)]
init_by_lua_block {
    local routewarden = require("resty.routewarden")

    warden = routewarden.new({
        path_patterns = {
            "(?i)^/wp-admin(/.*)?$",
            "(?i)^/xmlrpc\\.php$"
        },
        response = {
            mode = "silentDrop"
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
        proxy_pass http://upstream_service:8080;
    }
}
```

:::
