import React from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import styles from './Textarea.module.scss'

type Props = {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}

export const Textarea: React.FC<Props> = (props) => {
  return (
    <TextareaAutosize
      className={styles.textarea}
      value={props.value}
      minRows={2}
    />
  )
}
