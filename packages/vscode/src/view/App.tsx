import ReactDOM from 'react-dom/client'
import { WebChatsTab } from './tabs/web-chats/WebChatsTab'
import { ApiToolsTab } from './tabs/api-tools/ApiToolsTab'
import { Header } from '@ui/components/editor/Header'
import { useEffect, useState } from 'react'
import { Template } from '@ui/components/editor/Template'
import { EditView } from '@ui/components/editor/EditView'
import { EditPresetForm } from '@ui/components/editor/EditPresetForm'
import { Preset } from '@shared/types/preset'
import { ExtensionMessage } from './types/messages'
import { use_open_router_models } from './hooks/use-open-router-models'

import '@vscode/codicons/dist/codicon.css'
import '@ui/styles/global.scss'
import { ApiSettingsForm } from '@ui/components/editor/ApiSettingsForm'
import { BUILT_IN_PROVIDERS } from '@/constants/built-in-providers'
import { use_api_tools_configuration } from './hooks/use-api-tools-configuration'

const vscode = acquireVsCodeApi()

const App = () => {
  const [active_tab, set_active_tab] = useState<'chat' | 'api'>('chat')
  const [updating_preset, set_updating_preset] = useState<Preset>()
  const [updated_preset, set_updated_preset] = useState<Preset>()
  const [is_configuring_api_tools, set_is_configuring_api_tools] =
    useState(false)
  const {
    open_router_models,
    request_open_router_models,
    get_newly_picked_open_router_model
  } = use_open_router_models(vscode)
  const {
    gemini_api_key,
    open_router_api_key,
    handle_gemini_api_key_change,
    handle_open_router_api_key_change
  } = use_api_tools_configuration(vscode)

  const handle_preset_update = (updated_preset: Preset) => {
    set_updated_preset(updated_preset)
  }

  const handle_edit_preset_back_click = () => {
    vscode.postMessage({
      command: 'UPDATE_PRESET',
      original_name: updating_preset!.name,
      updated_preset: updated_preset
    })
  }

  // Finalize back click when presets gets updated
  useEffect(() => {
    const handle_message = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data
      if (message.command == 'PRESET_UPDATED') {
        set_updated_preset(undefined)
        set_updating_preset(undefined)
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  const tabs = (
    <>
      <Header
        active_tab={active_tab}
        on_chat_tab_click={() => {
          set_active_tab('chat')
        }}
        on_api_tab_click={() => {
          set_active_tab('api')
        }}
      />
      <WebChatsTab
        vscode={vscode}
        is_visible={active_tab == 'chat'}
        on_preset_edit={(preset) => {
          set_updating_preset(preset)
        }}
      />
      <ApiToolsTab vscode={vscode} is_visible={active_tab == 'api'} />
    </>
  )

  const edit_preset_view = updating_preset && (
    <EditView
      back_label="EDIT PRESET"
      on_back_click={handle_edit_preset_back_click}
    >
      <EditPresetForm
        preset={updating_preset}
        on_update={handle_preset_update}
        request_open_router_models={request_open_router_models}
        open_router_models={open_router_models}
        get_newly_picked_open_router_model={get_newly_picked_open_router_model}
      />
    </EditView>
  )

  const configure_api_tools_view = is_configuring_api_tools && (
    <EditView back_label="CONFIGURE API TOOLS" on_back_click={() => {}}>
      <ApiSettingsForm
        // gemini_api_models={Object.fromEntries(BUILT_IN_PROVIDERS.map(provider => [provider.model, provider.name]))}
        gemini_api_models={Object.fromEntries(
          BUILT_IN_PROVIDERS.map((provider) => [provider.model, provider.name])
        )}
        open_router_models={open_router_models}
        gemini_api_key={gemini_api_key}
        open_router_api_key={open_router_api_key}
        //
        code_completions_settings={code_completions_settings}
        file_refactoring_settings={file_refactoring_settings}
        apply_chat_response_settings={apply_chat_response_settings}
        on_code_completions_settings_update={
          handle_code_completions_settings_update
        }
        on_file_refactoring_settings_update={
          handle_file_refactoring_settings_update
        }
        on_apply_chat_response_settings_update={
          handle_apply_chat_response_settings_update
        }
        get_newly_picked_open_router_model={get_newly_picked_open_router_model}
        //
        // default_code_completion_model={default_code_completion_model}
        // default_refactoring_model={default_refactoring_model}
        // default_apply_changes_model={default_apply_changes_model}
        // default_commit_message_model={default_commit_message_model}
        // model_options={model_options}
        on_gemini_api_key_change={handle_gemini_api_key_change}
        on_open_router_api_key_change={handle_open_router_api_key_change}
        // on_fim_model_change={handle_code_completion_model_change}
        // on_refactoring_model_change={handle_refactoring_model_change}
        // on_apply_changes_model_change={handle_apply_changes_model_change}
        // on_commit_message_model_change={handle_commit_message_model_change}
      />
    </EditView>
  )

  return (
    <>
      <Template edit_preset_slot={edit_preset_view} tabs_slot={tabs} />
    </>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
