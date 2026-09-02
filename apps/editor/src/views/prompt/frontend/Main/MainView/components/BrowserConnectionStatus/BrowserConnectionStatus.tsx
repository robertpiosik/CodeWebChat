import React, { useEffect, useState } from 'react'
import { StatusBar } from '@ui/components/editor/prompt/StatusBar'

type Props = {
  is_connected: boolean
  has_responses: boolean
  translations: {
    connected: string
    not_connected: string
    install: string
    hide: string
  }
  on_install: () => void
}

export const BrowserConnectionStatus: React.FC<Props> = (props) => {
  const [is_closed, setIsClosed] = useState(false)

  useEffect(() => {
    if (props.has_responses) {
      setIsClosed(true)
    } else if (!props.is_connected) {
      setIsClosed(false)
    }
  }, [props.has_responses, props.is_connected])

  if (is_closed || props.has_responses) {
    return null
  }

  const actions = []
  if (!props.is_connected) {
    actions.push({
      id: 'install',
      icon: 'codicon-add',
      label: props.translations.install,
      title: props.translations.install,
      on_click: props.on_install
    })
  } else {
    actions.push({
      id: 'hide',
      icon: 'codicon-close-small',
      label: props.translations.hide,
      title: props.translations.hide,
      on_click: () => setIsClosed(true)
    })
  }

  return (
    <StatusBar
      placement="top"
      theme={props.is_connected ? 'success' : 'default'}
      icon={
        props.is_connected
          ? 'codicon-debug-connected'
          : 'codicon-debug-disconnect'
      }
      label={
        props.is_connected
          ? props.translations.connected
          : props.translations.not_connected
      }
      actions={actions}
    />
  )
}
