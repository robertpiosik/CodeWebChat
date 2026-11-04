const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const readline = require('readline')

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
const next_version = `${date_prefix}.${next_segment}`

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

rl.question(`Bump version of the browser extension to ${next_version}? (y/N) `, (answer) => {
  if (answer.toLowerCase() === 'y') {
    manifest.version = next_version
    fs.writeFileSync(manifest_path, JSON.stringify(manifest, null, 2) + '\n')
    console.log(`Bumped version of the browser extension to ${manifest.version}`)

    try {
      execSync(`git add "${manifest_path}"`, { stdio: 'ignore' })
      execSync(`git commit --no-verify -m "Bump version to ${manifest.version}"`, {
        stdio: 'ignore'
      })
      console.log('Successfully committed the version bump.')
    } catch (error) {
      console.error('Failed to commit version bump:', error.message)
    }
  } else {
    console.log('Version bump aborted.')
  }
  rl.close()
})
