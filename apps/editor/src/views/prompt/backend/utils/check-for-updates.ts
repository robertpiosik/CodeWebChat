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

const get_version_age_days = async (
  version: string,
  tag_name?: string
): Promise<number> => {
  const parts = version.split('.')
  if (parts.length >= 2) {
    const year = parseInt(parts[0], 10)
    const mmdd = parts[1]
    if (!isNaN(year) && mmdd.length === 4) {
      const month = parseInt(mmdd.substring(0, 2), 10) - 1
      const day = parseInt(mmdd.substring(2, 4), 10)
      if (!isNaN(month) && !isNaN(day)) {
        const version_date = Date.UTC(year, month, day)
        const age_days = Math.floor(
          (Date.now() - version_date) / (1000 * 60 * 60 * 24)
        )
        return age_days >= 0 ? age_days : 0
      }
    }
  }

  if (tag_name) {
    try {
      const res = await axios.get(
        `https://api.github.com/repos/CodeWebChat/CWC/commits/${tag_name}`,
        { validateStatus: () => true }
      )
      if (res.status === 200) {
        const date = res.data.commit?.committer?.date
        if (date) {
          const age_days = Math.floor(
            (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
          )
          return age_days >= 0 ? age_days : 0
        }
      }
    } catch (e) {
      console.error('Failed to fetch commit date:', e)
    }
  }

  return Infinity
}

export const check_for_updates = async (
  provider: PromptViewProvider,
  params?: { force?: boolean }
) => {
  const force = params?.force ?? false

  const current_version =
    provider.extension_context.extension.packageJSON.version
  if (!current_version) return

  const config = vscode.workspace.getConfiguration('codeWebChat')
  const minimum_release_age = force
    ? 0
    : config.get<number>('minimumReleaseAge', 0)

  if (!force) {
    const last_check = provider.extension_context.globalState.get<number>(
      state_keys.LAST_UPDATE_CHECK_TIMESTAMP_STATE_KEY,
      0
    )
    const now = Date.now()
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

  provider.update_info = await fetch_update_info(
    current_version,
    minimum_release_age
  )

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
  current_version: string,
  minimum_release_age: number
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

      for (const tag of tags) {
        if (tag.name?.endsWith('-vscode')) {
          const latest_version = tag.name.replace('-vscode', '')
          if (is_newer(latest_version, current_version)) {
            if (minimum_release_age > 0) {
              const tag_age_days = await get_version_age_days(
                latest_version,
                tag.name
              )
              if (tag_age_days < minimum_release_age) {
                continue
              }
            }

            const current_version_age_days = await get_version_age_days(
              current_version,
              `${current_version}-vscode`
            )

            return {
              is_available: true,
              latest_version,
              latest_version_tag: tag.name,
              current_version_age_days
            }
          } else {
            return { is_available: false }
          }
        }
      }
      page++
    }
  } catch (e) {
    console.error('Failed to check for updates:', e)
  }

  return { is_available: false }
}
