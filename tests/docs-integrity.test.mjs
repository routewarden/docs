import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const docsDir = path.join(rootDir, 'docs')

test('documentation structure and integrity', async (t) => {
  await t.test('required core files exist and are non-empty', () => {
    const requiredFiles = [
      'core/anti-evasion.md',
      'core/custom-patterns.md',
      'core/changelog.md',
      'core/response-modes.md',
      'core/architecture.md',
      'index.md'
    ]

    for (const rel of requiredFiles) {
      const fullPath = path.join(docsDir, rel)
      assert.ok(fs.existsSync(fullPath), `Expected file to exist: ${rel}`)
      const stat = fs.statSync(fullPath)
      assert.ok(stat.size > 0, `File should not be empty: ${rel}`)
    }
  })

  await t.test('gateway specific sections exist', () => {
    const gateways = ['traefik', 'caddy', 'nginx']
    for (const gw of gateways) {
      const dir = path.join(docsDir, gw)
      assert.ok(fs.existsSync(dir), `Expected gateway directory: ${gw}`)
      assert.ok(fs.existsSync(path.join(dir, 'index.md')), `Expected ${gw}/index.md`)
      assert.ok(fs.existsSync(path.join(dir, 'getting-started.md')), `Expected ${gw}/getting-started.md`)
      assert.ok(fs.existsSync(path.join(dir, 'examples.md')), `Expected ${gw}/examples.md`)
    }
  })

  await t.test('reference documents properly include canonical core documents', () => {
    const includes = [
      { file: 'reference/anti-evasion.md', expectedTarget: '../core/anti-evasion.md' },
      { file: 'reference/custom-paths.md', expectedTarget: '../core/custom-patterns.md' },
      { file: 'reference/changelog.md', expectedTarget: '../core/changelog.md' },
      { file: 'reference/response-modes.md', expectedTarget: '../core/response-modes.md' }
    ]

    for (const { file, expectedTarget } of includes) {
      const fullPath = path.join(docsDir, file)
      assert.ok(fs.existsSync(fullPath), `Expected reference file to exist: ${file}`)
      const content = fs.readFileSync(fullPath, 'utf8').trim()
      assert.equal(
        content,
        `<!--@include: ${expectedTarget}-->`,
        `${file} should reference ${expectedTarget}`
      )
    }
  })

  await t.test('all relative markdown includes in docs resolve to real files', () => {
    function findMarkdownFiles(dir) {
      let results = []
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name !== '.vitepress' && entry.name !== 'node_modules') {
            results = results.concat(findMarkdownFiles(fullPath))
          }
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          results.push(fullPath)
        }
      }
      return results
    }

    const mdFiles = findMarkdownFiles(docsDir)
    assert.ok(mdFiles.length > 0, 'Should find markdown files')

    const includeRegex = /<!--@include:\s*([^\s>]+)-->/g
    for (const file of mdFiles) {
      const content = fs.readFileSync(file, 'utf8')
      let match
      while ((match = includeRegex.exec(content)) !== null) {
        const includeTarget = match[1]
        const resolvedPath = path.resolve(path.dirname(file), includeTarget)
        assert.ok(
          fs.existsSync(resolvedPath),
          `Broken @include in ${path.relative(docsDir, file)}: target "${includeTarget}" does not exist at ${resolvedPath}`
        )
      }
    }
  })

  await t.test('docs/version.json and versions.json registry have valid format', () => {
    const versionPath = path.join(docsDir, 'version.json')
    assert.ok(fs.existsSync(versionPath), 'docs/version.json must exist')
    const vData = JSON.parse(fs.readFileSync(versionPath, 'utf8'))
    assert.ok(typeof vData.version === 'string', 'version must be string')
    assert.match(vData.version, /^v?\d+\.\d+\.\d+/, 'version must match semver')

    const versionsPath = path.join(docsDir, 'versions.json')
    assert.ok(fs.existsSync(versionsPath), 'docs/versions.json must exist')
    const registry = JSON.parse(fs.readFileSync(versionsPath, 'utf8'))
    assert.ok(typeof registry.current === 'string', 'registry.current must be string')
    assert.ok(Array.isArray(registry.versions), 'registry.versions must be array')
    assert.ok(registry.versions.length > 0, 'registry.versions must not be empty')
  })
})
