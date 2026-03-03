import * as vscode from 'vscode'
import axios from 'axios'
import * as crypto from 'crypto'
import * as http from 'http'
import { URL, URLSearchParams } from 'url'

export const authenticate_chatgpt = async (): Promise<string> => {
  const client_id = 'app_EMoamEEZ73f0CkXaXp7hrann'
  const redirect_uri = 'http://localhost:1455/auth/callback'
  const auth_endpoint = 'https://auth.openai.com/oauth/authorize'
  const token_endpoint = 'https://auth.openai.com/oauth/token'

  const code_verifier = crypto.randomBytes(32).toString('base64url')
  const code_challenge = crypto
    .createHash('sha256')
    .update(code_verifier)
    .digest('base64url')
  const state = crypto.randomBytes(16).toString('hex')

  const params = new URLSearchParams({
    client_id,
    redirect_uri,
    scope: 'openid profile email offline_access',
    code_challenge,
    code_challenge_method: 'S256',
    response_type: 'code',
    state,
    codex_cli_simplified_flow: 'true',
    originator: 'code-web-chat'
  })

  const auth_url = `${auth_endpoint}?${params.toString()}`
  await vscode.env.openExternal(vscode.Uri.parse(auth_url))

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || '', 'http://localhost:1455')
        if (url.pathname != '/auth/callback') {
          res.writeHead(404)
          res.end('Not Found')
          return
        }

        const code = url.searchParams.get('code')
        const req_state = url.searchParams.get('state')
        const error = url.searchParams.get('error')

        if (error) {
          res.writeHead(400)
          res.end(`Authentication failed: ${error}`)
          server.close()
          return reject(new Error(error))
        }

        if (!code || req_state !== state) {
          res.writeHead(400)
          res.end('Invalid request')
          server.close()
          return reject(new Error('Invalid request'))
        }

        const body = new URLSearchParams({
          grant_type: 'authorization_code',
          client_id,
          code,
          redirect_uri,
          code_verifier
        })

        const token_res = await axios.post(token_endpoint, body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(
          `<!DOCTYPE html><html><body><h1>Authentication Successful</h1><p>You can close this window and return to VS Code.</p><script>setTimeout(() => window.close(), 3000);</script></body></html>`
        )

        server.close()
        resolve(token_res.data.access_token)
      } catch (err) {
        res.writeHead(500)
        res.end('Internal Server Error')
        server.close()
        reject(err)
      }
    })

    server.on('error', (err) => {
      reject(err)
    })

    setTimeout(
      () => {
        server.close()
        reject(new Error('Authentication timed out'))
      },
      5 * 60 * 1000
    )

    server.listen(1455)
  })
}
