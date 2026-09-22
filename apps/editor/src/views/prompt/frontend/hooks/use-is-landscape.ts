import { useState, useEffect } from 'react'

const MIN_WIDTH = 600

export const use_is_landscape = () => {
  const [is_landscape, set_is_landscape] = useState(
    window.innerWidth > window.innerHeight && window.innerWidth >= MIN_WIDTH
  )

  useEffect(() => {
    const handle_resize = () => {
      set_is_landscape(
        window.innerWidth > window.innerHeight && window.innerWidth >= MIN_WIDTH
      )
    }

    window.addEventListener('resize', handle_resize)
    return () => window.removeEventListener('resize', handle_resize)
  }, [])

  return is_landscape
}
