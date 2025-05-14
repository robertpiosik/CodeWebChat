import React, { useState } from 'react'
import { IconButton } from '../../IconButton/IconButton'
import { Input } from '../../Input/Input'
import styles from './_ApiKeyField.module.scss'

type Props = {
  value: string
  placeholder?: string
  on_change: (value: string) => void
}

export const _ApiKeyField: React.FC<Props> = (props) => {
  const [show_api_key, set_show_api_key] = useState(false)

  const toggle_api_key_visibility = () => {
    set_show_api_key(!show_api_key)
  }

  return (
    <div className={styles.container}>
      <Input
        type={show_api_key ? 'text' : 'password'}
        value={props.value}
        onChange={props.on_change}
        placeholder={props.placeholder || 'Enter API key'}
      />
      <IconButton
        codicon_icon={show_api_key ? 'eye-closed' : 'eye'}
        on_click={toggle_api_key_visibility}
        title={show_api_key ? 'Hide API key' : 'Show API key'}
      />
    </div>
  )
}
