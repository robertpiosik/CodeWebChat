import { TextButton } from './TextButton'
import { useState } from 'react'

export default {
  component: TextButton
}

export const Primary = () => (
  <TextButton
    on_click={() => console.log('TextButton clicked')}
    title="This is a tooltip"
  >
    Click me
  </TextButton>
)

export const Disabled = () => (
  <TextButton on_click={() => console.log('This will not be called')} disabled>
    Disabled button
  </TextButton>
)
