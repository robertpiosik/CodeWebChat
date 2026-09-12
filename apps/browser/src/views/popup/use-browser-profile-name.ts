import React, { useEffect, useState } from 'react'
import browser from 'webextension-polyfill'

export const use_browser_profile_name = () => {
  const [profile_name, set_profile_name] = useState<string>('')

  useEffect(() => {
    const init = async () => {
      const storage = await browser.storage.local.get('browser-profile-name')
      set_profile_name((storage['browser-profile-name'] as string) || '')
    }
    init()
  }, [])

  const handle_profile_name_change = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value
    set_profile_name(value)
    if (value) {
      await browser.storage.local.set({ 'browser-profile-name': value })
    } else {
      await browser.storage.local.remove('browser-profile-name')
    }
  }

  return {
    profile_name,
    handle_profile_name_change
  }
}
