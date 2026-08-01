import { Page } from './Page'

export default {
  component: Page
}

export const Primary = () => (
  <Page
    title="Lorem ipsum"
    on_back_click={() => {}}
    header_slot={'header slot'}
    footer_slot={'footer slot'}
  >
    <div style={{ padding: '12px' }}>
      <p>
        This is a sample page content. Use the <strong>header_slot</strong> prop
        to inject custom elements (e.g., navigation, actions) into the header.
      </p>
      <p>
        The <code>on_back_click</code> prop can be used to render a back button
        on the left side of the header:
      </p>
    </div>
  </Page>
)
