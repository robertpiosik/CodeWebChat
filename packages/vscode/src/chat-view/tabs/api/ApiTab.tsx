import { ApiSettingsForm } from '@ui/components/editor/ApiSettingsForm'
import { BUILT_IN_PROVIDERS } from '@/constants/built-in-providers'
import styles from './ApiTab.module.scss'

type Props = {
  is_visible: boolean
}

export const ApiTab: React.FC<Props> = (props) => {
  const model_options = BUILT_IN_PROVIDERS.map((provider) => ({
    name: provider.name,
    value: provider.name
  }))

  const handle_api_key_change = (api_key: string) => {
    console.log('API key changed:', api_key)
    // TODO: Implement API key change handler
  }

  const handle_fim_model_change = (model: string) => {
    console.log('FIM model changed:', model)
    // TODO: Implement model change handler
  }

  const handle_refactoring_model_change = (model: string) => {
    console.log('Refactoring model changed:', model)
    // TODO: Implement model change handler
  }

  const handle_apply_changes_model_change = (model: string) => {
    console.log('Apply changes model changed:', model)
    // TODO: Implement model change handler
  }

  const handle_commit_message_model_change = (model: string) => {
    console.log('Commit message model changed:', model)
    // TODO: Implement model change handler
  }

  return (
    <div
      className={styles.container}
      style={{ display: !props.is_visible ? 'none' : undefined }}
    >
      <ApiSettingsForm
        api_key=""
        default_fim_model={model_options[0]?.value || ''}
        default_refactoring_model={model_options[0]?.value || ''}
        default_apply_changes_model={model_options[0]?.value || ''}
        default_commit_message_model={model_options[0]?.value || ''}
        model_options={model_options}
        on_api_key_change={handle_api_key_change}
        on_fim_model_change={handle_fim_model_change}
        on_refactoring_model_change={handle_refactoring_model_change}
        on_apply_changes_model_change={handle_apply_changes_model_change}
        on_commit_message_model_change={handle_commit_message_model_change}
      />
    </div>
  )
}
