import styles from './Section.module.scss'
import { forwardRef, useRef, useState, useEffect } from 'react'
import cn from 'classnames'

type Props = {
  title: string
  subtitle: React.ReactNode
  children: React.ReactNode
  on_stuck_change: (is_stuck: boolean) => void
  group?: string
}

export const Section = forwardRef<HTMLDivElement, Props>((props, ref) => {
  const marker_ref = useRef<HTMLDivElement>(null)
  const container_ref = useRef<HTMLDivElement | null>(null)
  const class_marker_ref = useRef<HTMLDivElement>(null)
  const [is_stuck, set_is_stuck] = useState(false)
  const [add_stuck_class, set_add_stuck_class] = useState(false)

  useEffect(() => {
    props.on_stuck_change(is_stuck)
  }, [is_stuck])

  useEffect(() => {
    const marker = marker_ref.current
    const container = container_ref.current
    const class_marker = class_marker_ref.current
    if (!marker || !container || !class_marker) return

    let is_marker_stuck = false
    let is_class_marker_stuck = false
    let is_container_visible = true

    const update_states = () => {
      set_is_stuck(is_marker_stuck && is_container_visible)
      set_add_stuck_class(is_class_marker_stuck && is_container_visible)
    }

    const marker_observer = new IntersectionObserver(
      ([entry]) => {
        is_marker_stuck = !entry.isIntersecting
        update_states()
      },
      { threshold: 1 }
    )

    const class_marker_observer = new IntersectionObserver(
      ([entry]) => {
        is_class_marker_stuck = !entry.isIntersecting
        update_states()
      },
      { threshold: 1 }
    )

    const container_observer = new IntersectionObserver(
      ([entry]) => {
        is_container_visible = entry.isIntersecting
        update_states()
      },
      { threshold: 0 }
    )

    marker_observer.observe(marker)
    class_marker_observer.observe(class_marker)
    container_observer.observe(container)

    return () => {
      marker_observer.disconnect()
      class_marker_observer.disconnect()
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
      <div className={styles.class_marker} ref={class_marker_ref} />
      <div
        className={cn(styles.header, {
          [styles['header--stuck']]: add_stuck_class
        })}
      >
        <div className={styles.header__marker} ref={marker_ref} />
        {props.group && (
          <div className={styles.header__group}>{props.group}</div>
        )}
        <div className={styles.header__title}>{props.title}</div>
        <div className={styles.header__subtitle}>{props.subtitle}</div>
      </div>
      {props.children}
    </div>
  )
})
Section.displayName = 'Section'
