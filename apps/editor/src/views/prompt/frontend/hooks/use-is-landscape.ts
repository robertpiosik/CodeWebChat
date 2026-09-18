import { useState, useEffect } from 'react'

export const use_is_landscape = () => {
  const [is_landscape, set_is_landscape] = useState(
    window.innerWidth > window.innerHeight && window.innerWidth >= 400
  )

  useEffect(() => {
    const handle_resize = () => {
      set_is_landscape(
        window.innerWidth > window.innerHeight && window.innerWidth >= 400
      )
    }

    window.addEventListener('resize', handle_resize)
    return () => window.removeEventListener('resize', handle_resize)
  }, [])

  return is_landscape
}
