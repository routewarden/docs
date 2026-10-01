---
title: NGINX Warden Changelog & Release Notes
description: Complete release history, OpenResty Lua updates, and migration notes for NGINX Warden (nginx-warden).
---

# NGINX Warden Changelog & Release Notes

All notable changes to **NGINX Warden** (`github.com/routewarden/nginx-warden`) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and NGINX Warden adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.2.1] - 2026-09-24 (Latest)

### Key Highlights

- **Query Parameter Attack Surface Hardening (`check_query`)**:
  - OpenResty Lua inspector evaluates both parameter keys and parameter values.
  - Prevents query key injection bypasses (`/?sensitive_file=value` or `/?settings.py=`).
- **Client IP Extraction & Port/Bracket Normalization (`clean_ip`)**:
  - Automatically strips port suffixes (`:8080`) and IPv6 brackets (`[...]`) from `X-Forwarded-For` and `X-Real-IP` headers prior to CIDR evaluation.
- **OpenResty Concurrency Bug Fix**:
  - Made the `compiled` cache table strictly local within `compile_regex` to prevent race conditions across concurrent requests in OpenResty worker processes.
- **Default Security Logging (`security_log = true`)**:
  - Enabled `security_log = true` by default in `config.lua` for multi-gateway parity with Traefik and Caddy.
- **Lua Regex Hyphen Escaping**:
  - Escaped hyphens (`%-`) outside character classes in fallback pure-Lua pattern matching, preventing Lua's `-` magic quantifier from misinterpreting regexes in environments without PCRE.
- **Configuration Parsing Aliases**:
  - Added support for singular aliases (`path_pattern`, `block_pattern`, `allow_pattern`, `allowed_ip`) and single-string values in configuration tables.
- **Silent Drop Event Parity**:
  - Fixed security event logger to accurately emit `action = "silentDrop"` when silent drop (HTTP 444) triggers.

---

## [v1.2.0] - 2026-09-24

### Key Highlights

- **RouteWarden CLI Compilation Target (`--target nginx`)**:
  - `rwarden generate --target nginx` generates production-ready `init_by_lua_block` Lua configuration tables directly from `routewarden.json`.
- **Enhanced Test Suites (`test_config.lua`)**:
  - Comprehensive unit test suites validating configuration tables, singular aliases, and CIDR checks.

---

## [v1.1.0] - 2026-09-20

### Key Highlights

- **Worker-Level Regex Caching**:
  - Reuses compiled PCRE matchers across repeated requests and instances to minimize LuaJIT GC pressure.
- **Context Auto-Population**:
  - Enhanced `warden:check()` to automatically extract HTTP method, URI, query string, remote address, and headers directly from `ngx` context when called without arguments.
- **Expanded Default Block Patterns**:
  - Coverage for private keys (`*.pem`, `*.key`), container manifests (`Dockerfile*`), `.DS_Store`, and CMS configs.

---

## [v1.0.0] - 2026-09-20

### Key Highlights

- **Initial GA Release of `nginx-warden`**:
  - Production-ready Lua middleware for OpenResty and NGINX with `lua-nginx-module`.
  - Executes directly inside worker memory during the `access_by_lua` phase without extra proxy latency.
  - Zero external dependencies: pure OpenResty standard libraries (`ngx.re`, `resty.string`, bit operations).
  - Complete parity with Go implementations:
    - Multi-layer recursive percent-decoding (`%252e%252e`).
    - Semicolon matrix parameter stripping (`/;param/.env`).
    - Windows backslash normalization (`\..\`).
    - Null-byte injection scrubbing (`%00`).
    - Canonical path resolution and dot-segment traversal protection.
  - Full suite of 13 response modes supported including HTTP 444 silent drops and reverse slowloris tarpits.
  - Structured JSON security logging compatible with CrowdSec parsers.
