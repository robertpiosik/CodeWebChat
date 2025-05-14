import styles from './SettingsTab.module.scss'
import { ToolsConfiguration as UiToolsConfiguration } from '@ui/components/editor/ToolsConfiguration'
import { BUILT_IN_PROVIDERS } from '@/constants/built-in-providers'
import { use_api_tools_configuration } from '../../hooks/use-api-tools-configuration'
import { use_open_router_models } from '../../hooks/use-open-router-models'

type Props = {
  vscode: any
  is_visible: boolean
}

export const SettingsTab: React.FC<Props> = (props) => {
  const api_tools_configuration_hook = use_api_tools_configuration(props.vscode)
  const open_router_models_hook = use_open_router_models(props.vscode)

  if (
    !api_tools_configuration_hook.code_completions_settings ||
    !api_tools_configuration_hook.file_refactoring_settings ||
    !api_tools_configuration_hook.commit_message_settings
  ) {
    return null
  }

  return (
    <div
      className={styles.container}
      style={{ display: !props.is_visible ? 'none' : undefined }}
    >
      <UiToolsConfiguration
        gemini_api_key={api_tools_configuration_hook.gemini_api_key}
        open_router_models={open_router_models_hook.open_router_models}
        gemini_api_models={Object.fromEntries(
          BUILT_IN_PROVIDERS.map((provider) => [provider.model, provider.name])
        )}
        open_router_api_key={api_tools_configuration_hook.open_router_api_key}
        code_completions_settings={
          api_tools_configuration_hook.code_completions_settings
        }
        file_refactoring_settings={
          api_tools_configuration_hook.file_refactoring_settings
        }
        commit_messages_settings={
          api_tools_configuration_hook.commit_message_settings
        }
        on_code_completions_settings_update={
          api_tools_configuration_hook.handle_code_completions_settings_change
        }
        on_file_refactoring_settings_update={
          api_tools_configuration_hook.handle_file_refactoring_settings_change
        }
        on_commit_messages_settings_update={
          api_tools_configuration_hook.handle_commit_message_settings_change
        }
        on_gemini_api_key_change={
          api_tools_configuration_hook.handle_gemini_api_key_change
        }
        on_open_router_api_key_change={
          api_tools_configuration_hook.handle_open_router_api_key_change
        }
        request_open_router_models={
          open_router_models_hook.request_open_router_models
        }
        get_newly_picked_open_router_model={
          open_router_models_hook.get_newly_picked_open_router_model
        }
      />
    </div>
  )
}
