import { useEffect, useRef } from 'react'
import styles from './AsciiArtEffect.module.scss'

export type Props = {
  density?: number
}

export const AsciiArtEffect = ({ density = 1 }: Props) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const parent = el.parentElement
    if (!parent) return

    const handle_mouse_leave = () => {
      el.style.setProperty('--mouse-x', `-100px`)
      el.style.setProperty('--mouse-y', `-100px`)
    }

    const handle_mouse_move = (e: MouseEvent) => {
      const disabled_elements = parent.querySelectorAll(
        ':disabled, [disabled], [aria-disabled="true"], [data-disabled="true"]'
      )

      for (let i = 0; i < disabled_elements.length; i++) {
        const disabled_rect = disabled_elements[i].getBoundingClientRect()
        if (
          e.clientX >= disabled_rect.left &&
          e.clientX <= disabled_rect.right &&
          e.clientY >= disabled_rect.top &&
          e.clientY <= disabled_rect.bottom
        ) {
          handle_mouse_leave()
          return
        }
      }

      const rect = parent.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      el.style.setProperty('--mouse-x', `${x}px`)
      el.style.setProperty('--mouse-y', `${y}px`)
    }

    parent.addEventListener('mousemove', handle_mouse_move)
    parent.addEventListener('mouseleave', handle_mouse_leave)

    return () => {
      parent.removeEventListener('mousemove', handle_mouse_move)
      parent.removeEventListener('mouseleave', handle_mouse_leave)
    }
  }, [])

  const size = Math.round(88 / Math.sqrt(density))

  return (
    <div ref={ref} className={styles.container}>
      <div
        className={styles.inner}
        style={{ '--mask-size': `${size}px ${size}px` } as React.CSSProperties}
      />
    </div>
  )
}
