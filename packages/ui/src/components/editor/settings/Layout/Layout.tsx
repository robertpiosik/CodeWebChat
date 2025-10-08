import styles from './Layout.module.scss'
import { forwardRef, useRef, useEffect, useState } from 'react'
import SimpleBar from 'simplebar-react'

type Props = {
  title: string
  sidebar: React.ReactNode
  children: React.ReactNode
}

export const Layout = forwardRef<HTMLDivElement, Props>((props, ref) => {
  const content_inner_ref = useRef<HTMLDivElement>(null)
  const [padding_bottom, set_padding_bottom] = useState('0')

  useEffect(() => {
    let resize_observer: ResizeObserver | null = null
    const update_padding = () => {
      const inner = content_inner_ref.current
      if (!inner) return

      const last_child = inner.lastElementChild as HTMLElement
      if (!last_child) return

      const last_child_height = last_child.offsetHeight
      const viewport_height = window.innerHeight
      const calculated_padding =
        viewport_height - Math.floor(last_child_height) - 60

      set_padding_bottom(
        calculated_padding > 0 ? `${calculated_padding}px` : '0px'
      )
    }

    update_padding()
    window.addEventListener('resize', update_padding)

    const inner = content_inner_ref.current
    if (inner && inner.lastElementChild) {
      resize_observer = new ResizeObserver(update_padding)
      resize_observer.observe(inner.lastElementChild)
    }

    return () => {
      window.removeEventListener('resize', update_padding)
      if (resize_observer) {
        resize_observer.disconnect()
      }
    }
  }, [])

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.sidebar__title}>{props.title}</div>
        <div className={styles.sidebar__navigation}>{props.sidebar}</div>
      </div>
      <div className={styles.content}>
        <SimpleBar scrollableNodeProps={{ ref }}>
          <div
            ref={content_inner_ref}
            className={styles.content__inner}
            style={{ paddingBottom: padding_bottom }}
          >
            {props.children}
          </div>
        </SimpleBar>
      </div>
    </div>
  )
})
Layout.displayName = 'Layout'
