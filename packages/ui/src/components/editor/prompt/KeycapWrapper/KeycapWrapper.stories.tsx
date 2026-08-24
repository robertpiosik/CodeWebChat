import { KeycapWrapper } from './KeycapWrapper'

export default {
  component: KeycapWrapper
}

export const Default = () => (
  <KeycapWrapper char="A">
    <button style={{ padding: '10px 20px' }}>Button with Keycap</button>
  </KeycapWrapper>
)

export const WithoutChar = () => (
  <KeycapWrapper>
    <button style={{ padding: '10px 20px' }}>Normal Button</button>
  </KeycapWrapper>
)

export const FullWidth = () => (
  <div style={{ display: 'flex', width: '300px', gap: '10px' }}>
    <KeycapWrapper char="1" full_width>
      <button style={{ width: '100%', padding: '10px' }}>Stretch</button>
    </KeycapWrapper>
    <KeycapWrapper char="2" full_width>
      <button style={{ width: '100%', padding: '10px' }}>Stretch</button>
    </KeycapWrapper>
  </div>
)
