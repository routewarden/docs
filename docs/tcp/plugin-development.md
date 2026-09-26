---
title: Plugin Development & Integration Guide
description: Step-by-step developer guide for creating, testing, and integrating custom protocol plugins for RouteWarden TCP Warden.
---

# Plugin Development Guide

RouteWarden TCP Warden uses a modular plugin architecture. Anyone can build, test, and integrate custom Layer 4 protocol inspectors using Go and the **RouteWarden Plugin SDK** (`github.com/routewarden/tcp-warden/plugins/sdk`).

This guide walks you through building a custom protocol inspector from scratch.

---

## Plugin Architecture

A plugin consists of three main components:

1. **Manifest (`plugin.yaml`)**: Metadata describing the plugin name, version, protocols, and author.
2. **Plugin Lifecycle (`Plugin` struct)**: Implements `sdk.Plugin` to validate user configuration, instantiate inspectors, and run in-memory self-tests.
3. **Stream Inspector (`Inspector` struct)**: Implements `sdk.Inspector` to analyze incoming and outgoing TCP packets, report authentication failures, and block malicious traffic.

```
[Inbound TCP Client] ──► [Inspector.Run()] ──► [Upstream Backend]
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   ctx.OnAuthFailure()                   ctx.OnSecurityEvent()
(Tracks failures & triggers ban)         (Emits JSONL audit event)
```

---

## Directory Structure

Every plugin lives in its own directory with the following structure:

```
my_protocol/
├── plugin.yaml          # Metadata and sample configuration
├── plugin.go            # Plugin declaration and factory methods
├── inspector.go         # Wire protocol inspection and proxy loop
├── plugin_test.go       # Unit tests including SelfTest()
└── README.md            # User-facing documentation and examples
```

---

## Step 1: Create `plugin.yaml`

The manifest file defines plugin metadata and default settings:

```yaml
name: echo_guard
version: "1.0.0"
description: "Example protocol inspector that filters sensitive keywords"
author: "Your Name <you@example.com>"
protocols:
  - echo_guard
config:
  blocked_words:
    - "malicious"
    - "exploit"
```

---

## Step 2: Implement the Plugin Lifecycle (`plugin.go`)

In `plugin.go`, implement the `sdk.Plugin` interface and register your plugin in `init()`:

```go
package echo_guard

import (
	"errors"
	"strings"

	"github.com/routewarden/tcp-warden/plugins"
	"github.com/routewarden/tcp-warden/plugins/sdk"
)

func init() {
	// Auto-registers this plugin when imported
	plugins.Register(&Plugin{})
}

type Plugin struct{}

func (p *Plugin) Manifest() sdk.Manifest {
	return sdk.Manifest{
		Name:        "echo_guard",
		Version:     "1.0.0",
		Description: "Example protocol inspector that filters sensitive keywords",
		Author:      "Your Name",
		Protocols:   []string{"echo_guard"},
	}
}

// ValidateConfig checks user-provided YAML configuration under 'plugin_config'
func (p *Plugin) ValidateConfig(cfg map[string]any) error {
	if rawWords, ok := cfg["blocked_words"]; ok {
		if _, ok := rawWords.([]any); !ok {
			return errors.New("'blocked_words' must be a list of strings")
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

// SelfTest runs a fast in-memory sanity check before the daemon starts
func (p *Plugin) SelfTest() error {
	insp, err := p.CreateInspector(map[string]any{
		"blocked_words": []any{"badword"},
	})
	if err != nil {
		return err
	}
	if len(insp.(*Inspector).BlockedWords) != 1 {
		return errors.New("self-test failed: words not parsed")
	}
	return nil
}
```

---

## Step 3: Implement the Inspector (`inspector.go`)

The inspector handles active client and upstream TCP connections:

```go
package echo_guard

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

func (insp *Inspector) Run(ctx sdk.Context, client, upstream net.Conn) (sdk.ProxyResult, bool, string, error) {
	var bytesIn, bytesOut atomic.Int64

	clientReader := bufio.NewReader(client)

	for {
		// Read one line or message from client
		line, err := clientReader.ReadString('\n')
		if err != nil {
			return sdk.ProxyResult{BytesIn: bytesIn.Load(), BytesOut: bytesOut.Load(), Err: err}, false, "", nil
		}
		bytesIn.Add(int64(len(line)))

		// Inspect client payload
		lineLower := strings.ToLower(line)
		for _, word := range insp.BlockedWords {
			if strings.Contains(lineLower, word) {
				// Record security event
				if ctx != nil {
					ctx.OnSecurityEvent("blocked", "blocked_word_"+word)
				}
				// Return wasBlocked = true with explanation
				return sdk.ProxyResult{BytesIn: bytesIn.Load(), BytesOut: bytesOut.Load()}, true, "blocked keyword: " + word, nil
			}
		}

		// Forward clean data to upstream backend
		if _, err := upstream.Write([]byte(line)); err != nil {
			return sdk.ProxyResult{BytesIn: bytesIn.Load(), BytesOut: bytesOut.Load(), Err: err}, false, "", nil
		}
		bytesOut.Add(int64(len(line)))

		// Hand off remaining stream to high-performance bidirectional proxy if inspection is complete
		// Or continue looping if ongoing inspection is required
		bufferedClient := &protocol.BufferedConn{Conn: client, Reader: clientReader}
		res := protocol.Proxy(bufferedClient, upstream)
		bytesIn.Add(res.BytesIn)
		bytesOut.Add(res.BytesOut)
		return sdk.ProxyResult{BytesIn: bytesIn.Load(), BytesOut: bytesOut.Load(), Err: res.Err}, false, "", nil
	}
}
```

::: tip Preserving Buffered Bytes
If you wrap a connection in `bufio.NewReader`, always pass any unconsumed bytes back to the proxy layer using `&protocol.BufferedConn{Conn: conn, Reader: reader}` to prevent data corruption!
:::

---

## Step 4: Write Unit Tests (`plugin_test.go`)

Use Go's `net.Pipe()` to test connection inspection entirely in-memory:

```go
package echo_guard

import (
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
	clientA, clientB := net.Pipe()
	defer clientA.Close()
	defer clientB.Close()

	upA, upB := net.Pipe()
	defer upA.Close()
	defer upB.Close()

	// Drain upstream in the background
	go func() {
		buf := make([]byte, 1024)
		for {
			if _, err := upB.Read(buf); err != nil {
				return
			}
		}
	}()

	insp := &Inspector{BlockedWords: []string{"malicious"}}
	ctx := &sdk.DefaultContext{ServiceName: "test-service", ClientAddress: "127.0.0.1"}

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

	// Send blocked payload
	_, _ = clientA.Write([]byte("this contains malicious content\n"))

	select {
	case res := <-done:
		if !res.blocked {
			t.Error("expected keyword to be blocked")
		}
	case <-time.After(2 * time.Second):
		t.Fatal("test timed out")
	}
}
```

Run tests locally with race detection:

```bash
go test -v -race ./...
```

---

## Step 5: Test Locally with TCP Warden

Test your new plugin with the `tcp-warden` daemon:

```bash
# 1. Install local plugin into tcp-warden
tcp-warden plugins install ./my_protocol

# 2. Verify it appears as ACTIVE
tcp-warden plugins list

# 3. Add to your tcp-warden.yaml configuration
services:
  my_service:
    listen: ":9000"
    upstream: "127.0.0.1:9001"
    protocol: "echo_guard"
    plugin_config:
      blocked_words:
        - "malicious"

# 4. Validate configuration syntax
tcp-warden validate --config tcp-warden.yaml

# 5. Start the proxy
tcp-warden run --config tcp-warden.yaml
```

---

## Step 6: Share Your Plugin

Once your plugin is tested and documented:

1. Push your plugin to GitHub (e.g. `https://github.com/your-org/tcp-warden-plugin`).
2. Anyone can install it directly with:
   ```bash
   tcp-warden plugins install https://github.com/your-org/tcp-warden-plugin
   ```
3. To propose your plugin for inclusion in the official [`routewarden/plugins`](https://github.com/routewarden/plugins) catalog, open a Pull Request!
