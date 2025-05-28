import styles from './Settings.module.scss'
import { Button } from '@ui/components/editor/Button'
import { WebviewMessage } from '@/view/types/messages'
import { ApiTool as UiApiTool } from '@ui/components/editor/ApiTool'

type Props = {
  vscode: any
  is_visible: boolean
}

export const Settings: React.FC<Props> = (props) => {
  const handle_configure_api_providers_click = () => {
    props.vscode.postMessage({
      command: 'CONFIGURE_API_PROVIDERS'
    } as WebviewMessage)
  }

  const handle_setup_code_completions_click = () => {
    props.vscode.postMessage({
      command: 'SETUP_API_TOOL_CODE_COMPLETIONS'
    } as WebviewMessage)
  }

  const handle_setup_file_refactoring_click = () => {
    props.vscode.postMessage({
      command: 'SETUP_API_TOOL_FILE_REFACTORING'
    } as WebviewMessage)
  }

  const handle_setup_commit_messages_click = () => {
    props.vscode.postMessage({
      command: 'SETUP_API_TOOL_COMMIT_MESSAGES'
    } as WebviewMessage)
  }

  const render_api_tool_settings = (params: {
    title: string
    description: string
    checkmarks?: string[]
    on_setup_click: () => void
    button_label: string
  }) => (
    <div className={styles['api-tool']}>
      <UiApiTool
        top_line="API TOOL"
        bottom_line={params.title}
        description={params.description}
        checkmarks={params.checkmarks}
      />
      <Button on_click={params.on_setup_click}>{params.button_label}</Button>
    </div>
  )

  return (
    <div
      className={styles.container}
      style={{ display: !props.is_visible ? 'none' : undefined }}
    >
      <Button on_click={handle_configure_api_providers_click}>
        Configure API Providers
      </Button>

      {render_api_tool_settings({
        title: 'Code Completions',
        description:
          'The tool is designed to provide you with the highest quality autocomplete suggestions at the cost of latency. Intented to be used on-demand through the Tools tab, via the command palette or a keybinding. Setup multiple configurations and choose between them based on difficulty of the completion.',
        on_setup_click: handle_setup_code_completions_click,
        button_label: 'Setup Code Completions API Tool',
        checkmarks: ['Includes selected context', 'Works great with any model']
      })}

      {render_api_tool_settings({
        title: 'Refactoring',
        description: 'Modify files based on natural language instructions.',
        checkmarks: [
          'Includes selected context',
          'Like chat in diff edit format'
        ],
        on_setup_click: handle_setup_file_refactoring_click,
        button_label: 'Setup Refactoring API Tool'
      })}

      {render_api_tool_settings({
        title: 'Commit Messages',
        description:
          'Generate meaningful commit messages. The tool first attaches affected files, then the customizable instructions, then diff of changes. Not lobotomized context ensures unmatched accuracy.',
        checkmarks: [
          'Includes affected files in full',
          'Customizable instructions'
        ],
        on_setup_click: handle_setup_commit_messages_click,
        button_label: 'Setup Commit Messages API Tool'
      })}
    </div>
  )
}
