---
title: TCP Warden FAQ & Comparison Guide
description: Simple, human-friendly FAQ explaining what TCP Warden does, how it compares with CrowdSec and firewalls, and how it strengthens your server security.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

const collab_diagram = buildSnippet({
  lang: 'plaintext',
  code: `┌─────────────────────────────────────────────────────────────────────────────┐
│                 INCOMING TRAFFIC (SSH, Mail, Databases, Redis)              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │     TCP WARDEN (The Bouncer)      │
                     └─────────────────┬─────────────────┘
                                       │
         ┌─────────────────────────────┴─────────────────────────────┐
         │ 1. Check Community Blacklist                              │ 2. Check Local Rules & Behavior
         ▼                                                           ▼
┌─────────────────────────────────┐                         ┌───────────────────────────────────┐
│ CrowdSec Decision Cache         │                         │ Real-Time Checks:                 │
│ • Millions of banned IPs shared │                         │ • Are you from an allowed country?│
│   by servers worldwide          │                         │ • Are you spamming connections?   │
└────────────────┬────────────────┘                         │ • Did you fail passwords 3 times? │
                 │                                          └─────────────────┬─────────────────┘
    Known bad IP?│ Clean?                                                     │
    ┌────────────┴─────────────┐                                              ▼ (Suspicious Activity)
    ▼                          ▼                                    ┌───────────────────────────────────┐
┌────────────────────┐   ┌───────────────────────┐                  │ Clean JSON Log Event Written      │
│ Drop Instantly /   │   │ Let connection into   │                  └─────────────────┬─────────────────┘
│ Tarpit (Waste bot  │   │ your app (Postfix,    │                                    │
│ resources)         │   │ Dovecot, SSH, DB)     │                                    ▼
└────────────────────┘   └───────────────────────┘                  ┌───────────────────────────────────┐
                                                                    │ CROWDSEC (The Intelligence Team)  │
                                                                    │ • Analyzes attack patterns        │
                                                                    │ • Shares bad IP with the world    │
                                                                    │ • Adds IP to your local blocklist │
                                                                    └───────────────────────────────────┘`
})

const collabSnippets = computed(() => ({
  tcp: [
    { filename: 'How They Work Together', lang: 'plaintext', code: collab_diagram.cleanCode, html: collab_diagram.html, hasDiff: false },
  ]
}))
</script>

# TCP Warden FAQ & Comparisons

<p class="tagline" style="font-size: 1.25rem; color: var(--vp-c-text-2); margin-bottom: 1.5rem;">
Simple answers to common questions about TCP Warden, CrowdSec, and protecting non-HTTP servers.
</p>

---

## The 30-Second Analogy

Think of your server like a popular venue:

* 🚪 **TCP Warden is the Bouncer at the front door**: It physically stands at the entrance (`:22`, `:25`, `:587`, `:993`). It checks IDs (GeoIP/CIDRs), limits how fast people can enter (rate limits), kicks troublemakers out on the spot, or makes bots wait in a ridiculously slow line (tarpit).
* 📡 **CrowdSec is the Global Security Network**: It collects intel from thousands of other venues worldwide. If someone starts trouble across town, CrowdSec adds them to the blacklist and gives your bouncer a heads-up before the troublemaker even reaches your sidewalk.

> **Bottom line:** They don't compete—they work together. **TCP Warden enforces rules live on the wire; CrowdSec provides global threat intelligence.**

---

## Comparison at a Glance

| Feature | **TCP Warden** | **CrowdSec** | **Fail2ban** | **iptables / UFW** |
| :--- | :--- | :--- | :--- | :--- |
| **What is it?** | L4 Reverse Proxy & Protocol Shield | Smart Threat Detector & Global Intel | Old-school Log Scanner | Raw Linux Firewall |
| **Where does it sit?** | **In-line**: Traffic passes *through* it | **Beside your apps**: Watches logs | **Beside your apps**: Watches logs | **In the Linux kernel** |
| **When does it act?** | **Instant**: Before the app even sees the connection | **After the fact**: Once bad actions are logged | **After the fact**: Minutes after logs are written | **Instant**: But only checks IP/port numbers |
| **Understands Protocols?** | **Yes**: Knows SMTP, SSH, IMAP, Postgres, MySQL, Redis | **Partially**: Reads text logs via regex | **Partially**: Reads text logs via regex | **No**: Only sees blind packets |
| **What can it do to attackers?** | Drop connection, send error code, or **Tarpit** (stall them) | Decides to ban, throttle, or captcha | Blocks IP in firewall | Drops or rejects packets |
| **Community Blocklist?** | Uses CrowdSec's list or local lists | **Yes**: Millions of shared IPs | No: Knows only your own machine | No: Static rules only |
| **Speed & Resource Usage** | Lightweight single Go binary | Low-to-moderate Go daemon | High CPU when logs get large | Zero overhead |

---

## How TCP Warden Makes CrowdSec Better

Running CrowdSec alone is good. Running **CrowdSec with TCP Warden** gives you enterprise-grade protection:

<div class="attack-grid">
  <div class="attack-card">
    <h4>⚡ 1. Stops Attackers on the Doorstep</h4>
    <p>Normally, CrowdSec has to wait for an attacker to connect, guess passwords, and leave log messages before taking action. With TCP Warden, known malicious IPs are dropped on the very first packet—your real mail or database servers never even know they were there.</p>
  </div>
  <div class="attack-card">
    <h4>📋 2. Zero Broken Log Parsers</h4>
    <p>Traditional tools break whenever software updates change log formats. TCP Warden emits clean, structured <code>jsonl</code> events with exact client IPs, protocols, and reasons, meaning CrowdSec parsers never miss an attack.</p>
  </div>
  <div class="attack-card">
    <h4>🪤 3. Wastes Attackers' Time (Tarpitting)</h4>
    <p>Instead of just closing the door and letting scanners move on to another victim, TCP Warden can <strong>tarpit</strong> them—holding their sockets open and drip-feeding bytes so slow that their scanning tools lock up and run out of memory.</p>
  </div>
  <div class="attack-card">
    <h4>🛡️ 4. Saves Server CPU & Memory</h4>
    <p>Heavy services like OpenSSH or Dovecot spin up separate system processes for every incoming connection. When a botnet hits you with thousands of requests, your CPU spikes. TCP Warden absorbs the storm and keeps your server fast.</p>
  </div>
  <div class="attack-card">
    <h4>🔍 5. Catches Wire-Level Tricks</h4>
    <p>Scanners often probe servers with broken protocol handshakes or attempt to strip STARTTLS encryption. These attacks often don't show up in normal server logs, but TCP Warden catches them directly on the wire.</p>
  </div>
  <div class="attack-card">
    <h4>💾 6. Survives Restarts & Network Drops</h4>
    <p>TCP Warden keeps an internal database (<code>bans.db</code>). If your server reboots or loses internet access to CrowdSec's cloud, your active bans and security rules stay active without missing a beat.</p>
  </div>
</div>

---

### The Complete Flow

<CodeViewer :snippets="collabSnippets" default-tab="tcp" />

---

## Frequently Asked Questions

### Does TCP Warden replace Fail2ban?
**Yes.** Fail2ban is an older tool written in Python that constantly scans text log files using regular expressions. It is slow, uses significant CPU during high-traffic attacks, easily breaks when log formats change, and has no global intelligence. 

TCP Warden + CrowdSec gives you instant in-line blocking with global community lists, with none of Fail2ban's weaknesses.

---

### Does TCP Warden replace CrowdSec?
**No.** They are teammates. 
* TCP Warden is the **muscle** (the proxy that handles real traffic and drops bad packets).
* CrowdSec is the **brain** (the global network that identifies attackers and shares threat intelligence).

---

### Can I run TCP Warden without CrowdSec?
**Yes, absolutely.** You don't need CrowdSec to use TCP Warden. Even on its own, TCP Warden provides:
* Automatic brute-force login protection (`ban_after_failures`).
* Rate limiting (preventing connection floods).
* Country blocking (GeoIP allow/deny lists).
* IP & subnet whitelists (Docker, Tailscale, NetBird, office networks).
* Tarpits and custom rejection messages.

---

### Can I run both on the same server?
**Yes, this is the recommended setup.**
1. TCP Warden runs as a Docker container or systemd service on your public ports (`:22`, `:25`, `:587`, `:993`).
2. It checks CrowdSec's local API (`http://127.0.0.1:8080`) in memory before allowing any connection.
3. It writes events to `/var/log/routewarden/tcp-warden.jsonl`, which CrowdSec reads.

---

### Why can't TCP Warden protect UDP ports (like 3478 for STUN/TURN)?
TCP Warden is designed specifically for **TCP streams** (connections with handshakes, byte flows, and session states). 

UDP is connectionless—it just sends loose packets without a stream. Services like STUN/TURN (Coturn / Nextcloud Talk on port 3478), WireGuard (51820), or DNS (53) should remain open directly on your system firewall:
```bash
sudo ufw allow 3478/udp
```

---

### How does TCP Warden handle IPv6 and VPNs (Tailscale / NetBird)?
It supports them seamlessly out of the box:
* **Dual-Stack**: Binding to `:25` automatically protects both IPv4 (`0.0.0.0`) and IPv6 (`::`).
* **VPN Friendly**: You can whitelist entire VPN ranges so your team can always connect (e.g. `100.64.0.0/10` for Tailscale or NetBird).
* **GeoIP**: Country lookups work on both IPv4 and IPv6 addresses.

---

### What does an attacker see when they are blocked?
You choose what happens when an attacker is denied:
* **`drop`** *(default)*: The connection is silently closed. To the attacker's port scanner, the port looks dead, filtered, or non-existent.
* **`reject`**: Immediately sends a TCP Reset (`RST`) packet, telling them the connection was refused.
* **`tarpit`**: Accepts the connection, but stalls and drip-feeds bytes so slowly that the attacker's bot runs out of threads and hangs.
* **`reject_message`**: Sends a clean protocol error message before closing (for example, replying to spammers with `421 4.7.0 Connection rate limit exceeded\r\n` on SMTP).
