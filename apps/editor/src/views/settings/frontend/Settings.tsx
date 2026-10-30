import { useState, useEffect, useMemo } from 'react'
import { use_settings } from './hooks/use-settings'
import { post_message } from './utils/post-message'
import { BackendMessage } from '../types/messages'
import { Home, NavItem } from './Home/Home'
import { use_web_configuration_editing } from './hooks/use-web-configuration-editing'
import { use_cli_configuration_editing } from './hooks/use-cli-configuration-editing'
import { EditCliConfigurationForm } from '@/views/shared/forms/EditCliConfigurationForm/EditCliConfigurationForm'
import { use_api_configuration_editing } from './hooks/use-api-configuration-editing'
import { use_provider_editing } from './hooks/use-provider-editing'
import { Modal as UiModal } from '@ui/components/editor/settings-view/Modal'
import { EditWebConfigurationForm } from '@/views/shared/forms/EditWebConfigurationForm'
import { EditApiConfigurationForm } from '@/views/shared/forms/EditApiConfigurationForm'
import { EditProviderForm } from './forms/EditProviderForm'
import { EditPromptInstructionForm } from './forms/EditPromptInstructionForm'
import { use_prompt_instruction_editing } from './hooks/use-prompt-instruction-editing'
import { TextButton as UiTextButton } from '@ui/components/editor/common/TextButton'
import { use_translation } from './i18n/use-translation'

const vscode = acquireVsCodeApi()

export const Settings = () => {
  const { t } = use_translation()
  const settings_hook = use_settings(vscode)
  const {
    updating_web_configuration,
    set_updating_web_configuration,
    set_updated_web_configuration,
    edit_web_configuration_cancel_handler,
    edit_web_configuration_save_handler,
    set_is_new_web_configuration,
    set_web_configuration_insertion_index
  } = use_web_configuration_editing(vscode)

  const {
    updating_cli_configuration,
    set_updating_cli_configuration,
    set_updated_cli_configuration,
    edit_cli_configuration_cancel_handler,
    edit_cli_configuration_save_handler,
    set_is_new_cli_configuration,
    set_cli_configuration_insertion_index
  } = use_cli_configuration_editing(vscode)

  const {
    updating_api_configuration,
    set_updating_api_configuration,
    set_updated_api_configuration,
    edit_api_configuration_cancel_handler,
    edit_api_configuration_save_handler
  } = use_api_configuration_editing(vscode)

  const {
    updating_provider,
    updated_provider,
    set_updating_provider,
    set_updated_provider,
    edit_provider_cancel_handler,
    edit_provider_save_handler,
    set_is_new_provider
  } = use_provider_editing(vscode)

  const [scroll_to_section_on_load, set_scroll_to_section_on_load] =
    useState<NavItem>()

  const {
    updating_instruction,
    set_updated_instruction,
    edit_instruction_cancel_handler,
    edit_instruction_save_handler,
    start_editing_instruction
  } = use_prompt_instruction_editing(
    vscode,
    settings_hook.prompt_instructions,
    settings_hook.handle_update_prompt_instructions
  )

  const [default_option_for_voice_input, set_default_option_for_voice_input] =
    useState<'ask' | 'send-request' | 'invoke-agent' | undefined>(undefined)

  const all_data_loaded = useMemo(() => {
    return (
      settings_hook.providers !== undefined &&
      settings_hook.api_configurations !== undefined &&
      settings_hook.forwarded_ports !== undefined &&
      settings_hook.web_configurations !== undefined &&
      settings_hook.cli_configurations !== undefined &&
      settings_hook.agent_defaults !== undefined &&
      settings_hook.web_defaults !== undefined &&
      settings_hook.defaults !== undefined &&
      settings_hook.edit_files_system_instructions !== undefined &&
      settings_hook.default_edit_files_system_instructions !== undefined &&
      settings_hook.voice_input_instructions !== undefined &&
      settings_hook.default_voice_input_instructions !== undefined &&
      settings_hook.agentic_search_instructions !== undefined &&
      settings_hook.default_agentic_search_instructions !== undefined &&
      settings_hook.agentic_search_invocation_count !== undefined &&
      settings_hook.commit_message_instructions !== undefined &&
      settings_hook.default_commit_message_instructions !== undefined &&
      settings_hook.attach_ascii_tree_of_context !== undefined &&
      settings_hook.use_context_files_in_commit_message_prompt !== undefined &&
      settings_hook.select_all_prompts_in_commit_messages_by_default !==
        undefined &&
      default_option_for_voice_input !== undefined &&
      settings_hook.gemini_user_id !== undefined &&
      settings_hook.ai_studio_user_id !== undefined &&
      settings_hook.send_with_shift_enter !== undefined &&
      settings_hook.is_modern_ui !== undefined &&
      settings_hook.prompt_instructions !== undefined
    )
  }, [settings_hook, default_option_for_voice_input])

  useEffect(() => {
    post_message(vscode, { command: 'GET_DEFAULT_OPTION_FOR_VOICE_INPUT' })
  }, [])

  useEffect(() => {
    if (!all_data_loaded) return
    post_message(vscode, { command: 'SETTINGS_UI_READY' })
  }, [all_data_loaded])

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      if (event.data.command === 'SHOW_SECTION') {
        set_scroll_to_section_on_load(event.data.section as NavItem)
      } else if (event.data.command === 'DEFAULT_OPTION_FOR_VOICE_INPUT') {
        set_default_option_for_voice_input(event.data.value)
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  if (!all_data_loaded) return null

  return (
    <div data-modern-ui={settings_hook.is_modern_ui}>
      <Home
        providers={settings_hook.providers!}
        api_configurations={settings_hook.api_configurations!}
        defaults={settings_hook.defaults!}
        edit_files_system_instructions={
          settings_hook.edit_files_system_instructions!
        }
        default_edit_files_system_instructions={
          settings_hook.default_edit_files_system_instructions!
        }
        attach_ascii_tree_of_context={
          settings_hook.attach_ascii_tree_of_context!
        }
        use_context_files_in_commit_message_prompt={
          settings_hook.use_context_files_in_commit_message_prompt!
        }
        select_all_prompts_in_commit_messages_by_default={
          settings_hook.select_all_prompts_in_commit_messages_by_default!
        }
        default_option_for_voice_input={default_option_for_voice_input!}
        on_default_option_for_voice_input_change={(value) => {
          set_default_option_for_voice_input(value)
          post_message(vscode, {
            command: 'UPDATE_DEFAULT_OPTION_FOR_VOICE_INPUT',
            value
          })
        }}
        voice_input_instructions={settings_hook.voice_input_instructions!}
        default_voice_input_instructions={
          settings_hook.default_voice_input_instructions!
        }
        on_voice_input_instructions_change={
          settings_hook.handle_voice_input_instructions_change
        }
        agentic_search_instructions={settings_hook.agentic_search_instructions!}
        default_agentic_search_instructions={
          settings_hook.default_agentic_search_instructions!
        }
        on_agentic_search_instructions_change={
          settings_hook.handle_agentic_search_instructions_change
        }
        agentic_search_invocation_count={
          settings_hook.agentic_search_invocation_count!
        }
        on_agentic_search_invocation_count_change={
          settings_hook.handle_agentic_search_invocation_count_change
        }
        commit_message_instructions={settings_hook.commit_message_instructions!}
        default_commit_message_instructions={
          settings_hook.default_commit_message_instructions!
        }
        gemini_user_id={settings_hook.gemini_user_id!}
        ai_studio_user_id={settings_hook.ai_studio_user_id!}
        send_with_shift_enter={settings_hook.send_with_shift_enter!}
        prompt_instructions={settings_hook.prompt_instructions!}
        on_update_prompt_instructions={
          settings_hook.handle_update_prompt_instructions
        }
        on_edit_prompt_instruction={start_editing_instruction}
        on_add_prompt_instruction={settings_hook.handle_add_prompt_instruction}
        on_delete_prompt_instruction={
          settings_hook.handle_delete_prompt_instruction
        }
        set_providers={settings_hook.set_providers}
        set_api_configurations={settings_hook.set_api_configurations}
        on_commit_instructions_change={
          settings_hook.handle_commit_instructions_change
        }
        on_attach_ascii_tree_of_context_change={
          settings_hook.handle_attach_ascii_tree_of_context_change
        }
        on_use_context_files_in_commit_message_prompt_change={
          settings_hook.handle_use_context_files_in_commit_message_prompt_change
        }
        on_select_all_prompts_in_commit_messages_by_default_change={
          settings_hook.handle_select_all_prompts_in_commit_messages_by_default_change
        }
        on_edit_files_system_instructions_change={
          settings_hook.handle_edit_files_system_instructions_change
        }
        on_gemini_user_id_change={settings_hook.handle_gemini_user_id_change}
        on_ai_studio_user_id_change={
          settings_hook.handle_ai_studio_user_id_change
        }
        on_send_with_shift_enter_change={
          settings_hook.handle_send_with_shift_enter_change
        }
        on_open_keybindings={settings_hook.handle_open_keybindings}
        on_open_editor_settings={settings_hook.handle_open_editor_settings}
        on_open_ignore_patterns_settings={
          settings_hook.handle_open_ignore_patterns_settings
        }
        on_open_allow_patterns_settings={
          settings_hook.handle_open_allow_patterns_settings
        }
        on_reorder_providers={settings_hook.handle_reorder_providers}
        on_add_provider={settings_hook.handle_add_provider}
        on_delete_provider={settings_hook.handle_delete_provider}
        on_edit_provider={(provider_name) => {
          const provider = settings_hook.providers?.find(
            (p) => p.name === provider_name
          )
          if (provider) {
            set_updating_provider({
              original_name: provider.name,
              provider
            })
            set_is_new_provider(false)
          }
        }}
        on_set_default_api_configuration={
          settings_hook.handle_set_default_api_configuration
        }
        on_select_default_api_configuration={
          settings_hook.handle_select_default_api_configuration
        }
        on_reorder_api_configurations={
          settings_hook.handle_reorder_api_configurations
        }
        on_add_api_configuration={settings_hook.handle_add_api_configuration}
        on_edit_api_configuration={(id) => {
          const config = settings_hook.api_configurations?.find(
            (c) => c.id === id
          )
          if (config) set_updating_api_configuration(config)
        }}
        on_delete_api_configuration={
          settings_hook.handle_delete_api_configuration
        }
        on_toggle_pinned_api_configuration={
          settings_hook.handle_toggle_pinned_api_configuration
        }
        forwarded_ports={settings_hook.forwarded_ports!}
        on_update_forwarded_ports={settings_hook.handle_update_forwarded_ports}
        web_configurations={settings_hook.web_configurations!}
        set_web_configurations={settings_hook.set_web_configurations}
        on_reorder_web_configurations={
          settings_hook.handle_reorder_web_configurations
        }
        on_add_web_configuration={settings_hook.handle_add_web_configuration}
        on_edit_web_configuration={(id) => {
          const config = settings_hook.web_configurations?.find(
            (c) => c.name === id
          )
          if (config) {
            set_updating_web_configuration(config)
            set_is_new_web_configuration(false)
            set_web_configuration_insertion_index(undefined)
          }
        }}
        on_delete_web_configuration={
          settings_hook.handle_delete_web_configuration
        }
        on_toggle_pinned_web_configuration={
          settings_hook.handle_toggle_pinned_web_configuration
        }
        web_defaults={settings_hook.web_defaults!}
        on_set_default_web_configuration={(web_feature, name) => {
          post_message(vscode, {
            command: 'SET_DEFAULT_WEB_CONFIGURATION',
            web_feature,
            web_configuration_name: name
          })
        }}
        on_select_default_web_configuration={(web_feature) => {
          post_message(vscode, {
            command: 'SELECT_DEFAULT_WEB_CONFIGURATION',
            web_feature
          })
        }}
        cli_configurations={settings_hook.cli_configurations!}
        set_cli_configurations={settings_hook.set_cli_configurations}
        on_reorder_cli_configurations={
          settings_hook.handle_reorder_cli_configurations
        }
        on_add_cli_configuration={settings_hook.handle_add_cli_configuration}
        on_edit_cli_configuration={(id) => {
          const config = settings_hook.cli_configurations?.find(
            (c) => c.name === id
          )
          if (config) {
            set_updating_cli_configuration(config)
            set_is_new_cli_configuration(false)
            set_cli_configuration_insertion_index(undefined)
          }
        }}
        on_delete_cli_configuration={
          settings_hook.handle_delete_cli_configuration
        }
        on_toggle_pinned_cli_configuration={
          settings_hook.handle_toggle_pinned_cli_configuration
        }
        agent_defaults={settings_hook.agent_defaults!}
        on_set_default_cli_configuration={(cli_feature, name) => {
          post_message(vscode, {
            command: 'SET_DEFAULT_CLI_CONFIGURATION',
            cli_feature,
            cli_configuration_name: name
          })
        }}
        on_select_default_cli_configuration={(cli_feature) => {
          post_message(vscode, {
            command: 'SELECT_DEFAULT_CLI_CONFIGURATION',
            cli_feature
          })
        }}
        scroll_to_section_on_load={scroll_to_section_on_load}
      />
      {updating_web_configuration && (
        <UiModal on_close={edit_web_configuration_cancel_handler}>
          <UiModal.Form
            title="Edit Chatbot"
            on_save={edit_web_configuration_save_handler}
            on_cancel={edit_web_configuration_cancel_handler}
          >
            <EditWebConfigurationForm
              web_configuration={updating_web_configuration}
              on_update={set_updated_web_configuration}
              pick_model={(chatbot_name, current_model_id) => {
                post_message(vscode, {
                  command: 'PICK_MODEL',
                  chatbot_name,
                  current_model_id
                })
              }}
              pick_chatbot={(chatbot_id) => {
                post_message(vscode, { command: 'PICK_CHATBOT', chatbot_id })
              }}
              pick_reasoning_effort={(supported_efforts, current_effort) => {
                post_message(vscode, {
                  command: 'PICK_REASONING_EFFORT',
                  supported_efforts,
                  current_effort
                })
              }}
            />
          </UiModal.Form>
        </UiModal>
      )}
      {updating_cli_configuration && (
        <UiModal on_close={edit_cli_configuration_cancel_handler}>
          <UiModal.Form
            title="Edit Agent"
            on_save={edit_cli_configuration_save_handler}
            on_cancel={edit_cli_configuration_cancel_handler}
          >
            <EditCliConfigurationForm
              cli_configuration={updating_cli_configuration}
              on_update={set_updated_cli_configuration}
              pick_agent={(agent_id) => {
                post_message(vscode, { command: 'PICK_AGENT', agent_id })
              }}
              pick_example_flags={(agent) => {
                post_message(vscode, { command: 'PICK_EXAMPLE_FLAGS', agent })
              }}
            />
          </UiModal.Form>
        </UiModal>
      )}
      {updating_api_configuration && (
        <UiModal on_close={edit_api_configuration_cancel_handler}>
          <UiModal.Form
            title="Edit Model"
            on_save={edit_api_configuration_save_handler}
            on_cancel={edit_api_configuration_cancel_handler}
          >
            <EditApiConfigurationForm
              api_configuration={updating_api_configuration}
              on_update={set_updated_api_configuration}
              pick_provider={(current) => {
                post_message(vscode, {
                  command: 'PICK_PROVIDER',
                  current_provider_name: current
                })
              }}
              pick_model={(provider, current) => {
                post_message(vscode, {
                  command: 'PICK_API_MODEL',
                  provider_name: provider,
                  current_model: current
                })
              }}
              pick_reasoning_effort={(provider, model, current) => {
                post_message(vscode, {
                  command: 'PICK_API_REASONING_EFFORT',
                  provider_name: provider,
                  model,
                  current_effort: current
                })
              }}
            />
          </UiModal.Form>
        </UiModal>
      )}
      {updating_provider && (
        <UiModal on_close={edit_provider_cancel_handler}>
          <UiModal.Form
            title="Edit Provider"
            on_save={edit_provider_save_handler}
            on_cancel={edit_provider_cancel_handler}
            custom_footer_left={
              <UiTextButton
                on_click={() => {
                  post_message(vscode, {
                    command: 'TEST_PROVIDER_CONNECTION',
                    original_name: updating_provider.original_name,
                    base_url:
                      updated_provider?.base_url ??
                      updating_provider.provider.base_url,
                    api_key: updated_provider?.api_key ?? '',
                    is_api_key_cleared:
                      updated_provider?.is_api_key_cleared ?? false
                  })
                }}
              >
                {t('edit-provider-form.action.test-connection')}
              </UiTextButton>
            }
          >
            <EditProviderForm
              provider={updating_provider.provider}
              on_update={set_updated_provider}
            />
          </UiModal.Form>
        </UiModal>
      )}
      {updating_instruction && (
        <UiModal on_close={edit_instruction_cancel_handler}>
          <UiModal.Form
            title={
              updating_instruction.index !== undefined
                ? updating_instruction.key.startsWith('templates')
                  ? 'Edit Template'
                  : 'Edit Snippet'
                : updating_instruction.key.startsWith('templates')
                  ? 'Add Template'
                  : 'Add Snippet'
            }
            on_save={edit_instruction_save_handler}
            on_cancel={edit_instruction_cancel_handler}
          >
            <EditPromptInstructionForm
              instruction={updating_instruction.instruction}
              on_update={set_updated_instruction}
              vscode={vscode}
              type={
                updating_instruction.key.startsWith('templates')
                  ? 'template'
                  : 'snippet'
              }
            />
          </UiModal.Form>
        </UiModal>
      )}
    </div>
  )
}
