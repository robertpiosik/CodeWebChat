import { useState, useEffect } from 'react'

type UpdateInfo = {
  is_available: boolean
  latest_version?: string
  current_version_age_days?: number
}

let global_update_info: UpdateInfo = { is_available: false }
const CHECK_INTERVAL = 5 * 60 * 1000

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

export const use_update_check = (current_version: string, is_active: boolean) => {
  const [update_info, set_update_info] = useState<UpdateInfo>(global_update_info)

  useEffect(() => {
    if (!is_active || !current_version) {
      return
    }
    let is_mounted = true
    let timeout_id: ReturnType<typeof setTimeout>

    const check = async () => {
      try {
        let page = 1
        while (page <= 10) {
          const res = await fetch(
            `https://api.github.com/repos/robertpiosik/CodeWebChat/tags?page=${page}`
          )
          if (!res.ok) break
          const tags = await res.json()
          if (!Array.isArray(tags) || tags.length === 0) break

          const vscode_tag = tags.find((t: any) => t.name?.endsWith('-vscode'))
          if (vscode_tag) {
            const latest_version = vscode_tag.name.replace('-vscode', '')
            if (is_newer(latest_version, current_version)) {
              let age_days = 0
              try {
                const commit_res = await fetch(
                  `https://api.github.com/repos/robertpiosik/CodeWebChat/commits/${current_version}-vscode`
                )
                if (commit_res.ok) {
                  const commit_data = await commit_res.json()
                  const date = commit_data.commit?.committer?.date
                  if (date) {
                    age_days = Math.floor(
                      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
                    )
                  }
                }
              } catch (e) {
                console.error('Failed to fetch commit date:', e)
              }

              global_update_info = {
                is_available: true,
                latest_version,
                current_version_age_days: age_days
              }
              if (is_mounted) {
                set_update_info(global_update_info)
              }
            }
            break
          }
          page++
        }
      } catch (e) {
        console.error('Failed to check for updates:', e)
      }

      if (is_mounted) {
        timeout_id = setTimeout(check, CHECK_INTERVAL)
      }
    }

    check()

    return () => {
      is_mounted = false
      clearTimeout(timeout_id)
    }
  }, [current_version, is_active])

  return update_info
}