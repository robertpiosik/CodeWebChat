import { BrowserConnectionStatus } from './BrowserConnectionStatus'

export default {
  component: BrowserConnectionStatus
}

export const Connected = () => {
  return (
    <BrowserConnectionStatus
      is_connected={true}
      translations={{
        connected: 'Connected!',
        not_connected: 'Not connected',
        install: 'Install',
        hide: 'Hide'
      }}
      on_install={() => {}}
    />
  )
}

export const Disconnected = () => {
  return (
    <BrowserConnectionStatus
      is_connected={false}
      translations={{
        connected: 'Connected!',
        not_connected: 'Not connected',
        install: 'Install',
        hide: 'Hide'
      }}
      on_install={() => {}}
    />
  )
}
