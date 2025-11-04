import {
  useState,
  useEffect,
  useRef,
  ReactNode,
  forwardRef,
  useImperativeHandle
} from 'react'
import styles from './Scrollable.module.scss'
import SimpleBar from 'simplebar-react'
import cn from 'classnames'

type Props = {
  children: ReactNode
  scroll_to_top_key?: any
  max_height?: string
  initial_scroll_top?: number
  on_scroll?: (top: number) => void
}

export const Scrollable = forwardRef<any, Props>((props, ref) => {
  const [has_top_shadow, set_has_top_shadow] = useState(false)
  const simplebar_ref = useRef<any>(null)

  useImperativeHandle(ref, () => simplebar_ref.current)

  useEffect(() => {
    if (props.scroll_to_top_key === undefined) return

    const simplebar_instance = simplebar_ref.current
    if (!simplebar_instance) return

    const scroll_element = simplebar_instance.getScrollElement()
    if (!scroll_element) return
    scroll_element.scrollTop = 0
  }, [props.scroll_to_top_key])

  useEffect(() => {
    const simplebar_instance = simplebar_ref.current
    if (!simplebar_instance) return

    const scroll_element = simplebar_instance.getScrollElement()
    if (!scroll_element) return

    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = scroll_element
      const is_scrollable = scrollHeight > clientHeight
      set_has_top_shadow(is_scrollable && scrollTop > 0)
      if (props.on_scroll) props.on_scroll(scrollTop)
    }

    update()

    scroll_element.addEventListener('scroll', update)

    const content_element = simplebar_instance.getContentElement()
    const resize_observer = new ResizeObserver(update)
    if (content_element) {
      resize_observer.observe(content_element)
    }

    return () => {
      scroll_element.removeEventListener('scroll', update)
      resize_observer.disconnect()
    }
  }, [props.on_scroll])

  useEffect(() => {
    const simplebar_instance = simplebar_ref.current
    if (!simplebar_instance) return

    const scroll_element = simplebar_instance.getScrollElement()
    if (!scroll_element) return

    if (typeof props.initial_scroll_top == 'number') {
      requestAnimationFrame(() => {
        scroll_element.scrollTop = props.initial_scroll_top
      })
    }
  }, [props.initial_scroll_top])

  return (
    <div
      className={cn(styles.scrollable, {
        [styles['scrollable--shadow']]: has_top_shadow
      })}
    >
      <SimpleBar
        ref={simplebar_ref}
        style={{
          height: '100%',
          maxHeight: props.max_height
        }}
      >
        {props.children}
      </SimpleBar>
    </div>
  )
})
Scrollable.displayName = 'Scrollable'
