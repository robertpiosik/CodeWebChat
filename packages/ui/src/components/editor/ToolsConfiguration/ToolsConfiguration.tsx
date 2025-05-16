import styles from './ToolsConfiguration.module.scss'
import { ConfigurationHeader } from '../ConfigurationHeader'

type Props = {
  on_setup_code_completions_click: () => void
  on_setup_file_refactoring_click: () => void
  on_setup_commit_messages_click: () => void
}

export const ToolsConfiguration: React.FC<Props> = (props) => {
  const render_api_tool_settings = (params: {
    title: string
    description: string
    on_setup_click: () => void
  }) => (
    <>
      <ConfigurationHeader
        top_line="TOOL"
        bottom_line={params.title}
        description={params.description}
      />
      <button onClick={params.on_setup_click}>Setup</button>
    </>
  )

  return (
    <div className={styles.form}>
      {render_api_tool_settings({
        title: 'Code Completions',
        description:
          'Use any model for accurate code completions. The tool attaches selected context in each request.',
        on_setup_click: props.on_setup_code_completions_click
      })}
      {render_api_tool_settings({
        title: 'File Refactoring',
        description:
          'Modify the active file based on natural language instructions or integrate truncated code of chat responses.',
        on_setup_click: props.on_setup_file_refactoring_click
      })}
      {render_api_tool_settings({
        title: 'Commit Messages',
        description:
          'Generate meaningful commit messages based on contents of affected files and diffs of changes.',
        on_setup_click: props.on_setup_commit_messages_click
      })}
    </div>
  )
}
