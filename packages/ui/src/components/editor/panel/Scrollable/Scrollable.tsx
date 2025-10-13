import { useState, useEffect, useRef, ReactNode } from 'react'
import styles from './Scrollable.module.scss'
import SimpleBar from 'simplebar-react'
import cn from 'classnames'

type Props = {
  children: ReactNode
}

export const Scrollable: React.FC<Props> = ({ children }) => {
  const [has_top_shadow, set_has_top_shadow] = useState(false)
  const simplebar_ref = useRef<any>(null)

  useEffect(() => {
    const simplebar_instance = simplebar_ref.current
    if (!simplebar_instance) return

    const scroll_element = simplebar_instance.getScrollElement()
    if (!scroll_element) return

    const update_shadows = () => {
      const { scrollTop, scrollHeight, clientHeight } = scroll_element
      const is_scrollable = scrollHeight > clientHeight

      set_has_top_shadow(is_scrollable && scrollTop > 0)
    }

    update_shadows()

    scroll_element.addEventListener('scroll', update_shadows)

    const content_element = simplebar_instance.getContentElement()
    const resize_observer = new ResizeObserver(update_shadows)
    if (content_element) {
      resize_observer.observe(content_element)
    }

    return () => {
      scroll_element.removeEventListener('scroll', update_shadows)
      resize_observer.disconnect()
    }
  }, [])

  return (
    <div
      className={cn(styles.scrollable, {
        [styles['scrollable--shadow']]: has_top_shadow
      })}
    >
      <SimpleBar
        ref={simplebar_ref}
        style={{
          height: '100%'
        }}
      >
        {children}
      </SimpleBar>
    </div>
  )
}
