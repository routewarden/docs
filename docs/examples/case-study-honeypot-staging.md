# Case Study: Honeypot Deflection & Tarpit Scanning Sink

This case study demonstrates how to use RouteWarden to deflect reconnaissance bots and malicious vulnerability scanners into honeypots or silent TCP drops.

---

## The Threat Model

Public IPv4 and IPv6 addresses receive continuous automated requests looking for `.env`, `/phpinfo.php`, `/.git`, and common vulnerable endpoints. 

While returning an HTTP `403 Forbidden` or `404 Not Found` works, scanners will often continue iterating through hundreds of file paths, consuming reverse proxy bandwidth and generating thousands of log lines.

---

## Strategy A: Silent Connection Drops (`mode: silentDrop` / `silent_drop`)

Rather than allocating memory buffers and sending an HTTP status response, RouteWarden's `silentDrop` mode closes the underlying TCP connection immediately (or returns an empty payload).

::: code-group

```yaml [Traefik (YAML)]
http:
  middlewares:
    scanner-drop:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          # Close connection immediately on probe attempts
          response:
            mode: silentDrop
```

```nginx [Caddy (Caddyfile)]
example.com {
    route_warden {
        enable_default_patterns true
        response {
            mode silent_drop
        }
    }
    reverse_proxy backend:8080
}
```

```nginx [NGINX (OpenResty)]
# nginx.conf: Silent TCP Connection Drop (HTTP 444)
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        drop_warden = routewarden.new({
            enable_default_patterns = true,
            response = {
                mode = "silentDrop"
            }
        })
    }

    server {
        listen 80;
        server_name example.com;

        access_by_lua_block {
            drop_warden:check()
        }

        location / {
            proxy_pass http://backend:8080;
        }
    }
}
```

```toml [Traefik (TOML)]
# dynamic_conf.toml
[http.middlewares.scanner-drop.plugin.routewarden]
  enabled = true
  enableDefaultPatterns = true

[http.middlewares.scanner-drop.plugin.routewarden.response]
  mode = "silentDrop"
```

```bash [Traefik (CLI / Docker Labels)]
- "traefik.http.middlewares.scanner-drop.plugin.routewarden.enabled=true"
- "traefik.http.middlewares.scanner-drop.plugin.routewarden.enableDefaultPatterns=true"
- "traefik.http.middlewares.scanner-drop.plugin.routewarden.response.mode=silentDrop"
```

:::

### Result:
- Port scanners receive a connection reset (`TCP RST` or EOF).
- Automated vulnerability tools flag the endpoint as dead or unresponsive, prompting them to abandon the host.
- Zero server bandwidth spent delivering HTML error bodies.

---

## Strategy B: External Honeypot Deflection (`mode: redirect`)

When an attacker accesses any sensitive file pattern, RouteWarden can issue an HTTP `302/307 Redirect` to an external honeypot, a public loopback (`http://127.0.0.1`), or an FBI/IC3 reporting endpoint:

::: code-group

```yaml [Traefik (YAML)]
http:
  middlewares:
    honeypot-deflect:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          response:
            mode: redirect
            statusCode: 307
            redirectUrl: "https://honeypot.internal.corp/capture"
            headers:
              X-RouteWarden-Deflected: "true"
```

```nginx [Caddy (Caddyfile)]
example.com {
    route_warden {
        enable_default_patterns true
        response {
            mode redirect
            status_code 307
            redirect_url "https://honeypot.internal.corp/capture"
        }
    }
    reverse_proxy backend:8080
}
```

```nginx [NGINX (OpenResty)]
# nginx.conf: Honeypot Redirection
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        honeypot_warden = routewarden.new({
            enable_default_patterns = true,
            response = {
                mode = "redirect",
                status_code = 307,
                redirect_url = "https://honeypot.internal.corp/capture",
                headers = {
                    ["X-RouteWarden-Deflected"] = "true"
                }
            }
        })
    }

    server {
        listen 80;
        server_name example.com;

        access_by_lua_block {
            honeypot_warden:check()
        }

        location / {
            proxy_pass http://backend:8080;
        }
    }
}
```

```toml [Traefik (TOML)]
# dynamic_conf.toml
[http.middlewares.honeypot-deflect.plugin.routewarden]
  enabled = true
  enableDefaultPatterns = true

[http.middlewares.honeypot-deflect.plugin.routewarden.response]
  mode = "redirect"
  statusCode = 307
  redirectUrl = "https://honeypot.internal.corp/capture"

[http.middlewares.honeypot-deflect.plugin.routewarden.response.headers]
  X-RouteWarden-Deflected = "true"
```

```bash [Traefik (CLI / Docker Labels)]
- "traefik.http.middlewares.honeypot-deflect.plugin.routewarden.enabled=true"
- "traefik.http.middlewares.honeypot-deflect.plugin.routewarden.enableDefaultPatterns=true"
- "traefik.http.middlewares.honeypot-deflect.plugin.routewarden.response.mode=redirect"
- "traefik.http.middlewares.honeypot-deflect.plugin.routewarden.response.statusCode=307"
- "traefik.http.middlewares.honeypot-deflect.plugin.routewarden.response.redirectUrl=https://honeypot.internal.corp/capture"
- "traefik.http.middlewares.honeypot-deflect.plugin.routewarden.response.headers.X-RouteWarden-Deflected=true"
```

:::

---

## Strategy C: Staging & Preview Environment Cloaking

For pull-request preview environments (e.g., `pr-142.staging.example.com`), competitors or automated crawlers shouldn't index unreleased code:

::: code-group

```yaml [Traefik (YAML)]
http:
  middlewares:
    staging-guard:
      plugin:
        routewarden:
          enabled: true
          # Block everything by default
          pathPatterns:
            - '^/.*$'
          # Disable standard public exemptions (robots.txt, sitemap.xml)
          enableDefaultAllowPatterns: false
          # Allow exclusively developer and office subnets
          allowedIps:
            - "10.0.0.0/8"
            - "100.64.0.0/10" # Tailscale
            - "203.0.113.50/32" # Corporate NAT IP
          response:
            mode: json
            statusCode: 404
            body: '{"error":"Not Found"}'
```

```nginx [Caddy (Caddyfile)]
pr-142.staging.example.com {
    route_warden {
        enable_default_allow_patterns false
        path_patterns "^/.*$"
        allowed_ips "10.0.0.0/8" "100.64.0.0/10" "203.0.113.50/32"
        response {
            mode json
            status_code 404
            body "{\"error\":\"Not Found\"}"
        }
    }
    reverse_proxy preview-app:3000
}
```

```nginx [NGINX (OpenResty)]
# nginx.conf: Staging & Preview Cloaking
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        staging_warden = routewarden.new({
            enable_default_allow_patterns = false,
            path_patterns = {
                "^/.*$"
            },
            allowed_ips = {
                "10.0.0.0/8",
                "100.64.0.0/10",
                "203.0.113.50/32"
            },
            response = {
                mode = "json",
                status_code = 404,
                body = '{"error":"Not Found"}'
            }
        })
    }

    server {
        listen 80;
        server_name pr-142.staging.example.com;

        access_by_lua_block {
            staging_warden:check()
        }

        location / {
            proxy_pass http://preview-app:3000;
        }
    }
}
```

```toml [Traefik (TOML)]
# dynamic_conf.toml
[http.middlewares.staging-guard.plugin.routewarden]
  enabled = true
  enableDefaultAllowPatterns = false
  pathPatterns = ["^/.*$"]
  allowedIps = ["10.0.0.0/8", "100.64.0.0/10", "203.0.113.50/32"]

[http.middlewares.staging-guard.plugin.routewarden.response]
  mode = "json"
  statusCode = 404
  body = '{"error":"Not Found"}'
```

```bash [Traefik (CLI / Docker Labels)]
- "traefik.http.middlewares.staging-guard.plugin.routewarden.enabled=true"
- "traefik.http.middlewares.staging-guard.plugin.routewarden.enableDefaultAllowPatterns=false"
- "traefik.http.middlewares.staging-guard.plugin.routewarden.pathPatterns=^/.*$"
- "traefik.http.middlewares.staging-guard.plugin.routewarden.allowedIps=10.0.0.0/8,100.64.0.0/10,203.0.113.50/32"
- "traefik.http.middlewares.staging-guard.plugin.routewarden.response.mode=json"
- "traefik.http.middlewares.staging-guard.plugin.routewarden.response.statusCode=404"
- 'traefik.http.middlewares.staging-guard.plugin.routewarden.response.body={"error":"Not Found"}'
```

:::

---

## Strategy D: Active Defense with Gzip Bomb (`mode: gzipBomb` / `gzip_bomb`)

When automated reconnaissance scanners (`nikto`, `gobuster`, `dirsearch`, or credential stuffers) probe for sensitive configuration files (`.env`, `wp-config.php`, `/actuator/env`), returning a 403/404 allows them to swiftly move to the next URL on their wordlist.

With RouteWarden's `gzipBomb` mode (alias: `bomb`), the middleware serves a **valid HTTP 200 response with `Content-Encoding: gzip`** consisting of a stream of compressed zero bytes.

::: code-group

```yaml [Traefik (YAML)]
http:
  middlewares:
    honeypot-bomber:
      plugin:
        routewarden:
          enabled: true
          pathPatterns:
            # Lure crawlers scanning for high-value targets
            - '(?i)(^|/)(\.env.*|\.git.*|wp-login\.php|phpmyadmin.*)$'
          response:
            mode: gzipBomb         # Alias: "bomb"
            statusCode: 200        # Looks like a jackpot 200 OK to the crawler
            gzipBombMB: 10         # 10MB uncompressed expands ~1000x to ~10GB in client memory
```

```nginx [Caddy (Caddyfile)]
honeypot.example.com {
    route_warden {
        path_patterns "(?i)(^|/)(\.env.*|\.git.*|wp-login\.php|phpmyadmin.*)$"
        response {
            mode gzip_bomb
            status_code 200
            gzip_bomb_mb 10
        }
    }
    reverse_proxy honeypot-sink:80
}
```

```nginx [NGINX (OpenResty)]
# nginx.conf: Gzip Bomb Active Defense
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        bomb_warden = routewarden.new({
            path_patterns = {
                "(?i)(^|/)(\\.env.*|\\.git.*|wp-login\\.php|phpmyadmin.*)$"
            },
            response = {
                mode = "gzipBomb",
                status_code = 200,
                gzip_bomb_mb = 10
            }
        })
    }

    server {
        listen 80;
        server_name honeypot.example.com;

        access_by_lua_block {
            bomb_warden:check()
        }

        location / {
            proxy_pass http://honeypot-sink:80;
        }
    }
}
```

```toml [Traefik (TOML)]
# dynamic_conf.toml
[http.middlewares.honeypot-bomber.plugin.routewarden]
  enabled = true
  pathPatterns = ["(?i)(^|/)(\\.env.*|\\.git.*|wp-login\\.php|phpmyadmin.*)$"]

[http.middlewares.honeypot-bomber.plugin.routewarden.response]
  mode = "gzipBomb"
  statusCode = 200
  gzipBombMB = 10
```

```bash [Traefik (CLI / Docker Labels)]
- "traefik.http.middlewares.honeypot-bomber.plugin.routewarden.enabled=true"
- "traefik.http.middlewares.honeypot-bomber.plugin.routewarden.pathPatterns=(?i)(^|/)(\\.env.*|\\.git.*|wp-login\\.php|phpmyadmin.*)$"
- "traefik.http.middlewares.honeypot-bomber.plugin.routewarden.response.mode=gzipBomb"
- "traefik.http.middlewares.honeypot-bomber.plugin.routewarden.response.statusCode=200"
- "traefik.http.middlewares.honeypot-bomber.plugin.routewarden.response.gzipBombMB=10"
```

:::

### How the Gzip Bomb Neutralizes Scanners:
1. **Negligible Server Cost**: The server streams compressed zeroes via Traefik. Transmitting a 10 MB payload over the wire requires only a few kilobytes of bandwidth and tiny CPU cycles.
2. **Client Memory Exhaustion (OOM)**: Most automated crawler libraries (`requests`, `urllib3`, Go/Python scrapers) auto-decompress gzip responses in RAM. When the stream expands to 10+ GB, the attacker's crawler crashes from out-of-memory errors or locks up its worker pool.
3. **Scan Halting**: The attacker's scanning process terminates, preventing further probing across your infrastructure.

::: warning CAUTION: Impact on Legitimate Crawlers & Browsers
Legitimate web browsers and search engine indexers (such as **Googlebot**, **Bingbot**, or **Applebot**) automatically decompress gzip content encoding. 

- **Do NOT bind `gzipBomb` as a global entrypoint catch-all** across all application routes.
- **Always keep `enableDefaultAllowPatterns: true`** (or explicitly whitelist `/robots.txt` and `/sitemap.xml`) so search engine indexers are never trapped.
- **Only target explicit, high-confidence exploit paths** that standard human users and valid search spiders will never request (e.g., `^/\.env`, `^/\.git`, `^/wp-login\.php`, `^/phpmyadmin`).
:::

---

## Strategy E: Tarpit Scanning Sink (`mode: tarpit`)

Rather than dropping or bombing the connection, RouteWarden's **Reverse Slowloris Tarpit** stalls scanner concurrency pools by accepting requests to probe endpoints with a `200 OK` header and trickling individual bytes at slow, deliberate intervals.

Because automated vulnerability tools (`sqlmap`, `nikto`, `nuclei`) operate with finite worker thread pools (typically 10–50 concurrent workers), tying up sockets on honeypot routes paralyzes their scanning capacity.

::: code-group

```yaml [Traefik (YAML)]
http:
  middlewares:
    tarpit-sink:
      plugin:
        routewarden:
          enabled: true
          pathPatterns:
            - '(?i)^/(phpmyadmin|pma|wp-login\.php|\.env|\.git.*)$'
          response:
            mode: tarpit
            statusCode: 200
            tarpitDelayMs: 1000            # Trickle 1 byte every 1000ms
            tarpitMaxDurationSeconds: 120  # Release socket after 2 minutes
```

```nginx [Caddy (Caddyfile)]
honeypot.example.com {
    route_warden {
        path_patterns "(?i)^/(phpmyadmin|pma|wp-login\.php|\.env|\.git.*)$"
        response {
            mode tarpit
            status_code 200
            tarpit_delay_ms 1000
            tarpit_max_duration_seconds 120
        }
    }
    reverse_proxy honeypot-sink:80
}
```

```nginx [NGINX (OpenResty)]
# nginx.conf: Reverse Slowloris Tarpit
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        tarpit_warden = routewarden.new({
            path_patterns = {
                "(?i)^/(phpmyadmin|pma|wp-login\\.php|\\.env|\\.git.*)$"
            },
            response = {
                mode = "tarpit",
                status_code = 200,
                tarpit_delay_ms = 1000,
                tarpit_max_duration_seconds = 120
            }
        })
    }

    server {
        listen 80;
        server_name honeypot.example.com;

        access_by_lua_block {
            tarpit_warden:check()
        }

        location / {
            proxy_pass http://honeypot-sink:80;
        }
    }
}
```

```toml [Traefik (TOML)]
# dynamic_conf.toml
[http.middlewares.tarpit-sink.plugin.routewarden]
  enabled = true
  pathPatterns = ["(?i)^/(phpmyadmin|pma|wp-login\\.php|\\.env|\\.git.*)$"]

[http.middlewares.tarpit-sink.plugin.routewarden.response]
  mode = "tarpit"
  statusCode = 200
  tarpitDelayMs = 1000
  tarpitMaxDurationSeconds = 120
```

```bash [Traefik (CLI / Docker Labels)]
- "traefik.http.middlewares.tarpit-sink.plugin.routewarden.enabled=true"
- "traefik.http.middlewares.tarpit-sink.plugin.routewarden.pathPatterns=(?i)^/(phpmyadmin|pma|wp-login\\.php|\\.env|\\.git.*)$"
- "traefik.http.middlewares.tarpit-sink.plugin.routewarden.response.mode=tarpit"
- "traefik.http.middlewares.tarpit-sink.plugin.routewarden.response.statusCode=200"
- "traefik.http.middlewares.tarpit-sink.plugin.routewarden.response.tarpitDelayMs=1000"
- "traefik.http.middlewares.tarpit-sink.plugin.routewarden.response.tarpitMaxDurationSeconds=120"
```

:::

### Result:
- The crawler's active thread pool is occupied for up to 120 seconds per probing thread.
- Scanning velocity against your legitimate applications drops to near-zero.
- The connection cleanly closes after `tarpitMaxDurationSeconds` to protect reverse proxy file descriptor limits.

