import axios from 'axios'
import { UpdateInfo } from '@/views/prompt/types/messages'

export const check_for_updates = async (
  current_version: string
): Promise<UpdateInfo> => {
  if (!current_version) return { is_available: false }

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
            latest_version_sha: vscode_tag.commit?.sha,
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
