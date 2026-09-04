import React, { useEffect, useState } from 'react'
import { StatusBar } from '@ui/components/editor/prompt/StatusBar'
import { Separator } from '@ui/components/editor/prompt/Separator'

type Props = {
  is_connected: boolean
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
  const [has_been_closed, setHasBeenClosed] = useState(false)

  useEffect(() => {
    if (!props.is_connected) {
      setIsClosed(false)
    }
  }, [props.is_connected])

  useEffect(() => {
    if (props.is_connected && !is_closed && has_been_closed) {
      const timer = setTimeout(() => {
        setIsClosed(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [props.is_connected, is_closed, has_been_closed])

  if (is_closed) {
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
      on_click: () => {
        setIsClosed(true)
        setHasBeenClosed(true)
      }
    })
  }

  return (
    <>
      <StatusBar
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
      <Separator height={6} />
    </>
  )
}

