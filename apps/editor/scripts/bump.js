const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const readline = require('readline')

const pkg_path = path.resolve(__dirname, '../package.json')
const pkg = JSON.parse(fs.readFileSync(pkg_path, 'utf-8'))

const date = new Date()
const year = date.getFullYear()
const month = String(date.getMonth() + 1).padStart(2, '0')
const day = String(date.getDate()).padStart(2, '0')
const date_prefix = `${year}.${month}${day}`

const version_parts = pkg.version.split('.')
const last_segment = parseInt(version_parts.pop(), 10) || 0

const next_segment = last_segment + 1
const next_version = `${date_prefix}.${next_segment}`

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

rl.question(`Bump version of the VS Code extension to ${next_version}? (y/N) `, (answer) => {
  if (answer.toLowerCase() === 'y') {
    pkg.version = next_version
    fs.writeFileSync(pkg_path, JSON.stringify(pkg, null, 2) + '\n')
    console.log(`Bumped version of the VS Code extension to ${pkg.version}`)

    try {
      execSync(`git add "${pkg_path}"`, { stdio: 'ignore' })
      execSync(`git commit --no-verify -m "Bump version of the VS Code extension to ${pkg.version}"`, {
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
