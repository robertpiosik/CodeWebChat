import { SmallButton } from './SmallButton'

export default {
  component: SmallButton
}

export const Primary = () => (
  <div style={{ display: 'flex' }}>
    <SmallButton on_click={() => console.log('Primary clicked')}>
      Primary
    </SmallButton>
  </div>
)

export const Secondary = () => (
  <div style={{ display: 'flex' }}>
    <SmallButton
      variant="secondary"
      on_click={() => console.log('Secondary clicked')}
    >
      Secondary
    </SmallButton>
  </div>
)

export const Disabled = () => (
  <div style={{ display: 'flex' }}>
    <SmallButton on_click={() => console.log('Disabled clicked')} disabled>
      Disabled
    </SmallButton>
  </div>
)

export const DisabledSecondary = () => (
  <div style={{ display: 'flex' }}>
    <SmallButton
      variant="secondary"
      on_click={() => console.log('Disabled clicked')}
      disabled
    >
      Disabled Secondary
    </SmallButton>
  </div>
)

