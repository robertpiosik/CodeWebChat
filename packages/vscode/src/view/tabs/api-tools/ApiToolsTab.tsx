import { Button } from '@ui/components/editor/Button'
import styles from './ApiToolsTab.module.scss'

type Props = {
  vscode: any
  is_visible: boolean
  on_configure_api_tools_click: () => void
}

export const ApiToolsTab: React.FC<Props> = (props) => {
  return (
    <div
      className={styles.container}
      style={{ display: !props.is_visible ? 'none' : undefined }}
    >
      <Button on_click={props.on_configure_api_tools_click}>
        Configure API Tools
      </Button>
    </div>
  )
}
