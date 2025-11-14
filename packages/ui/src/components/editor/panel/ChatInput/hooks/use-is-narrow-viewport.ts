import { useState, useEffect } from 'react'

export const use_is_narrow_viewport = () => {
  const [is_narrow_viewport, set_is_narrow_viewport] = useState(false)

  useEffect(() => {
    const handle_resize = () => {
      set_is_narrow_viewport(window.innerWidth < 268)
    }

    window.addEventListener('resize', handle_resize)
    handle_resize()

    return () => window.removeEventListener('resize', handle_resize)
  }, [])

  return is_narrow_viewport
}
