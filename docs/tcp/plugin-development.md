---
title: Plugin Development & Integration Guide
description: Step-by-step developer guide for creating, testing, and integrating custom protocol plugins for RouteWarden TCP Warden.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Step 1: Manifest (plugin.yaml) ──────────────────────────────────────────
const manifest_yaml = buildSnippet({
  lang: 'yaml',
  code: `# plugin.yaml
manifest_version: "1.0.0"
name: echo_guard
version: "1.1.0"
description: "Example protocol inspector that filters sensitive keywords"
author: "Your Name <you@example.com>"
protocols:
  - echo_guard
default_service:
  listen: ":9000"
  upstream: "127.0.0.1:9001"
  protocol: "echo_guard"
  plugin_config:
    blocked_words:
      - "malicious"
      - "exploit"`
})

const manifestSnippets = computed(() => ({
  tcp: [
    { filename: 'plugin.yaml', lang: 'yaml', code: manifest_yaml.cleanCode, html: manifest_yaml.html, hasDiff: false },
  ]
}))

// ─── Step 2: Plugin Lifecycle (plugin.go) ───────────────────────────────────
const plugin_go = buildSnippet({
  lang: 'go',
  code: `package echo_guard

import (
	_ "embed"
	"errors"
	"strings"

	"github.com/routewarden/tcp-warden/plugins"
	"github.com/routewarden/tcp-warden/plugins/sdk"
)

// Embed the plugin.yaml manifest directly into the compiled Go binary.
// This allows TCP Warden to inspect metadata in memory without needing loose files.
//go:embed plugin.yaml
var manifestYAML []byte

var manifest = sdk.MustParseManifest(manifestYAML)

func init() {
	// Register the plugin with TCP Warden when imported
	plugins.Register(&Plugin{})
}

type Plugin struct{}

// Manifest returns the embedded metadata for this plugin
func (p *Plugin) Manifest() sdk.Manifest {
	return manifest
}

// ValidateConfig checks user-provided YAML configuration under 'plugin_config'
// before the proxy starts, catching typos and invalid types early.
func (p *Plugin) ValidateConfig(cfg map[string]any) error {
	if rawWords, ok := cfg["blocked_words"]; ok {
		words, ok := rawWords.([]any)
		if !ok {
			return errors.New("'blocked_words' must be a list of strings")
		}
		if len(words) == 0 {
			return errors.New("'blocked_words' cannot be empty")
		}
	}
	return nil
}

// CreateInspector instantiates the protocol inspector for a service
func (p *Plugin) CreateInspector(cfg map[string]any) (sdk.Inspector, error) {
	var words []string
	if rawWords, ok := cfg["blocked_words"].([]any); ok {
		for _, w := range rawWords {
			if s, ok := w.(string); ok {
				words = append(words, strings.ToLower(s))
			}
		}
	}
	return &Inspector{BlockedWords: words}, nil
}

// SelfTest runs a fast in-memory sanity check before the daemon starts.
// If this fails, the daemon will refuse to start to protect system stability.
func (p *Plugin) SelfTest() error {
	insp, err := p.CreateInspector(map[string]any{
		"blocked_words": []any{"badword"},
	})
	if err != nil {
		return err
	}
	inspector, ok := insp.(*Inspector)
	if !ok || len(inspector.BlockedWords) != 1 {
		return errors.New("self-test failed: blocked words not parsed correctly")
	}
	return nil
}`
})

const pluginGoSnippets = computed(() => ({
  tcp: [
    { filename: 'plugin.go', lang: 'go', code: plugin_go.cleanCode, html: plugin_go.html, hasDiff: false },
  ]
}))

// ─── Step 3: Inspector (inspector.go) ───────────────────────────────────────
const inspector_go = buildSnippet({
  lang: 'go',
  code: `package echo_guard

import (
	"bufio"
	"net"
	"strings"
	"sync/atomic"

	"github.com/routewarden/tcp-warden/plugins/sdk"
	"github.com/routewarden/tcp-warden/protocol"
)

type Inspector struct {
	BlockedWords []string
}

// Run handles each incoming TCP client connection.
// It inspects client traffic, logs security events, and proxies clean streams.
func (insp *Inspector) Run(ctx sdk.Context, client, upstream net.Conn) (sdk.ProxyResult, bool, string, error) {
	var bytesIn, bytesOut atomic.Int64

	clientReader := bufio.NewReader(client)

	for {
		// Read one line or message from the client
		line, err := clientReader.ReadString('\\n')
		if err != nil {
			return sdk.ProxyResult{
				BytesIn:  bytesIn.Load(),
				BytesOut: bytesOut.Load(),
				Err:      err,
			}, false, "", nil
		}
		bytesIn.Add(int64(len(line)))

		// Check the client payload for blocked keywords
		lineLower := strings.ToLower(line)
		for _, word := range insp.BlockedWords {
			if strings.Contains(lineLower, word) {
				// 1. Emit an audit event to TCP Warden's event log and SSE stream
				if ctx != nil {
					ctx.OnSecurityEvent("blocked", "blocked_word_"+word)
				}
				// 2. Return wasBlocked = true with a clear explanation
				return sdk.ProxyResult{
					BytesIn:  bytesIn.Load(),
					BytesOut: bytesOut.Load(),
				}, true, "blocked keyword: " + word, nil
			}
		}

		// Forward clean data to the upstream server
		if _, err := upstream.Write([]byte(line)); err != nil {
			return sdk.ProxyResult{
				BytesIn:  bytesIn.Load(),
				BytesOut: bytesOut.Load(),
				Err:      err,
			}, false, "", nil
		}
		bytesOut.Add(int64(len(line)))

		// Hand off remaining stream to high-performance bidirectional proxy.
		// IMPORTANT: Wrap client with protocol.BufferedConn so any bytes
		// already buffered in clientReader are NOT lost!
		bufferedClient := &protocol.BufferedConn{
			Conn:   client,
			Reader: clientReader,
		}
		res := protocol.Proxy(bufferedClient, upstream)
		bytesIn.Add(res.BytesIn)
		bytesOut.Add(res.BytesOut)

		return sdk.ProxyResult{
			BytesIn:  bytesIn.Load(),
			BytesOut: bytesOut.Load(),
			Err:      res.Err,
		}, false, "", nil
	}
}`
})

const inspectorGoSnippets = computed(() => ({
  tcp: [
    { filename: 'inspector.go', lang: 'go', code: inspector_go.cleanCode, html: inspector_go.html, hasDiff: false },
  ]
}))

// ─── Step 4: Unit Tests (plugin_test.go & command) ──────────────────────────
const test_go = buildSnippet({
  lang: 'go',
  code: `package echo_guard

import (
	"bufio"
	"net"
	"testing"
	"time"

	"github.com/routewarden/tcp-warden/plugins/sdk"
)

func TestPlugin_SelfTest(t *testing.T) {
	p := &Plugin{}
	if err := p.SelfTest(); err != nil {
		t.Fatalf("SelfTest() failed: %v", err)
	}
}

func TestInspector_BlockedKeyword(t *testing.T) {
	// Create fast in-memory network pipes (no real open ports needed!)
	clientA, clientB := net.Pipe()
	defer clientA.Close()
	defer clientB.Close()

	upA, upB := net.Pipe()
	defer upA.Close()
	defer upB.Close()

	// Drain upstream in the background to prevent blocking
	go func() {
		buf := make([]byte, 1024)
		for {
			if _, err := upB.Read(buf); err != nil {
				return
			}
		}
	}()

	insp := &Inspector{BlockedWords: []string{"malicious"}}
	ctx := &sdk.DefaultContext{ServiceName: "test-echo", ClientAddress: "127.0.0.1"}

	done := make(chan struct {
		blocked bool
		reason  string
	}, 1)

	go func() {
		_, blocked, reason, _ := insp.Run(ctx, clientB, upA)
		done <- struct {
			blocked bool
			reason  string
		}{blocked, reason}
	}()

	// Send payload with blocked keyword
	_, _ = clientA.Write([]byte("hello malicious world\\n"))

	select {
	case res := <-done:
		if !res.blocked {
			t.Error("expected keyword to be blocked")
		}
		if res.reason != "blocked keyword: malicious" {
			t.Errorf("unexpected reason: %s", res.reason)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("test timed out")
	}
}

func TestInspector_AllowedTraffic(t *testing.T) {
	clientA, clientB := net.Pipe()
	defer clientA.Close()
	defer clientB.Close()

	upA, upB := net.Pipe()
	defer upA.Close()
	defer upB.Close()

	// Capture upstream output
	upstreamReceived := make(chan string, 1)
	go func() {
		reader := bufio.NewReader(upB)
		line, _ := reader.ReadString('\\n')
		upstreamReceived <- line
	}()

	insp := &Inspector{BlockedWords: []string{"malicious"}}
	ctx := &sdk.DefaultContext{ServiceName: "test-echo", ClientAddress: "127.0.0.1"}

	go func() {
		_, _, _, _ = insp.Run(ctx, clientB, upA)
	}()

	// Send normal, clean message
	_, _ = clientA.Write([]byte("hello clean world\\n"))

	select {
	case received := <-upstreamReceived:
		if received != "hello clean world\\n" {
			t.Errorf("expected clean message to reach upstream, got: %s", received)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("test timed out waiting for upstream forwarding")
	}
}`
})

const test_cmd = buildSnippet({
  lang: 'bash',
  code: `# Run all tests with race condition detector
go test -v -race -count=1 ./...`
})

const testGoSnippets = computed(() => ({
  tcp: [
    { filename: 'plugin_test.go', lang: 'go', code: test_go.cleanCode, html: test_go.html, hasDiff: false },
  ]
}))

const testCmdSnippets = computed(() => ({
  tcp: [
    { filename: 'Terminal', lang: 'bash', code: test_cmd.cleanCode, html: test_cmd.html, hasDiff: false },
  ]
}))

// ─── 4-Step Validation Pipeline Snippet ─────────────────────────────────────
const pipeline_log = buildSnippet({
  lang: 'bash',
  code: `$ tcp-warden plugins install ./echo_guard
[1/4] Validating manifest for plugin 'echo_guard'...
[2/4] Checking manifest compatibility (manifest_version 1.0.0)...
[3/4] Compiling plugin 'echo_guard'...
[4/4] Running tests for plugin 'echo_guard'...
✓ Successfully installed plugin 'echo_guard' (version 1.1.0)`
})

const pipelineSnippets = computed(() => ({
  tcp: [
    { filename: 'Terminal Output', lang: 'bash', code: pipeline_log.cleanCode, html: pipeline_log.html, hasDiff: false },
  ]
}))

// ─── Example 2: Auth Failure Tracking ───────────────────────────────────────
const auth_guard_go = buildSnippet({
  lang: 'go',
  code: `package auth_guard

import (
	"bufio"
	"net"
	"strings"

	"github.com/routewarden/tcp-warden/plugins/sdk"
	"github.com/routewarden/tcp-warden/protocol"
)

type Inspector struct {
	AllowedTokens map[string]bool
}

func (insp *Inspector) Run(ctx sdk.Context, client, upstream net.Conn) (sdk.ProxyResult, bool, string, error) {
	clientReader := bufio.NewReader(client)

	// Read handshake token: e.g. "AUTH secret123\\n"
	line, err := clientReader.ReadString('\\n')
	if err != nil {
		return sdk.ProxyResult{Err: err}, false, "", nil
	}

	trimmed := strings.TrimSpace(line)
	parts := strings.SplitN(trimmed, " ", 2)

	if len(parts) != 2 || parts[0] != "AUTH" || !insp.AllowedTokens[parts[1]] {
		// 1. Tell TCP Warden this client failed authentication!
		// TCP Warden's failure tracker will record this attempt.
		// If the IP exceeds max_auth_failures, it will be automatically banned!
		if ctx != nil {
			ctx.OnAuthFailure()
			ctx.OnSecurityEvent("auth_failed", "invalid_handshake_token")
		}

		// 2. Reject the connection immediately
		return sdk.ProxyResult{}, true, "authentication failed", nil
	}

	// Token is valid! Pass buffered reader to bidirectional proxy
	bufferedClient := &protocol.BufferedConn{Conn: client, Reader: clientReader}
	res := protocol.Proxy(bufferedClient, upstream)
	return sdk.ProxyResult{BytesIn: res.BytesIn, BytesOut: res.BytesOut, Err: res.Err}, false, "", nil
}`
})

const authGuardSnippets = computed(() => ({
  tcp: [
    { filename: 'auth_guard/inspector.go', lang: 'go', code: auth_guard_go.cleanCode, html: auth_guard_go.html, hasDiff: false },
  ]
}))

// ─── Step 5: Test Locally ───────────────────────────────────────────────────
const local_cli = buildSnippet({
  lang: 'bash',
  code: `# 1. Install local plugin into tcp-warden
tcp-warden plugins install ./echo_guard

# 2. Verify it appears as ACTIVE
tcp-warden plugins list

# 3. Validate configuration syntax
tcp-warden validate --config tcp-warden.yaml

# 4. Start the proxy
tcp-warden run --config tcp-warden.yaml`
})

const local_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
services:
  my_service:
    listen: ":9000"
    upstream: "127.0.0.1:9001"
    protocol: "echo_guard"
    max_auth_failures: 3
    ban_duration: "1h"
    plugin_config:
      blocked_words:
        - "malicious"
        - "exploit"`
})

const localTestSnippets = computed(() => ({
  tcp: [
    { filename: 'CLI Workflow', lang: 'bash', code: local_cli.cleanCode, html: local_cli.html, hasDiff: false },
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: local_yaml.cleanCode, html: local_yaml.html, hasDiff: false },
  ]
}))

// ─── Step 6: Version Management Scripts ─────────────────────────────────────
const version_scripts = buildSnippet({
  lang: 'bash',
  code: `# Check manifest versions across all plugins
./scripts/update-manifest-version.sh --check

# Check release versions across all plugins
./scripts/update-plugin-version.sh --check

# Bump release version of a specific plugin
./scripts/update-plugin-version.sh 1.2.0 echo_guard

# Bump release version of all plugins
./scripts/update-plugin-version.sh 1.2.0 all`
})

const versionScriptSnippets = computed(() => ({
  tcp: [
    { filename: 'Terminal', lang: 'bash', code: version_scripts.cleanCode, html: version_scripts.html, hasDiff: false },
  ]
}))
</script>

# Plugin Development Guide

RouteWarden TCP Warden uses a modular plugin architecture. Anyone can build, test, and integrate custom Layer 4 protocol inspectors using Go and the **RouteWarden Plugin SDK** (`github.com/routewarden/tcp-warden/plugins/sdk`).

This guide explains how plugins work in plain English and walks you through creating, testing, and publishing your own protocol inspector step by step.

---

## What is a TCP Warden Plugin?

Think of a TCP Warden plugin as a **security guard** stationed between an incoming client (like an application or user) and your backend server (like a database, cache, or game server).

When someone connects:
1. The plugin inspects the packets arriving on the TCP socket.
2. If it sees something dangerous (like bad passwords, dangerous commands, or scanner attacks), it can block the connection or tell TCP Warden to ban the client's IP.
3. If everything looks good, it steps aside and lets traffic stream directly to the backend at full wire speed.

```
[Inbound TCP Client] ──► [Inspector.Run()] ──► [Upstream Backend]
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   ctx.OnAuthFailure()                   ctx.OnSecurityEvent()
(Tracks failures & triggers ban)         (Emits JSONL audit event)
```

---

## Manifest Version vs. Plugin Version

Every plugin has two distinct version numbers in its `plugin.yaml`:

```yaml
manifest_version: "1.0.0"   # The schema version of the manifest format itself
version: "1.1.0"            # Your plugin's release version (bumped on updates)
```

- **`manifest_version`**: Specifies which version of the manifest format this file uses. It tells TCP Warden how to parse and validate the file. It starts at `1.0.0` and rarely changes.
- **`version`**: The release version of your plugin. Whenever you fix a bug, add a feature, or release a new update, you bump this number following SemVer (e.g. `1.1.0` -> `1.2.0`).

Keeping these two versions separate means updating your plugin will never break manifest compatibility checks.

---

## The 4-Step Safety Verification Pipeline

When anyone installs a plugin using `tcp-warden plugins install <source>`, TCP Warden automatically runs a strict **4-step safety pipeline** to protect your proxy from broken code, crashes, or concurrency bugs:

<CodeViewer :snippets="pipelineSnippets" />

1. **`[1/4] Validating manifest`**: Checks that `plugin.yaml` exists, has valid YAML syntax, and includes all required fields (`name`, `version`, `manifest_version`, `protocols`).
2. **`[2/4] Checking manifest compatibility`**: Ensures the plugin's `manifest_version` is supported by the installed TCP Warden SDK version.
3. **`[3/4] Compiling plugin`**: Runs Go compiler checks (`go vet` and dry-run compilation) to ensure there are no syntax errors, missing packages, or type mismatches.
4. **`[4/4] Running tests`**: Executes `go test -race -count=1 ./...` inside the plugin directory. If any test fails or any multithreading race condition is detected, the plugin is rejected.

---

## Directory Structure

A plugin lives in its own folder and has five standard files:

```
my_protocol/
├── plugin.yaml          # Metadata, manifest version, and default configuration
├── plugin.go            # Plugin lifecycle, validation, and embedded manifest
├── inspector.go         # Active wire protocol inspection and proxy loop
├── plugin_test.go       # In-memory unit tests using net.Pipe()
└── README.md            # Documentation and usage examples
```

---

## Step 1: Create the Manifest (`plugin.yaml`)

The manifest defines your plugin's identity, supported protocol names, and default settings:

<CodeViewer :snippets="manifestSnippets" />

- `manifest_version`: Format version (use `"1.0.0"`).
- `name`: Unique short identifier for the plugin (lowercase letters and underscores).
- `version`: Your plugin's current release version.
- `protocols`: List of protocol names this plugin handles.
- `default_service`: A ready-to-use service block that users can copy into their `tcp-warden.yaml`.

---

## Step 2: Implement the Plugin Lifecycle (`plugin.go`)

In `plugin.go`, embed `plugin.yaml` into your Go binary using Go's `//go:embed` directive, implement the `sdk.Plugin` interface, and register your plugin in `init()`:

<CodeViewer :snippets="pluginGoSnippets" />

### What Each Method Does:

- **`Manifest()`**: Returns the embedded manifest metadata so TCP Warden can inspect it in memory.
- **`ValidateConfig(cfg)`**: Runs before the daemon starts. Use this to catch typos, invalid types, or missing settings in `plugin_config`.
- **`CreateInspector(cfg)`**: Creates a new inspector instance populated with the user's configuration.
- **`SelfTest()`**: Runs an instant, in-memory sanity check to make sure your inspector can initialize properly.

---

## Step 3: Implement the Stream Inspector (`inspector.go`)

The inspector handles active TCP connections between clients and your upstream servers:

<CodeViewer :snippets="inspectorGoSnippets" />

::: tip Preserving Buffered Bytes
When you read data using `bufio.NewReader`, Go reads chunks of bytes into an internal buffer. If you hand off the connection to `protocol.Proxy()` without those unread buffered bytes, data will be lost!

Always wrap the client connection in `&protocol.BufferedConn{Conn: client, Reader: clientReader}` when transitioning from inspection to bidirectional forwarding.
:::

---

## Step 4: Write Unit Tests (`plugin_test.go`)

Always write tests for your plugin. You can test network connections completely in memory using Go's `net.Pipe()`—no need to open real ports or run a real server!

<CodeViewer :snippets="testGoSnippets" />

Run tests locally with the race detector enabled:

<CodeViewer :snippets="testCmdSnippets" />

---

## Example 2: Tracking Authentication Failures & Banning Attackers

One of the most powerful features of TCP Warden is **automated brute-force defense**. If a client fails authentication, your inspector can notify TCP Warden by calling `ctx.OnAuthFailure()`.

TCP Warden will track the failure count for that client IP. Once it reaches `max_auth_failures`, TCP Warden automatically bans the IP and drops all future connections!

<CodeViewer :snippets="authGuardSnippets" />

### How `ctx.OnAuthFailure()` Works:
1. The client sends invalid credentials or an invalid token.
2. The inspector calls `ctx.OnAuthFailure()`.
3. TCP Warden increments the failure counter for that client IP.
4. If failures exceed `max_auth_failures` within the configured time window, the IP is added to the banlist and rejected across all services.

---

## Step 5: Test Locally with TCP Warden

Test your new plugin with the `tcp-warden` daemon:

<CodeViewer :snippets="localTestSnippets" />

---

## Step 6: Managing Versions with Helper Scripts

The `routewarden/plugins` repository includes two helper scripts in `scripts/` to keep versions consistent and clean:

<CodeViewer :snippets="versionScriptSnippets" />

- **`update-manifest-version.sh`**: Updates or checks `manifest_version` without touching release `version`.
- **`update-plugin-version.sh`**: Updates or checks SemVer release `version` without touching `manifest_version`.

---

## Developer Best Practices Checklist

Before submitting or publishing your plugin, verify the following:

- [ ] **Embedded Manifest**: Uses `//go:embed plugin.yaml` and `sdk.MustParseManifest`.
- [ ] **Manifest Version**: Specifies `manifest_version: "1.0.0"`.
- [ ] **Buffer Preservation**: Wraps pre-read connections in `&protocol.BufferedConn` before calling `protocol.Proxy`.
- [ ] **Auth Reporting**: Calls `ctx.OnAuthFailure()` whenever a login or credential check fails.
- [ ] **Security Auditing**: Calls `ctx.OnSecurityEvent(action, reason)` when malicious traffic is blocked.
- [ ] **Bounded Memory**: Never reads unbounded bytes into memory without length limits.
- [ ] **Race Detector**: `go test -race -count=1 ./...` passes with zero race warnings.
