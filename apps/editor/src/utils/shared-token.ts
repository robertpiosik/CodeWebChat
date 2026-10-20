import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'

export const get_or_create_shared_token = (): string => {
  const token_dir = path.join(os.homedir(), '.cwc')
  const token_path = path.join(token_dir, '.websocket-token')

  if (fs.existsSync(token_path)) {
    return fs.readFileSync(token_path, 'utf8').trim()
  }

  const token = crypto.randomBytes(32).toString('hex')
  if (!fs.existsSync(token_dir)) {
    fs.mkdirSync(token_dir, { recursive: true, mode: 0o700 })
  }

  // 0o600 restricts access exclusively to the current user
  fs.writeFileSync(token_path, token, { mode: 0o600 })
  return token
}
