---
title: Reusing an Existing Grafana & Loki Stack — RouteWarden Dashboard
description: How to integrate RouteWarden security analytics with your existing Grafana, Loki, Alloy, or Promtail infrastructure without deploying redundant containers.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── Reusing an Existing Stack Snippets ─────────────────────────────────────
const existing_import = buildSnippet({
  lang: 'bash',
  code: `# 1. Export RouteWarden dashboard template to disk
rwarden dashboard export ./observability

# Dashboard JSON is located at:
# ./observability/grafana/dashboards/routewarden-overview.json

# Option A: Import via Grafana Web UI
# 1. Open your existing Grafana instance in your browser
# 2. Navigate to Dashboards > New > Import
# 3. Upload routewarden-overview.json (or paste its JSON content)
# 4. Select your existing Loki data source from the dropdown prompt

# Option B: Import via Grafana HTTP API
curl -X POST \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <GRAFANA_SERVICE_ACCOUNT_TOKEN>" \\
  -d "{\\"dashboard\\": $(cat ./observability/grafana/dashboards/routewarden-overview.json), \\"overwrite\\": true}" \\
  https://grafana.example.com/api/dashboards/db`,
})

import alloyConfigRaw from './config.alloy?raw'

const existing_alloy = buildSnippet({
  lang: 'plaintext',
  code: alloyConfigRaw,
})

const existing_promtail = buildSnippet({
  lang: 'yaml',
  code: `# Promtail configuration snippet for RouteWarden
scrape_configs:
  - job_name: routewarden-docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_label_routewarden_logs', '__meta_docker_container_label_routewarden']
        separator: ';'
        regex: '.*(true|1|yes).*'
        action: keep
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
    pipeline_stages:
      - json:
          expressions:
            timestamp: timestamp
            type: type
            level: level
            verdict: verdict
            action: action
            client_ip: client_ip
            effective_ip: effective_ip
            service: service
            protocol: protocol
            gateway: gateway
            plugin: plugin
            path: path
            status_code: status_code
            matched_pattern: matched_pattern
            reason: reason
            country_code: country_code
      - template:
          source: verdict
          template: '{{ if .verdict }}{{ .verdict }}{{ else if eq .type "routewarden_block" }}BLOCK{{ else if eq .type "routewarden_allow" }}ALLOW{{ else if eq .action "blocked" }}BLOCK{{ else if eq .action "allowed" }}ALLOW{{ else if eq .action "throttled" }}THROTTLED{{ else if eq .action "banned" }}BLOCK{{ else if .action }}{{ .action }}{{ end }}'
      - template:
          source: gateway
          template: '{{ if .gateway }}{{ .gateway }}{{ else if .plugin }}{{ .plugin }}{{ else }}gateway{{ end }}'
      - template:
          source: level
          template: '{{ if .level }}{{ .level }}{{ else if or (eq .verdict "BLOCK") (eq .action "blocked") }}warn{{ else }}info{{ end }}'
      - drop:
          source: verdict
          expression: '^$'
      - static_labels:
          app: routewarden
      - labels:
          level:
          verdict:
          gateway:
          service:
          protocol:
          client_ip:
          country_code:
          action:
          reason:`,
})

const existing_shipper = buildSnippet({
  lang: 'bash',
  code: `# Run a lightweight Alloy shipper container on the gateway host
# sending security logs directly to your remote Loki cluster:

# 1. Export stack files
rwarden dashboard export ./observability

# 2. In ./observability/config.alloy, set your remote Loki endpoint:
#    url = "https://loki.my-domain.com/loki/api/v1/push"

# 3. Launch the shipper container (no local Loki or Grafana needed)
docker run -d \\
  --name routewarden-alloy \\
  --restart unless-stopped \\
  -v "$(pwd)/observability/config.alloy:/etc/alloy/config.alloy:ro" \\
  -v "/var/run/docker.sock:/var/run/docker.sock:ro" \\
  -v "/var/log:/var/log:ro" \\
  grafana/alloy:v1.1.0 \\
  run /etc/alloy/config.alloy`,
})

const existingStackSnippets = computed(() => ({
  cli: [
    { filename: '1. Import Dashboard', lang: 'bash', code: existing_import.cleanCode, html: existing_import.html, hasDiff: false },
    { filename: '2. Alloy Config', lang: 'plaintext', code: existing_alloy.cleanCode, html: existing_alloy.html, hasDiff: false },
    { filename: '3. Promtail Config', lang: 'yaml', code: existing_promtail.cleanCode, html: existing_promtail.html, hasDiff: false },
    { filename: '4. Shipper-Only Container', lang: 'bash', code: existing_shipper.cleanCode, html: existing_shipper.html, hasDiff: false },
  ],
}))
</script>

# Reusing an Existing Grafana & Loki Stack

If you already have a Grafana and Loki stack running on your server, Kubernetes cluster, or Docker Swarm, you **do not need** to deploy RouteWarden's local Loki or Grafana containers.

You can seamlessly reuse your existing observability infrastructure in three steps:

1. **Import the Dashboard**: Export and import the pre-built `routewarden-overview.json` directly into your existing Grafana.
2. **Ship Logs to Your Existing Loki**: Add RouteWarden's parsing pipeline to your existing **Grafana Alloy** or **Promtail** agent, or run a lightweight Alloy shipper container pointing directly to your remote Loki endpoint.
3. **Label Containers**: Tag your reverse proxy and daemon containers with `routewarden.logs=true`.

<CodeViewer :snippets="existingStackSnippets" />

---

## Key Advantages of Reusing Your Existing Stack

- **Zero Container Redundancy**: You run zero unnecessary containers on your server, conserving memory and CPU.
- **Native Grafana Visualizations**: The exported dashboard is 100% standard Grafana JSON. When importing, simply select your existing Loki data source from the dropdown prompt.
- **Unified Log Analytics**: Security logs from RouteWarden reside directly alongside your existing application and infrastructure logs, allowing cross-correlation between reverse proxy security blocks and backend application performance.
- **Centralized Alerting**: Leverage your existing Grafana Alertmanager, Slack, PagerDuty, or Webhook notification channels without managing duplicate alert rules.

---

## Step-by-Step Integration

### Step 1: Export and Import Dashboard

1. Run `rwarden dashboard export ./observability` to write `routewarden-overview.json` to disk.
2. In your existing Grafana, navigate to **Dashboards > New > Import**.
3. Upload `routewarden-overview.json` or paste its content.
4. When prompted, select your existing Loki datasource from the dropdown and click **Import**.

### Step 2: Configure Log Shipping

Depending on what collector you run on your gateway host:

- **If you already run Grafana Alloy**: Append the `discovery.relabel` and `loki.process` blocks from tab **2. Alloy Config** above to your host's `/etc/alloy/config.alloy`.
- **If you already run Promtail**: Append the `scrape_configs` block from tab **3. Promtail Config** above to your `/etc/promtail/config.yaml`.
- **If you have no collector on the gateway host**: Run the single lightweight Alloy container from tab **4. Shipper-Only Container** configured with your remote Loki endpoint (`https://loki.example.com/loki/api/v1/push`).

### Step 3: Tag Reverse Proxy Containers

Ensure your gateway containers carry the label:
```yaml
labels:
  - "routewarden.logs=true"
```
Logs will immediately begin flowing into your existing Loki instance and appearing in your Grafana dashboard.
