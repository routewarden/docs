---
title: Security Observability Stack (Grafana, Loki & Alloy) — RouteWarden CLI
description: Turnkey cloud-native security dashboard and log parsing with Grafana, Loki, and Alloy for Traefik, Caddy, NGINX, and TCP Warden.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 0. Architecture Overview Mermaid & Diagram Snippet ─────────────────────
const mermaid_raw = `flowchart LR
    subgraph Gateways ["RouteWarden Gateways"]
        T["Traefik"]
        C["Caddy"]
        N["NGINX"]
        TCP["TCP Warden"]
    end

    subgraph Shipper ["Log Collector"]
        A["Grafana Alloy\\n(Container & File Discovery)"]
    end

    subgraph Engine ["Log Storage"]
        L["Grafana Loki\\n(LogQL Indexing)"]
    end

    subgraph UI ["Observability & SIEM"]
        G["Grafana\\n(Pre-configured Dashboard)"]
    end

    T -->|JSON logs| A
    C -->|JSON logs| A
    N -->|JSON logs| A
    TCP -->|JSON logs| A

    A -->|loki.write| L
    L -->|LogQL| G`

const arch_mermaid = buildSnippet({
  lang: 'mermaid',
  code: mermaid_raw,
})

const arch_graph_svg = `<div class="rw-graph-container">
  <svg viewBox="0 0 1280 272" fill="none" xmlns="http://www.w3.org/2000/svg" class="rw-graph-svg">
    <defs>
      <linearGradient id="grad-gateways" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6366f1" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#6366f1" stop-opacity="0.01"/>
      </linearGradient>
      <linearGradient id="grad-alloy" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.02"/>
      </linearGradient>
      <linearGradient id="grad-loki" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f97316" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#f97316" stop-opacity="0.02"/>
      </linearGradient>
      <linearGradient id="grad-grafana" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ec4899" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#ec4899" stop-opacity="0.02"/>
      </linearGradient>
      <!-- Arrow markers — larger, overflow=visible prevents clipping -->
      <marker id="arrow-indigo" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="10" markerHeight="10" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#6366f1"/>
      </marker>
      <marker id="arrow-amber" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="10" markerHeight="10" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#f59e0b"/>
      </marker>
      <marker id="arrow-orange" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="10" markerHeight="10" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#f97316"/>
      </marker>
    </defs>

    <!-- ═══════════════════════════════════════════════════════════════
         Layout (x coords)  — 120 px connector corridors:
           Gateways  x=12   w=200  right=212
           Gap-1     212→332  (120 px)  label @ x=272
           Alloy     x=332  w=185  right=517
           Gap-2     517→637  (120 px)  label @ x=577
           Loki      x=637  w=185  right=822
           Gap-3     822→942  (120 px)  label @ x=882
           Grafana   x=942  w=210  right=1152
         viewBox: 1280 × 272
    ═══════════════════════════════════════════════════════════════ -->

    <!-- 1. GATEWAYS -->
    <rect x="12" y="12" width="200" height="248" rx="10" class="rw-g-box" fill="url(#grad-gateways)"/>
    <text x="24" y="32" class="rw-g-header">ROUTEWARDEN GATEWAYS</text>

    <rect x="22" y="44" width="180" height="44" rx="6" class="rw-g-node"/>
    <circle cx="38" cy="66" r="5" fill="#00a8cc"/>
    <text x="52" y="62" class="rw-g-title">Traefik</text>
    <text x="52" y="77" class="rw-g-desc">HTTP/S Reverse Proxy</text>

    <rect x="22" y="94" width="180" height="44" rx="6" class="rw-g-node"/>
    <circle cx="38" cy="116" r="5" fill="#14b8a6"/>
    <text x="52" y="112" class="rw-g-title">Caddy</text>
    <text x="52" y="127" class="rw-g-desc">Auto-HTTPS Gateway</text>

    <rect x="22" y="144" width="180" height="44" rx="6" class="rw-g-node"/>
    <circle cx="38" cy="166" r="5" fill="#10b981"/>
    <text x="52" y="162" class="rw-g-title">NGINX</text>
    <text x="52" y="177" class="rw-g-desc">OpenResty Lua Edge</text>

    <rect x="22" y="194" width="180" height="44" rx="6" class="rw-g-node"/>
    <circle cx="38" cy="216" r="5" fill="#6366f1"/>
    <text x="52" y="212" class="rw-g-title">TCP Warden</text>
    <text x="52" y="227" class="rw-g-desc">Layer 4 TCP &amp; UDP Shield</text>

    <!-- Connector 1 (120 px): fan-in → Alloy  (merge @ x=265, arrow→332) -->
    <circle cx="212" cy="66"  r="3.5" fill="#6366f1"/>
    <circle cx="212" cy="116" r="3.5" fill="#6366f1"/>
    <circle cx="212" cy="166" r="3.5" fill="#6366f1"/>
    <circle cx="212" cy="216" r="3.5" fill="#6366f1"/>
    <path d="M 212 66  C 245 66,  245 142, 265 142" stroke="#6366f1" stroke-width="2" fill="none" opacity="0.75"/>
    <path d="M 212 116 C 242 116, 245 142, 265 142" stroke="#6366f1" stroke-width="2" fill="none" opacity="0.75"/>
    <path d="M 212 166 C 242 166, 245 142, 265 142" stroke="#6366f1" stroke-width="2" fill="none" opacity="0.75"/>
    <path d="M 212 216 C 245 216, 245 142, 265 142" stroke="#6366f1" stroke-width="2" fill="none" opacity="0.75"/>
    <line x1="265" y1="142" x2="328" y2="142" stroke="#6366f1" stroke-width="3" marker-end="url(#arrow-indigo)"/>
    <!-- pill centred at x=272 -->
    <rect x="237" y="116" width="70" height="22" rx="6" class="rw-g-pill"/>
    <text x="272" y="131" text-anchor="middle" class="rw-g-pill-txt" fill="#6366f1">JSON logs</text>

    <!-- 2. ALLOY -->
    <rect x="332" y="12" width="185" height="248" rx="10" class="rw-g-box" fill="url(#grad-alloy)"/>
    <text x="344" y="32" class="rw-g-header" fill="#d97706">LOG COLLECTOR</text>

    <rect x="342" y="44" width="165" height="198" rx="8" class="rw-g-card"/>
    <rect x="342" y="44" width="165" height="36" rx="8" fill="#f59e0b" fill-opacity="0.12"/>
    <circle cx="360" cy="62" r="6" fill="#f59e0b"/>
    <text x="372" y="67" class="rw-g-card-title">Grafana Alloy</text>

    <text x="354" y="102" class="rw-g-tag" fill="#d97706">OpenTelemetry Shipper</text>
    <text x="354" y="124" class="rw-g-item">• Docker socket discovery</text>
    <text x="354" y="143" class="rw-g-item">• loki.process JSON parse</text>
    <text x="354" y="162" class="rw-g-item">• Structured label index</text>
    <text x="354" y="181" class="rw-g-item">• UDP Syslog (1514/udp)</text>

    <rect x="354" y="200" width="141" height="24" rx="4" class="rw-g-port-box"/>
    <text x="424" y="216" text-anchor="middle" class="rw-g-port-txt">HTTP :12345 · UDP :1514</text>

    <!-- Connector 2 (120 px): Alloy → Loki  (517→637, arrow→637) -->
    <circle cx="517" cy="142" r="3.5" fill="#f59e0b"/>
    <line x1="517" y1="142" x2="633" y2="142" stroke="#f59e0b" stroke-width="3" marker-end="url(#arrow-amber)"/>
    <!-- pill centred at x=577 -->
    <rect x="542" y="116" width="70" height="22" rx="6" class="rw-g-pill"/>
    <text x="577" y="131" text-anchor="middle" class="rw-g-pill-txt" fill="#d97706">loki.write</text>

    <!-- 3. LOKI -->
    <rect x="637" y="12" width="185" height="248" rx="10" class="rw-g-box" fill="url(#grad-loki)"/>
    <text x="649" y="32" class="rw-g-header" fill="#ea580c">LOG STORAGE</text>

    <rect x="647" y="44" width="165" height="198" rx="8" class="rw-g-card"/>
    <rect x="647" y="44" width="165" height="36" rx="8" fill="#f97316" fill-opacity="0.12"/>
    <circle cx="665" cy="62" r="6" fill="#f97316"/>
    <text x="677" y="67" class="rw-g-card-title">Grafana Loki</text>

    <text x="659" y="102" class="rw-g-tag" fill="#ea580c">High-Perf Chunk Storage</text>
    <text x="659" y="124" class="rw-g-item">• TSDB index &amp; retention</text>
    <text x="659" y="143" class="rw-g-item">• Fast stream metadata</text>
    <text x="659" y="162" class="rw-g-item">• LogQL query execution</text>
    <text x="659" y="181" class="rw-g-item">• Zero-config container</text>

    <rect x="659" y="200" width="141" height="24" rx="4" class="rw-g-port-box"/>
    <text x="729" y="216" text-anchor="middle" class="rw-g-port-txt">HTTP API :3100</text>

    <!-- Connector 3 (120 px): Loki → Grafana  (822→942, arrow→942) -->
    <circle cx="822" cy="142" r="3.5" fill="#f97316"/>
    <line x1="822" y1="142" x2="938" y2="142" stroke="#f97316" stroke-width="3" marker-end="url(#arrow-orange)"/>
    <!-- pill centred at x=882 -->
    <rect x="847" y="116" width="70" height="22" rx="6" class="rw-g-pill"/>
    <text x="882" y="131" text-anchor="middle" class="rw-g-pill-txt" fill="#ea580c">LogQL</text>

    <!-- 4. GRAFANA -->
    <rect x="942" y="12" width="210" height="248" rx="10" class="rw-g-box" fill="url(#grad-grafana)"/>
    <text x="954" y="32" class="rw-g-header" fill="#db2777">OBSERVABILITY &amp; SIEM</text>

    <rect x="952" y="44" width="190" height="198" rx="8" class="rw-g-card"/>
    <rect x="952" y="44" width="190" height="36" rx="8" fill="#ec4899" fill-opacity="0.12"/>
    <circle cx="970" cy="62" r="6" fill="#ec4899"/>
    <text x="982" y="67" class="rw-g-card-title">Grafana</text>

    <text x="964" y="102" class="rw-g-tag" fill="#db2777">Security SIEM UI</text>
    <text x="964" y="124" class="rw-g-item">• Live Threat Matrix</text>
    <text x="964" y="143" class="rw-g-item">• GeoIP World Map</text>
    <text x="964" y="162" class="rw-g-item">• HTTP &amp; UDP metrics</text>
    <text x="964" y="181" class="rw-g-item">• Pre-built dashboard</text>

    <rect x="964" y="200" width="158" height="24" rx="4" class="rw-g-port-box"/>
    <text x="1043" y="216" text-anchor="middle" class="rw-g-port-txt">Web UI :3000</text>
  </svg>
</div>`

const plain_flowchart = `┌────────────────────────────────────────────────────────┐
│               RouteWarden Gateways                     │
│  [Traefik]      [Caddy]      [NGINX]      [TCP Warden] │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ (JSON Security Events)
┌────────────────────────────────────────────────────────┐
│           Log Collector — Grafana Alloy                │
│  • Container auto-discovery via /var/run/docker.sock   │
│  • loki.process JSON parsing & label extraction        │
│  • Ingests network UDP syslog on port 1514/udp         │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ (loki.write)
┌────────────────────────────────────────────────────────┐
│            Log Storage — Grafana Loki                  │
│  • High-efficiency compressed TSDB chunk store         │
│  • Indexed stream labels (gateway, verdict, proto)     │
│  • Ultra-fast LogQL queries and aggregation            │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ (LogQL)
┌────────────────────────────────────────────────────────┐
│        Observability & SIEM — Grafana UI               │
│  • Pre-configured "RouteWarden Overview" Dashboard     │
│  • Live Threat Matrix, Top IPs & GeoIP World Maps      │
│  • Unified correlation for Layer 7 HTTP & Layer 4 UDP  │
└────────────────────────────────────────────────────────┘`

const arch_plain = buildSnippet({
  lang: 'plaintext',
  code: plain_flowchart,
})

const archSnippets = computed(() => ({
  cli: [
    { filename: 'Architecture Graph', lang: 'mermaid', code: mermaid_raw, html: arch_graph_svg, hasDiff: false },
    // { filename: 'Plain Flowchart', lang: 'plaintext', code: arch_plain.cleanCode, html: arch_plain.html, hasDiff: false },
    // { filename: 'Mermaid Source', lang: 'mermaid', code: arch_mermaid.cleanCode, html: arch_mermaid.html, hasDiff: false },
  ],
}))

// ─── 1. CLI Management Snippets ─────────────────────────────────────────────
const dashboard_up = buildSnippet({
  lang: 'bash',
  code: `# 1. Start the observability stack (launches Grafana at http://localhost:3000)
rwarden dashboard

# 2. Start on custom ports without auto-opening the browser
rwarden dashboard up --port 8080 --loki-port 3100 --no-open`,
})

const dashboard_status = buildSnippet({
  lang: 'bash',
  code: `# View running status of Grafana, Loki, and Alloy containers
rwarden dashboard status`,
})

const dashboard_down = buildSnippet({
  lang: 'bash',
  code: `# Stop the observability stack
rwarden dashboard down`,
})

const dashboard_export = buildSnippet({
  lang: 'bash',
  code: `# Export docker-compose.yml, config.alloy, and Grafana dashboard files to a local directory
rwarden dashboard export ./deploy/observability`,
})

const cliSnippets = computed(() => ({
  cli: [
    { filename: 'Launch Stack', lang: 'bash', code: dashboard_up.cleanCode, html: dashboard_up.html, hasDiff: false },
    { filename: 'Check Status', lang: 'bash', code: dashboard_status.cleanCode, html: dashboard_status.html, hasDiff: false },
    { filename: 'Stop Stack', lang: 'bash', code: dashboard_down.cleanCode, html: dashboard_down.html, hasDiff: false },
    { filename: 'Export Configs', lang: 'bash', code: dashboard_export.cleanCode, html: dashboard_export.html, hasDiff: false },
  ],
}))

// ─── 2. UDP Log Support Snippets ────────────────────────────────────────────
const udp_event_json = buildSnippet({
  lang: 'json',
  code: `{
  "timestamp": "2026-10-01T15:30:00Z",
  "plugin": "tcp-warden",
  "service": "dns",
  "protocol": "dns",
  "transport": "udp",
  "client_ip": "198.51.100.22",
  "action": "blocked",
  "reason": "blocked_domain"
}`,
})

const udp_syslog_cmd = buildSnippet({
  lang: 'bash',
  code: `# Stream raw JSON security log directly over network UDP (port 1514)
echo '{"verdict":"BLOCK","client_ip":"203.0.113.195","path":"/.env","gateway":"traefik"}' | nc -u -w0 127.0.0.1 1514`,
})

const udpSnippets = computed(() => ({
  cli: [
    { filename: 'Layer 4 UDP Event', lang: 'json', code: udp_event_json.cleanCode, html: udp_event_json.html, hasDiff: false },
    { filename: 'Send UDP Syslog', lang: 'bash', code: udp_syslog_cmd.cleanCode, html: udp_syslog_cmd.html, hasDiff: false },
  ],
}))

// ─── 2b. Opt-In Container Logging Snippets ──────────────────────────────────
const optin_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  traefik:
    image: traefik:v3.3
    container_name: traefik
    labels:
      - "routewarden.logs=true"

  caddy:
    image: caddy:2-alpine
    container_name: caddy
    labels:
      - "routewarden.logs=true"

  tcp-warden:
    image: ghcr.io/routewarden/tcp-warden:latest
    container_name: tcp-warden
    labels:
      - "routewarden.logs=true"`,
})

const optin_cli = buildSnippet({
  lang: 'bash',
  code: `# Run Traefik with RouteWarden logging enabled
docker run -d \\
  --name my-gateway \\
  --label routewarden.logs=true \\
  -p 80:80 \\
  traefik:v3.3

# Run TCP Warden daemon with RouteWarden logging enabled
docker run -d \\
  --name my-tcp-warden \\
  --label routewarden.logs=true \\
  -p 2222:2222 \\
  ghcr.io/routewarden/tcp-warden:latest`,
})

const optinSnippets = computed(() => ({
  cli: [
    { filename: 'Docker Compose', lang: 'yaml', code: optin_compose.cleanCode, html: optin_compose.html, hasDiff: false },
    { filename: 'Docker CLI', lang: 'bash', code: optin_cli.cleanCode, html: optin_cli.html, hasDiff: false },
  ],
}))

// ─── 3. Standalone Docker Compose Deployment Snippets ───────────────────────
const export_cmd = buildSnippet({
  lang: 'bash',
  code: `# 1. Export stack configuration files
rwarden dashboard export ./observability
cd ./observability

# 2. Start containers with Docker Compose
docker compose up -d`,
})

const export_cmd_docker = buildSnippet({
  lang: 'bash',
  code: `# Export configs using the RouteWarden CLI container image
# (no local rwarden binary required)
docker run --rm \\
  -v "$(pwd)/observability:/data" \\
  ghcr.io/routewarden/cli:latest \\
  dashboard export /data

# The exported directory now contains:
#  observability/
#  ├── docker-compose.yml
#  ├── config.alloy
#  ├── loki-config.yaml
#  └── grafana/
#      ├── provisioning/
#      └── dashboards/routewarden-overview.json

# Bring the full stack up with Docker Compose
cd observability
docker compose up -d

# Check logs
docker compose logs -f

# Tear down (volumes are preserved)
docker compose down`,
})

const exportSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden export', lang: 'bash', code: export_cmd.cleanCode, html: export_cmd.html, hasDiff: false },
    { filename: 'Docker container', lang: 'bash', code: export_cmd_docker.cleanCode, html: export_cmd_docker.html, hasDiff: false },
  ],
}))

const compose_file = buildSnippet({
  lang: 'yaml',
  code: `services:
  loki:
    image: grafana/loki:3.0.0
    container_name: routewarden-loki
    restart: unless-stopped
    command: -config.file=/etc/loki/loki-config.yaml
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/loki-config.yaml:ro
      - loki-data:/loki
    networks:
      - routewarden-observability

  alloy:
    image: grafana/alloy:v1.1.0
    container_name: routewarden-alloy
    restart: unless-stopped
    command: run --server.http.listen-addr=0.0.0.0:12345 --storage.path=/var/lib/alloy/data /etc/alloy/config.alloy
    ports:
      - "12345:12345"
      - "1514:1514/udp"
    volumes:
      - ./config.alloy:/etc/alloy/config.alloy:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /var/log:/var/log:ro
    depends_on:
      - loki
    networks:
      - routewarden-observability

  grafana:
    image: grafana/grafana:11.0.0
    container_name: routewarden-grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer
      - GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH=/var/lib/grafana/dashboards/routewarden-overview.json
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - ./grafana/dashboards:/var/lib/grafana/dashboards:ro
      - grafana-data:/var/lib/grafana
    depends_on:
      - loki
    networks:
      - routewarden-observability

volumes:
  loki-data:
  grafana-data:

networks:
  routewarden-observability:
    name: routewarden-observability`,
})

const composeSnippets = computed(() => ({
  cli: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: compose_file.cleanCode, html: compose_file.html, hasDiff: false },
  ],
}))

// ─── Grafana Environment Configuration Snippets ──────────────────────────────
const grafana_env_override = buildSnippet({
  lang: 'yaml',
  code: `# docker-compose.override.yml — place next to docker-compose.yml
# Run: docker compose up -d  (override is merged automatically)
services:
  grafana:
    environment:
      # ── Admin credentials ──────────────────────────────────────────────────
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=your-strong-password
      - GF_SECURITY_SECRET_KEY=your-32-char-secret-key

      # ── Anonymous access (read-only, no login required) ───────────────────
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_NAME=Main Org.
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer

      # ── Disable user sign-up (recommended for public-facing instances) ────
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_USERS_AUTO_ASSIGN_ORG_ROLE=Viewer

      # ── Server & base URL ─────────────────────────────────────────────────
      - GF_SERVER_ROOT_URL=https://grafana.example.com
      - GF_SERVER_DOMAIN=grafana.example.com

      # ── SMTP / email alerting ─────────────────────────────────────────────
      - GF_SMTP_ENABLED=true
      - GF_SMTP_HOST=smtp.example.com:587
      - GF_SMTP_USER=grafana@example.com
      - GF_SMTP_PASSWORD=smtp-password
      - GF_SMTP_FROM_ADDRESS=grafana@example.com
      - GF_SMTP_FROM_NAME=RouteWarden Alerts

      # ── Default home dashboard (pre-provisioned RouteWarden panel) ────────
      - GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH=/var/lib/grafana/dashboards/routewarden-overview.json`,
})

const grafana_env_oauth = buildSnippet({
  lang: 'yaml',
  code: `# docker-compose.override.yml — GitHub OAuth SSO example
services:
  grafana:
    environment:
      # ── GitHub OAuth ───────────────────────────────────────────────────────
      - GF_AUTH_GITHUB_ENABLED=true
      - GF_AUTH_GITHUB_CLIENT_ID=your-github-client-id
      - GF_AUTH_GITHUB_CLIENT_SECRET=your-github-client-secret
      - GF_AUTH_GITHUB_SCOPES=user:email,read:org
      - GF_AUTH_GITHUB_AUTH_URL=https://github.com/login/oauth/authorize
      - GF_AUTH_GITHUB_TOKEN_URL=https://github.com/login/oauth/access_token
      - GF_AUTH_GITHUB_API_URL=https://api.github.com/user
      # Restrict to members of a specific GitHub org/team:
      - GF_AUTH_GITHUB_ALLOWED_ORGANIZATIONS=my-org
      - GF_AUTH_GITHUB_TEAM_IDS=123456

      # ── Google OAuth ───────────────────────────────────────────────────────
      # - GF_AUTH_GOOGLE_ENABLED=true
      # - GF_AUTH_GOOGLE_CLIENT_ID=your-google-client-id
      # - GF_AUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret
      # - GF_AUTH_GOOGLE_ALLOWED_DOMAINS=example.com
      # - GF_AUTH_GOOGLE_SCOPES=https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email`,
})

const grafana_env_cli = buildSnippet({
  lang: 'bash',
  code: `# Pass env vars directly to rwarden dashboard up
# All GF_* variables are forwarded to the Grafana container
rwarden dashboard up \\
  --port 3000 \\
  --env GF_SECURITY_ADMIN_PASSWORD=mysecret \\
  --env GF_SMTP_ENABLED=true \\
  --env GF_SMTP_HOST=smtp.example.com:587 \\
  --env GF_AUTH_GITHUB_ENABLED=true \\
  --env GF_AUTH_GITHUB_CLIENT_ID=abc123 \\
  --env GF_AUTH_GITHUB_CLIENT_SECRET=xyz789

# Or export first, edit docker-compose.override.yml, then bring the stack up:
rwarden dashboard export ./observability
cd ./observability
# Edit docker-compose.override.yml with your GF_* values
docker compose up -d`,
})

const grafanaEnvSnippets = computed(() => ({
  cli: [
    { filename: 'docker-compose.override.yml', lang: 'yaml', code: grafana_env_override.cleanCode, html: grafana_env_override.html, hasDiff: false },
    { filename: 'OAuth / SSO', lang: 'yaml', code: grafana_env_oauth.cleanCode, html: grafana_env_oauth.html, hasDiff: false },
    { filename: 'rwarden dashboard up', lang: 'bash', code: grafana_env_cli.cleanCode, html: grafana_env_cli.html, hasDiff: false },
  ],
}))
</script>

# Security Observability Stack (Grafana, Loki & Alloy)

RouteWarden includes a complete, cloud-native security observability stack powered by **Grafana**, **Grafana Loki**, and **Grafana Alloy**.

It continuously ingests, parses, indexes, and visualizes structured security events across all your RouteWarden gateways (**Traefik**, **Caddy**, **NGINX**, and **TCP Warden**) with zero manual dashboard setup.

---

## Architecture Overview

<CodeViewer :snippets="archSnippets" />

### Components

1. **Grafana Alloy**: The modern OpenTelemetry-based collector (successor to Promtail). It discovers local Docker containers via `/var/run/docker.sock` and host logs, parses RouteWarden JSON events (`loki.process`), extracts indexed labels (`verdict`, `status_code`, `gateway`, `method`, `protocol`, `transport`), and attaches structured metadata (`client_ip`, `path`, `matched_pattern`, `rule_id`, `service`).
2. **Grafana Loki**: Scalable, high-efficiency log aggregation engine that indexes metadata and provides lightning-fast LogQL queries.
3. **Grafana**: Pre-provisioned with the **"RouteWarden — Threat & Security Intelligence"** dashboard, pre-configured Loki data source, and ready-to-use panels.

### UDP Log Support

The stack handles UDP logs across two key dimensions:

- **Layer 4 UDP Protocol Security Events**: TCP Warden guards UDP protocols (such as DNS on port 53, BitTorrent DHT/uTP, and custom UDP services). Blocked datagrams, session flood triggers, and protocol violations emit structured JSON events. Alloy automatically extracts `transport="udp"`, `protocol="dns"`, and normalizes `action="blocked"` into `verdict="BLOCK"`, seamlessly integrating Layer 4 UDP defenses into your Grafana security panels alongside Layer 7 HTTP events.
- **Network UDP Syslog Ingestion**: Grafana Alloy listens on **UDP port 1514** (`0.0.0.0:1514/udp`) via `loki.source.syslog`. You can stream raw syslog or JSON events directly over network UDP from external proxies, routers, and firewalls into Loki.

<CodeViewer :snippets="udpSnippets" />

### Container Discovery & Opt-In Logging

RouteWarden Observability uses Grafana Alloy to discover Docker containers via `/var/run/docker.sock`. It operates on a **pure opt-in model** to eliminate log noise, avoid guessing based on container names, and ensure the observability stack never logs itself or unrelated containers on your host:

#### How to Enable Logging for a Container

To send security logs from any gateway container (Traefik, Caddy, NGINX, or TCP Warden) to RouteWarden's dashboard, add the `routewarden.logs=true` (or `routewarden=true`) label to the container:

<CodeViewer :snippets="optinSnippets" />

#### Why Pure Opt-In?

1. **Zero Self-Logging**: Containers belonging to the observability stack (`routewarden-loki`, `routewarden-alloy`, `routewarden-grafana`) are never scraped because they do not carry the opt-in label.
2. **Zero Host Pollution**: Other containers running on the Docker host (databases, caching servers, unrelated web apps) are completely ignored by default.
3. **No Brittle Name Pattern Matching**: Container naming conventions (`my-nginx`, `staging-proxy`, `prod-traefik`) do not matter—only containers you explicitly designate with `routewarden.logs=true` are ingested.
4. **Secondary Security Log Filter (`stage.drop`)**: Even within opted-in containers, non-security noise (such as container startup banners or plain-text health probes) that lacks structured RouteWarden security fields (`verdict` or `action`) is safely discarded before reaching Loki.

---

## Pre-Configured Dashboard Features

The embedded Grafana dashboard (`routewarden-overview.json`) includes:

- **Key Security Counters**: Real-time stats for Blocked Attacks, Total Inspected Events, Whitelist Bypasses, and Attack Ratio percentage.
- **Attack Timelines**: Multi-series time chart grouping events by verdict (`BLOCK` in red, `ALLOW` in green, `BYPASS` in blue).
- **Verdict Distribution**: Donut breakdown of traffic passing vs blocked.
- **Top Attacked Targets**: Bar chart identifying top probed paths (e.g. `/.env`, `/.git`, `/actuator`, `/phpinfo.php`).
- **Top Offender IPs**: Top client IP addresses triggering block rules.
- **Top Triggered Signatures**: Rule patterns and signatures matching incoming probe traffic.
- **Live Security Event Feed**: Color-coded log panel displaying raw and formatted security events with real-time refresh.
- **Dynamic Filters**: Dropdown template variables to filter panels by Gateway (`traefik`, `caddy`, `nginx`, `tcp-warden`) and Verdict.

---

## CLI Management (`rwarden dashboard`)

The RouteWarden CLI embeds all Docker Compose, Alloy, and Grafana dashboard templates directly in the binary. You can launch, inspect, and stop the stack with single commands:

<CodeViewer :snippets="cliSnippets" />

---

## Standalone Docker Compose Deployment

If you prefer deploying without the CLI binary (for GitOps, Kubernetes, or Docker Swarm), you can export or deploy the stack directly:

### 1. Export Stack Files

<CodeViewer :snippets="exportSnippets" />

### 2. `docker-compose.yml`

<CodeViewer :snippets="composeSnippets" />

### 3. Grafana Environment Configuration

All Grafana behaviour — credentials, SMTP, OAuth, anonymous access, and the home dashboard path — is controlled via `GF_*` environment variables. Use a `docker-compose.override.yml` alongside the exported `docker-compose.yml` so your customisations are never overwritten by re-running `rwarden dashboard export`:

<CodeViewer :snippets="grafanaEnvSnippets" />

#### Key `GF_*` Variables

| Variable | Default | Purpose |
|:--|:--|:--|
| `GF_SECURITY_ADMIN_USER` | `admin` | Admin username |
| `GF_SECURITY_ADMIN_PASSWORD` | `admin` | Admin password — **change in production** |
| `GF_SECURITY_SECRET_KEY` | random | Cookie signing key — set a stable value to survive restarts |
| `GF_AUTH_ANONYMOUS_ENABLED` | `true` | Allow read-only access without login |
| `GF_AUTH_ANONYMOUS_ORG_ROLE` | `Viewer` | Role granted to anonymous users |
| `GF_USERS_ALLOW_SIGN_UP` | `false` | Disable public self-registration |
| `GF_SERVER_ROOT_URL` | `http://localhost:3000` | Public URL — required for OAuth redirect URIs |
| `GF_SMTP_ENABLED` | `false` | Enable email alerting |
| `GF_AUTH_GITHUB_ENABLED` | `false` | GitHub OAuth SSO |
| `GF_AUTH_GOOGLE_ENABLED` | `false` | Google OAuth SSO |
| `GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH` | provisioned path | Dashboard shown on first load |

> [!TIP]
> When using `rwarden dashboard up`, pass `--env GF_SECURITY_ADMIN_PASSWORD=secret` for quick one-shot overrides. For persistent configuration, prefer `docker-compose.override.yml` so settings survive CLI re-runs.

### 4. Accessing the Dashboard

| Service | URL | Default Credentials |
|:--|:--|:--|
| **Grafana** | `http://localhost:3000` | `admin / admin` (anonymous viewer also enabled) |
| **Loki API** | `http://localhost:3100` | No auth required |
| **Alloy UI** | `http://localhost:12345` | No auth required |

---

## LogQL Query Cheat Sheet

You can run custom queries in Grafana Explore or configure alert rules using LogQL:

| Goal | LogQL Expression |
|:---|:---|
| **All Blocked Requests** | `{app="routewarden", verdict="BLOCK"}` |
| **All Attacks on `.env` Files** | `{app="routewarden", verdict="BLOCK"} \| json \| path =~ ".*\\.env.*"` |
| **Blocks Rate (per minute)** | `sum by (gateway) (rate({app="routewarden", verdict="BLOCK"}[1m]))` |
| **Top 10 Probed Endpoints** | `topk(10, sum by (path) (count_over_time({app="routewarden", verdict="BLOCK"} \| json [$__range])))` |
| **Top 10 Offending IPs** | `topk(10, sum by (client_ip) (count_over_time({app="routewarden", verdict="BLOCK"} \| json [$__range])))` |
| **Tarpit & Honeypot Triggers** | `{app="routewarden", response_mode=~"tarpit\|gzipBomb\|fakeSuccess"}` |

---

## Command Reference

| Subcommand / Flag | Type | Default | Description |
|:---|:---|:---|:---|
| `up` | subcommand | — | Launch Grafana, Loki, and Alloy stack via Docker Compose (default) |
| `down` | subcommand | — | Stop and tear down running observability stack containers |
| `status` | subcommand | — | Display status of Grafana, Loki, and Alloy containers |
| `export [dir]` | subcommand | `./observability` | Export compose, Alloy, and Grafana configs to disk |
| `--port` | int | `3000` | Port for Grafana dashboard UI |
| `--loki-port` | int | `3100` | Port for Loki log engine |
| `--dir` | string | `~/.routewarden/observability` | Working directory storing the stack files |
| `--no-open` | bool | `false` | Do not automatically launch the browser upon startup |
