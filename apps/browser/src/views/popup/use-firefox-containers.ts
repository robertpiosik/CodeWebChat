import { useEffect, useState } from 'react'
import browser from 'webextension-polyfill'

export type FirefoxContainer = {
  cookieStoreId: string
  name: string
  color: string
  icon: string
}

export const use_firefox_containers = () => {
  const [containers, set_containers] = useState<FirefoxContainer[]>([])
  const [selected_container_id, set_selected_container_id] =
    useState<string>('')
  const [has_permission, set_has_permission] = useState<boolean>(false)
  const [is_firefox, set_is_firefox] = useState<boolean>(false)

  useEffect(() => {
    const is_firefox_detected = navigator.userAgent.includes('Firefox')
    set_is_firefox(is_firefox_detected)

    const init = async () => {
      try {
        if (is_firefox_detected) {
          const permissions = await browser.permissions.contains({
            permissions: ['cookies']
          })
          set_has_permission(permissions)
          if (permissions) {
            await load_containers()
          }
        }
      } catch (error) {
        console.error('Error initializing Firefox containers:', error)
      }
    }
    init()
  }, [])

  const load_containers = async () => {
    try {
      const identities = await browser.contextualIdentities.query({})
      set_containers(identities)

      const { 'selected-firefox-container': selected_id } =
        await browser.storage.local.get('selected-firefox-container')
      set_selected_container_id((selected_id as string) || '')
    } catch (error) {
      console.error('Error loading containers:', error)
    }
  }

  const request_permissions = async () => {
    try {
      const granted = await browser.permissions.request({
        permissions: ['cookies']
      })
      if (granted) {
        set_has_permission(true)
        await load_containers()
      }
    } catch (error) {
      console.error('Error requesting permissions:', error)
    }
  }

  const handle_container_change = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = e.target.value
    set_selected_container_id(value)
    if (value) {
      await browser.storage.local.set({ 'selected-firefox-container': value })
    } else {
      await browser.storage.local.remove('selected-firefox-container')
    }
  }

  return {
    is_firefox,
    has_permission,
    containers,
    selected_container_id,
    request_permissions,
    handle_container_change
  }
}
