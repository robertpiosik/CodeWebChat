import { FC, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import styles from './TextItem.module.scss'
import { IconButton } from '../../IconButton'

type Props = {
  content: string
  is_expanded: boolean
  on_toggle: (element: HTMLDivElement) => void
}

export const TextItem: FC<Props> = (props) => {
  const header_ref = useRef<HTMLDivElement>(null)
  const mouse_moved = useRef(false)
  const has_selection = useRef(false)

  const handle_mouse_down = () => {
    mouse_moved.current = false

    const selection = window.getSelection()
    has_selection.current =
      (selection && selection.toString().length > 0) || false
  }

  const handle_mouse_move = () => {
    mouse_moved.current = true

   
  }

  const handle_mouse_up = () => {
    if (!mouse_moved.current && !has_selection.current) {
      props.on_toggle(header_ref.current!)
    }
  }

  return (
    <div className={styles.container}>
      <div
        ref={header_ref}
        className={styles.header}
        onClick={() => props.on_toggle(header_ref.current!)}
      >
        <IconButton
          codicon_icon={props.is_expanded ? 'chevron-down' : 'chevron-right'}
        />
        <div className={styles.header__line} />
        <span className={styles.header__tokens}>
          {Math.floor(props.content.length * 0.25) || 1}
        </span>
      </div>
      {props.is_expanded && (
        <div
          className={styles.text}
          onMouseDown={handle_mouse_down}
          onMouseMove={handle_mouse_move}
          onMouseUp={handle_mouse_up}
        >
          <ReactMarkdown disallowedElements={['a', 'hr']}>
            {props.content}
          </ReactMarkdown>
          <div
            className={styles.text__collapse}
            onClick={() => {
              props.on_toggle(header_ref.current!)
            }}
          >
            <span>Show less</span>
          </div>
        </div>
      )}
    </div>
  )
}
