---
title: Caddy Warden Changelog & Release Notes
description: Complete release history, directive updates, and migration notes for Caddy Warden (caddy-warden).
---

# Caddy Warden Changelog & Release Notes

All notable changes to the **Caddy Warden** module (`github.com/routewarden/caddy-warden`) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and Caddy Warden adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.2.1] - 2026-09-24 (Latest)

### Key Highlights

- **Query Parameter Attack Surface Hardening (`check_query`)**:
  - Validates both parameter keys and parameter values.
  - Prevents evasion attempts where sensitive targets are passed as query keys (e.g., `/?key=val&.env=`).
  - Added recursive anti-evasion normalization for candidate query parameter paths.
- **Client IP Extraction & Port/Bracket Normalization (`cleanIP`)**:
  - Handles client IPs with embedded ports (`192.168.1.1:8080`) or bracketed IPv6 formats (`[2001:db8::1]`) from reverse proxies or CDNs before CIDR evaluation.
- **Response Modes & Silent Drop Parity (`mode silentDrop`)**:
  - Standardized modern `mode silentDrop` syntax in Caddyfile and JSON configurations.
- **Honeypot Evaluation Scope (`fakeSuccess`)**:
  - Evaluates both normalized URL paths and raw request URIs to ensure honeypot decoys cannot be bypassed via URI manipulation.
- **Caddyfile Configuration Hardening**:
  - Added singular directive aliases (`path_pattern`, `block_pattern`, `allow_pattern`, `allowed_ip`) for configuration convenience.
  - Enforced top-level status code validation in `Validate()`.

---

## [v1.2.0] - 2026-09-24

### Key Highlights

- **RouteWarden CLI (`rwarden generate --target caddy`)**:
  - Added direct compilation from universal `routewarden.json` policy manifests into native `route_warden` Caddyfile blocks.
- **Caddyfile Block Parsing Enhancements (`caddyfile.go`)**:
  - Enhanced parsing for nested response settings, headers, and custom tarpit/captcha properties.
- **Unified Versioning Automation**:
  - Integrated `scripts/update-version.sh` for atomic updates across `version.json`, `README.md`, and Caddy docs.

---

## [v1.1.0] - 2026-09-20

### Key Highlights

- **Expanded Default Block Patterns**:
  - Built-in coverage for private keys (`*.pem`, `*.key`), container manifests (`Dockerfile*`, `docker-compose*.yml`), `.DS_Store`, and CMS configs (`wp-config.php*`, `settings.py`).
- **Header Smuggling Protection (`check_headers`)**:
  - Configurable header list (`X-Forwarded-Uri`, `X-Rewrite-URL`, `X-Original-URL`, etc.) with recursive normalization.
- **Path Normalizer Fuzz Testing**:
  - Integrated fuzz testing (`FuzzExtractCandidatePaths`) for Caddy URL normalization pipelines.

---

## [v1.0.0] - 2026-09-20

### Key Highlights

- **Official Caddy v2 Module GA Release**:
  - Seamless integration via `xcaddy build --with github.com/routewarden/caddy-warden`.
  - Native `route_warden` Caddyfile directive and dynamic Caddy JSON API support.
  - Full support for all 13 response modes (`tarpit`, `gzipBomb`, `fakeSuccess`, `captcha`, `silentDrop`, etc.).
  - Automatic order declaration: `order route_warden before reverse_proxy`.
  - Structured security logging (`security_log true`) compatible with CrowdSec.

---

## [v0.3.x Series] (Archived)

- **HTTP Method Constraints (`method <verbs...>`)**: Granular verb filtering in Caddyfile and JSON matchers.
- **Diagnostic Logging (`debug true`)**: Verbose stdout diagnostic traces of candidate path transformations.
- **CrowdSec Auto-Ban Logging (`security_log true`)**: Emits single-line JSON block audit events to stdout.
