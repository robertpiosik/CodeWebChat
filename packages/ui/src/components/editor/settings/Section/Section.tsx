import styles from './Section.module.scss'
import { forwardRef, useRef, useState, useEffect } from 'react'
import cn from 'classnames'

type Props = {
  title: string
  subtitle: React.ReactNode
  children: React.ReactNode
  on_stuck_change?: (is_stuck: boolean) => void
}

export const Section = forwardRef<HTMLDivElement, Props>((props, ref) => {
  const marker_ref = useRef<HTMLDivElement>(null)
  const container_ref = useRef<HTMLDivElement | null>(null)
  const [is_stuck, set_is_stuck] = useState(false)

  useEffect(() => {
    props.on_stuck_change?.(is_stuck)
  }, [is_stuck, props.on_stuck_change])

  useEffect(() => {
    const marker = marker_ref.current
    const container = container_ref.current
    if (!marker || !container) return

    let is_marker_stuck = false
    let is_container_visible = true

    const update_stuck_state = () => {
      set_is_stuck(is_marker_stuck && is_container_visible)
    }

    const marker_observer = new IntersectionObserver(
      ([entry]) => {
        is_marker_stuck = !entry.isIntersecting
        update_stuck_state()
      },
      { threshold: 1 }
    )

    const container_observer = new IntersectionObserver(
      ([entry]) => {
        is_container_visible = entry.isIntersecting
        update_stuck_state()
      },
      { threshold: 0 }
    )

    marker_observer.observe(marker)
    container_observer.observe(container)

    return () => {
      marker_observer.disconnect()
      container_observer.disconnect()
    }
  }, [])

  return (
    <div
      ref={(node) => {
        container_ref.current = node
        if (typeof ref == 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      }}
      className={styles.container}
    >
      <div
        className={cn(styles.header, { [styles['header--stuck']]: is_stuck })}
      >
        <div className={styles.header__marker} ref={marker_ref} />
        <div className={styles.header__title}>{props.title}</div>
        <div className={styles.header__subtitle}>{props.subtitle}</div>
      </div>
      {props.children}
    </div>
  )
})
Section.displayName = 'Section'
