import { useMemo } from 'react'

export const use_is_mac = (): boolean => {
  return useMemo(() => {
    if (typeof navigator == 'undefined') return false
    const any_nav = navigator as any
    const uach_platform: string | undefined = any_nav?.userAgentData?.platform
    if (typeof uach_platform == 'string') {
      return uach_platform.toLowerCase().includes('mac')
    }
    if (typeof navigator.userAgent == 'string') {
      return /mac/i.test(navigator.userAgent)
    }
    return false
  }, [])
}