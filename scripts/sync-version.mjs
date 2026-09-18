import fs from 'node:fs'
import path from 'node:path'

/**
 * Core version syncing logic
 * @param {Object} options
 * @param {string} [options.rootDir]
 * @param {string} [options.version]
 * @returns {{ updatedFiles: string[], targetVersion: string }}
 */
export function syncVersion(options = {}) {
  const rootDir = options.rootDir || process.cwd()
  const versionFilePath = path.join(rootDir, 'docs/version.json')

  let targetVersion = options.version
  if (!targetVersion) {
    if (!fs.existsSync(versionFilePath)) {
      throw new Error(`Error: ${versionFilePath} not found`)
    }
    const data = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'))
    targetVersion = data.version
  }

  const cleanVersion = targetVersion.startsWith('v') ? targetVersion : `v${targetVersion}`
  const semver = cleanVersion.replace(/^v/, '')
  const updatedFiles = []

  // 1. Ensure package.json version matches (without leading 'v')
  const pkgPath = path.join(rootDir, 'package.json')
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    if (pkg.version !== semver) {
      pkg.version = semver
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
      updatedFiles.push('package.json')
    }
  }

  // 2. Synchronize README.md and examples
  const filesToSync = [
    'README.md',
    'examples/01-basic-sensitive-files/docker-compose.yml',
    'examples/02-global-entrypoint-shield/docker-compose.yml',
    'examples/03-ip-whitelist-vpn/docker-compose.yml',
    'examples/04-captcha-challenge/docker-compose.yml',
    'examples/05-kubernetes-ingressroute/README.md'
  ]

  for (const relPath of filesToSync) {
    const filePath = path.join(rootDir, relPath)
    if (!fs.existsSync(filePath)) {
      continue
    }

    let content = fs.readFileSync(filePath, 'utf8')
    const original = content

    // Match CLI flag: --experimental.plugins.routewarden.version=vX.Y.Z
    content = content.replace(
      /(--experimental\.plugins\.routewarden\.version=)v?[0-9]+\.[0-9]+\.[0-9]+/g,
      `$1${cleanVersion}`
    )

    // Match YAML property: version: vX.Y.Z
    content = content.replace(
      /(version:\s+)v?[0-9]+\.[0-9]+\.[0-9]+/g,
      `$1${cleanVersion}`
    )

    // Match xcaddy tag: github.com/routewarden/caddy-warden@vX.Y.Z
    content = content.replace(
      /(github\.com\/routewarden\/caddy-warden@)v?[0-9]+\.[0-9]+\.[0-9]+/g,
      `$1${cleanVersion}`
    )

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8')
      updatedFiles.push(relPath)
    }
  }

  return { updatedFiles, targetVersion: cleanVersion }
}

// Auto-run when executed directly via CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const { updatedFiles, targetVersion } = syncVersion()
  console.log(`🔄 Synced RouteWarden version: ${targetVersion}`)
  console.log(`✨ Successfully synced version to ${updatedFiles.length} file(s)!`)
}
