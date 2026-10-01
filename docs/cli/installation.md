# Installation

`rwarden` is distributed as a single, statically compiled binary with zero external runtime dependencies. Choose the installation method that fits your environment.

---

## 1. One-Liner Script (macOS & Linux)

Download and install the latest release binary automatically:

```bash
curl -fsSL https://routewarden.github.io/install.sh | bash
```

To install without `sudo` into a user directory like `~/.local/bin`:

```bash
curl -fsSL https://routewarden.github.io/install.sh | INSTALL_DIR=$HOME/.local/bin bash
```

---

## 2. Pre-Built Release Binaries

Download standalone, statically compiled binaries for **Linux**, **macOS**, and **Windows** directly from [GitHub Releases](https://github.com/routewarden/cli/releases/latest):

| Platform | Architecture | Archive |
|:---|:---|:---|
| **macOS** | Apple Silicon (`arm64`) | [rwarden_4.0.1_darwin_arm64.tar.gz](https://github.com/routewarden/cli/releases/download/v4.0.1/rwarden_4.0.1_darwin_arm64.tar.gz) |
| **macOS** | Intel (`amd64`) | [rwarden_4.0.1_darwin_amd64.tar.gz](https://github.com/routewarden/cli/releases/download/v4.0.1/rwarden_4.0.1_darwin_amd64.tar.gz) |
| **Linux** | 64-bit (`amd64`) | [rwarden_4.0.1_linux_amd64.tar.gz](https://github.com/routewarden/cli/releases/download/v4.0.1/rwarden_4.0.1_linux_amd64.tar.gz) |
| **Linux** | ARM64 (`arm64`) | [rwarden_4.0.1_linux_arm64.tar.gz](https://github.com/routewarden/cli/releases/download/v4.0.1/rwarden_4.0.1_linux_arm64.tar.gz) |
| **Windows**| 64-bit (`amd64`) | [rwarden_4.0.1_windows_amd64.zip](https://github.com/routewarden/cli/releases/download/v4.0.1/rwarden_4.0.1_windows_amd64.zip) |

::: tip macOS Gatekeeper Notice
If macOS displays *"Apple could not verify “rwarden” is free of malware..."* when running a downloaded binary, macOS Gatekeeper has placed it in quarantine. You can remove the quarantine flag using:

```bash
xattr -d com.apple.quarantine $(which rwarden)
# Or for a downloaded binary directly:
xattr -d com.apple.quarantine rwarden
```

Alternatively, navigate to **System Settings > Privacy & Security** and click **"Allow Anyway"** next to the `rwarden` prompt.
:::

All downloads and SHA256 checksums are published on the [GitHub Releases Page](https://github.com/routewarden/cli/releases/latest).

---

## 3. Container Image (Docker / CI/CD)

Run `rwarden` inside a container without installing local binaries:

```bash
# Validate configuration file directly
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest validate --config /routewarden.json

# Test path interactively
docker run --rm ghcr.io/routewarden/cli:latest test --path "/.env"
```

---

## 4. From Source (Go)

If you have Go 1.22+ installed, compile and install from source:

```bash
git clone https://github.com/routewarden/cli.git
cd cli
go build -o /usr/local/bin/rwarden .
```

---

## Verification

Verify that `rwarden` is accessible in your system `$PATH`:

::: code-group

```bash [CLI]
rwarden version
# rwarden version 4.0.1
```

```bash [Docker]
docker run --rm ghcr.io/routewarden/cli:latest version
# rwarden version 4.0.1
```

:::

---

## Uninstallation

`rwarden` is a single self-contained binary with no background daemon services or system hooks. To remove it:

```bash
# If installed system-wide (default):
sudo rm -f /usr/local/bin/rwarden

# If installed in user directory:
rm -f ~/.local/bin/rwarden
```
