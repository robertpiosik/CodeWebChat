import React from 'react'
import { StatusBar } from '@ui/components/editor/prompt/StatusBar'
import { Separator as UiSeparator } from '@ui/components/editor/prompt/Separator'

type Props = {
  is_connected: boolean
  is_visible: boolean
  is_closed: boolean
  translations: {
    connected: string
    not_connected: string
    install: string
    hide: string
  }
  on_install: () => void
  on_close: () => void
}

export const BrowserConnectionStatus: React.FC<Props> = (props) => {
  if (props.is_closed || !props.is_visible) {
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
      on_click: props.on_close
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
      <UiSeparator height={6} />
    </>
  )
}
