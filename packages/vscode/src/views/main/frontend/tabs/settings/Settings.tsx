import styles from './Settings.module.scss'
import { Button as UiButton } from '@ui/components/editor/Button'
import { WebviewMessage } from '@/views/main/types/messages'
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

  const handle_setup_edit_context_click = () => {
    props.vscode.postMessage({
      command: 'SETUP_API_TOOL_EDIT_CONTEXT'
    } as WebviewMessage)
  }

  const handle_setup_commit_messages_click = () => {
    props.vscode.postMessage({
      command: 'SETUP_API_TOOL_COMMIT_MESSAGES'
    } as WebviewMessage)
  }

  const handle_setup_intelligent_update_click = () => {
    props.vscode.postMessage({
      command: 'SETUP_API_TOOL_INTELLIGENT_UPDATE'
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
      <UiButton on_click={params.on_setup_click}>
        {params.button_label}
      </UiButton>
    </div>
  )

  return (
    <div
      className={styles.container}
      style={{ display: !props.is_visible ? 'none' : undefined }}
    >
      <div className={styles.configure}>
        <span>
          CWC includes battle-tested must-have API tools. API keys are&nbsp;
          <a href="https://code.visualstudio.com/api/references/vscode-api#SecretStorage">
            stored encrypted
          </a>
          .
        </span>
        <UiButton on_click={handle_configure_api_providers_click}>
          Configure API Providers
        </UiButton>
      </div>

      {render_api_tool_settings({
        title: 'Code Completions',
        description:
          'The best quality inline suggestions at the cost of latency. Designed to be used on demand.',
        on_setup_click: handle_setup_code_completions_click,
        button_label: 'Setup Code Completions API Tool',
        checkmarks: ['Includes selected context', 'Works with any model']
      })}

      {render_api_tool_settings({
        title: 'Edit Context',
        description:
          'Create and modify files in context based on natural language instructions.',
        checkmarks: [
          'Multi-file updates in a single API call',
          'Efficient in output tokens—requests diffs'
        ],
        on_setup_click: handle_setup_edit_context_click,
        button_label: 'Setup Edit Context API Tool'
      })}

      {render_api_tool_settings({
        title: 'Intelligent Update',
        description:
          'Update files based on code blocks in truncated edit format and fix malformed diffs.',
        checkmarks: [
          'Regnerates whole files in concurrent API calls',
          'Smaller models like Gemini Flash are sufficient',
          'Can fix malformed diff patches'
        ],
        on_setup_click: handle_setup_intelligent_update_click,
        button_label: 'Setup Intelligent Update API Tool'
      })}

      {render_api_tool_settings({
        title: 'Commit Messages',
        description:
          'Generate meaningful commit messages precisely adhering to your preffered style.',
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
