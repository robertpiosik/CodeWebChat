const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const manifest_path = path.resolve(__dirname, '../src/manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf-8'))

const date = new Date()
const year = date.getFullYear()
const month = String(date.getMonth() + 1).padStart(2, '0')
const day = String(date.getDate()).padStart(2, '0')
const date_prefix = `${year}.${month}${day}`

const version_parts = manifest.version.split('.')
const last_segment = parseInt(version_parts.pop(), 10) || 0

const next_segment = last_segment + 1
manifest.version = `${date_prefix}.${next_segment}`

fs.writeFileSync(manifest_path, JSON.stringify(manifest, null, 2) + '\n')
console.log(`Bumped version to ${manifest.version}`)

try {
  execSync(`git add "${manifest_path}"`, { stdio: 'ignore' })
  execSync(`git commit --no-verify -m "Bump version to ${manifest.version}"`, { stdio: 'ignore' })
  console.log('Successfully committed the version bump.')
} catch (error) {
  console.error('Failed to commit version bump:', error.message)
}
