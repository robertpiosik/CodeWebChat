import * as vscode from 'vscode'
import axios from 'axios'
import * as state_keys from '@/constants/state-keys'
import { UpdateInfo } from '@/views/prompt/types/messages'
import { PromptViewProvider } from '../prompt-view-provider'

const is_newer = (latest: string, current: string) => {
  const l = latest.split('.').map(Number)
  const c = current.split('.').map(Number)
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const l_val = l[i] || 0
    const c_val = c[i] || 0
    if (l_val > c_val) return true
    if (l_val < c_val) return false
  }
  return false
}

export const check_for_updates = async (
  provider: PromptViewProvider,
  params?: { force?: boolean }
) => {
  const force = params?.force ?? false

  const current_version =
    provider.extension_context.extension.packageJSON.version
  if (!current_version) return

  if (!force) {
    const last_check = provider.extension_context.globalState.get<number>(
      state_keys.LAST_UPDATE_CHECK_TIMESTAMP_STATE_KEY,
      0
    )
    const now = Date.now()
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const frequency = config.get<'hourly' | 'daily' | 'weekly' | 'monthly'>(
      'updateCheckFrequency',
      'hourly'
    )

    let required_elapsed_time = 60 * 60 * 1000
    if (frequency === 'daily') {
      required_elapsed_time = 24 * 60 * 60 * 1000
    } else if (frequency === 'weekly') {
      required_elapsed_time = 7 * 24 * 60 * 60 * 1000
    } else if (frequency === 'monthly') {
      required_elapsed_time = 30 * 24 * 60 * 60 * 1000
    }

    if (now - last_check < required_elapsed_time) {
      const cached = provider.extension_context.globalState.get<UpdateInfo>(
        state_keys.CACHED_UPDATE_INFO_STATE_KEY
      )
      if (cached) {
        if (cached.is_available && cached.latest_version) {
          if (!is_newer(cached.latest_version, current_version)) {
            cached.is_available = false
            provider.extension_context.globalState.update(
              state_keys.CACHED_UPDATE_INFO_STATE_KEY,
              cached
            )
          }
        }
        provider.update_info = cached
      }

      provider.send_message({
        command: 'UPDATE_INFO',
        update_info: provider.update_info
      })

      return
    }
  }

  provider.update_info = await fetch_update_info(current_version)

  provider.extension_context.globalState.update(
    state_keys.LAST_UPDATE_CHECK_TIMESTAMP_STATE_KEY,
    Date.now()
  )
  provider.extension_context.globalState.update(
    state_keys.CACHED_UPDATE_INFO_STATE_KEY,
    provider.update_info
  )

  provider.send_message({
    command: 'UPDATE_INFO',
    update_info: provider.update_info
  })
}

const fetch_update_info = async (
  current_version: string
): Promise<UpdateInfo> => {
  if (!current_version) return { is_available: false }

  try {
    let page = 1
    while (page <= 10) {
      const res = await axios.get(
        `https://api.github.com/repos/CodeWebChat/CWC/tags?page=${page}`,
        { validateStatus: () => true }
      )
      if (res.status !== 200) break
      const tags = res.data
      if (!Array.isArray(tags) || tags.length === 0) break

      const vscode_tag = tags.find((t: any) => t.name?.endsWith('-vscode'))
      if (vscode_tag) {
        const latest_version = vscode_tag.name.replace('-vscode', '')
        if (is_newer(latest_version, current_version)) {
          let age_days = 0
          try {
            const commit_res = await axios.get(
              `https://api.github.com/repos/CodeWebChat/CWC/commits/${current_version}-vscode`,
              { validateStatus: () => true }
            )
            if (commit_res.status === 200) {
              const commit_data = commit_res.data
              const date = commit_data.commit?.committer?.date
              if (date) {
                age_days = Math.floor(
                  (Date.now() - new Date(date).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              }
            }
          } catch (e) {
            console.error('Failed to fetch commit date:', e)
          }

          return {
            is_available: true,
            latest_version,
            latest_version_tag: vscode_tag.name,
            current_version_age_days: age_days
          }
        } else {
          return { is_available: false }
        }
      }
      page++
    }
  } catch (e) {
    console.error('Failed to check for updates:', e)
  }

  return { is_available: false }
}
