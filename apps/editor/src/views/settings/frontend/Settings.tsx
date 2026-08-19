import { useState, useEffect, useMemo } from 'react'
import { use_settings } from './hooks/use-settings'
import { post_message } from './utils/post-message'
import { BackendMessage, Template } from '../types/messages'
import { Home, NavItem } from './Home/Home'
import { use_web_configuration_editing } from './hooks/use-web-configuration-editing'
import { use_api_configuration_editing } from './hooks/use-api-configuration-editing'
import { use_model_provider_editing } from './hooks/use-model-provider-editing'
import { Modal as UiModal } from '@ui/components/editor/settings/Modal'
import { EditWebConfigurationForm } from '@/views/shared/forms/EditWebConfigurationForm'
import { EditApiConfigurationForm } from '@/views/shared/forms/EditApiConfigurationForm'
import { EditModelProviderForm } from './forms/EditModelProviderForm'
import { EditTemplateForm } from './forms/EditTemplateForm'

const vscode = acquireVsCodeApi()

export const Settings = () => {
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
    updating_api_configuration,
    set_updating_api_configuration,
    set_updated_api_configuration,
    edit_api_configuration_cancel_handler,
    edit_api_configuration_save_handler
  } = use_api_configuration_editing(vscode)

  const {
    updating_model_provider,
    set_updating_model_provider,
    set_updated_model_provider,
    edit_model_provider_cancel_handler,
    edit_model_provider_save_handler,
    set_is_new_model_provider
  } = use_model_provider_editing(vscode)

  const [scroll_to_section_on_load, set_scroll_to_section_on_load] =
    useState<NavItem>()

  const [updating_template, set_updating_template] = useState<{
    key: string
    index?: number
    insertion_index?: number
    template: Template
  } | null>(null)
  const [updated_template, set_updated_template] = useState<Template | null>(
    null
  )

  const edit_template_cancel_handler = () => {
    set_updating_template(null)
    set_updated_template(null)
  }

  const edit_template_save_handler = () => {
    if (updating_template && updated_template) {
      const { key, index, insertion_index } = updating_template
      const templates = [...(settings_hook.templates?.[key] || [])]

      if (index !== undefined) {
        templates[index] = updated_template
      } else if (insertion_index !== undefined) {
        templates.splice(insertion_index, 0, updated_template)
      } else {
        templates.push(updated_template)
      }

      settings_hook.handle_update_templates(key, templates)
    }
    set_updating_template(null)
    set_updated_template(null)
  }

  const all_data_loaded = useMemo(() => {
    return (
      settings_hook.providers !== undefined &&
      settings_hook.api_configurations !== undefined &&
      settings_hook.web_configurations !== undefined &&
      settings_hook.defaults !== undefined &&
      settings_hook.edit_files_system_instructions !== undefined &&
      settings_hook.intelligent_file_search_instructions !== undefined &&
      settings_hook.commit_message_instructions !== undefined &&
      settings_hook.synchronize_edit_format_between_modes !== undefined &&
      settings_hook.attach_ascii_tree_of_context !== undefined &&
      settings_hook.select_all_prompts_in_commit_messages_by_default !==
        undefined &&
      settings_hook.context_size_warning_threshold !== undefined &&
      settings_hook.limit_semantic_search_results !== undefined &&
      settings_hook.are_automatic_checkpoints_disabled !== undefined &&
      settings_hook.checkpoint_lifespan !== undefined &&
      settings_hook.gemini_user_id !== undefined &&
      settings_hook.ai_studio_user_id !== undefined &&
      settings_hook.send_with_shift_enter !== undefined &&
      settings_hook.check_new_files !== undefined &&
      settings_hook.reuse_last_tab !== undefined &&
      settings_hook.clear_checks_in_workspace_behavior !== undefined &&
      settings_hook.auto_run_intelligent_update !== undefined &&
      settings_hook.is_modern_ui !== undefined &&
      settings_hook.templates !== undefined
    )
  }, [settings_hook])

  useEffect(() => {
    if (!all_data_loaded) return
    post_message(vscode, { command: 'SETTINGS_UI_READY' })
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      if (event.data.command == 'SHOW_SECTION') {
        set_scroll_to_section_on_load(event.data.section as NavItem)
      } else if (event.data.command == 'START_TEMPLATE_CREATION') {
        set_updating_template({
          key: event.data.templates_key,
          insertion_index: event.data.insertion_index,
          template: event.data.template
        })
        set_updated_template(event.data.template)
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [all_data_loaded])

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
        intelligent_file_search_instructions={
          settings_hook.intelligent_file_search_instructions!
        }
        context_size_warning_threshold={
          settings_hook.context_size_warning_threshold!
        }
        limit_semantic_search_results={
          settings_hook.limit_semantic_search_results!
        }
        synchronize_edit_format_between_modes={
          settings_hook.synchronize_edit_format_between_modes!
        }
        attach_ascii_tree_of_context={
          settings_hook.attach_ascii_tree_of_context!
        }
        select_all_prompts_in_commit_messages_by_default={
          settings_hook.select_all_prompts_in_commit_messages_by_default!
        }
        commit_message_instructions={settings_hook.commit_message_instructions!}
        are_automatic_checkpoints_disabled={
          settings_hook.are_automatic_checkpoints_disabled!
        }
        checkpoint_lifespan={settings_hook.checkpoint_lifespan!}
        gemini_user_id={settings_hook.gemini_user_id!}
        ai_studio_user_id={settings_hook.ai_studio_user_id!}
        send_with_shift_enter={settings_hook.send_with_shift_enter!}
        check_new_files={settings_hook.check_new_files!}
        reuse_last_tab={settings_hook.reuse_last_tab!}
        clear_checks_in_workspace_behavior={
          settings_hook.clear_checks_in_workspace_behavior!
        }
        auto_run_intelligent_update={settings_hook.auto_run_intelligent_update!}
        templates={settings_hook.templates!}
        on_update_templates={settings_hook.handle_update_templates}
        on_edit_template={(key, index) => {
          const template = settings_hook.templates?.[key]?.[index]
          if (template) {
            set_updating_template({ key, index, template })
            set_updated_template(template)
          }
        }}
        on_add_template={settings_hook.handle_add_template}
        on_delete_template={settings_hook.handle_delete_template}
        set_providers={settings_hook.set_providers}
        set_api_configurations={settings_hook.set_api_configurations}
        on_synchronize_edit_format_between_modes_change={
          settings_hook.handle_synchronize_edit_format_between_modes_change
        }
        on_context_size_warning_threshold_change={
          settings_hook.handle_context_size_warning_threshold_change
        }
        on_limit_semantic_search_results_change={
          settings_hook.handle_limit_semantic_search_results_change
        }
        on_commit_instructions_change={
          settings_hook.handle_commit_instructions_change
        }
        on_attach_ascii_tree_of_context_change={
          settings_hook.handle_attach_ascii_tree_of_context_change
        }
        on_select_all_prompts_in_commit_messages_by_default_change={
          settings_hook.handle_select_all_prompts_in_commit_messages_by_default_change
        }
        on_edit_files_system_instructions_change={
          settings_hook.handle_edit_files_system_instructions_change
        }
        on_intelligent_file_search_instructions_change={
          settings_hook.handle_intelligent_file_search_instructions_change
        }
        on_automatic_checkpoints_toggle={
          settings_hook.handle_automatic_checkpoints_toggle
        }
        on_checkpoint_lifespan_change={
          settings_hook.handle_checkpoint_lifespan_change
        }
        on_clear_checks_in_workspace_behavior_change={
          settings_hook.handle_clear_checks_in_workspace_behavior_change
        }
        on_gemini_user_id_change={settings_hook.handle_gemini_user_id_change}
        on_ai_studio_user_id_change={
          settings_hook.handle_ai_studio_user_id_change
        }
        on_send_with_shift_enter_change={
          settings_hook.handle_send_with_shift_enter_change
        }
        on_check_new_files_change={settings_hook.handle_check_new_files_change}
        on_reuse_last_tab_change={settings_hook.handle_reuse_last_tab_change}
        on_auto_run_intelligent_update_change={
          settings_hook.handle_auto_run_intelligent_update_change
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
            (p) => p.name == provider_name
          )
          if (provider) {
            set_updating_model_provider({
              original_name: provider.name,
              provider
            })
            set_is_new_model_provider(false)
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
            (c) => c.id == id
          )
          if (config) set_updating_api_configuration(config)
        }}
        on_delete_api_configuration={
          settings_hook.handle_delete_api_configuration
        }
        web_configurations={settings_hook.web_configurations!}
        set_web_configurations={settings_hook.set_web_configurations}
        on_reorder_web_configurations={
          settings_hook.handle_reorder_web_configurations
        }
        on_add_web_configuration={settings_hook.handle_add_web_configuration}
        on_edit_web_configuration={(id) => {
          const config = settings_hook.web_configurations?.find(
            (c, index) => (c.name ?? `unnamed-${index}`) === id
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
        on_open_external_url={settings_hook.handle_open_external_url}
        scroll_to_section_on_load={scroll_to_section_on_load}
      />
      {updating_web_configuration && (
        <UiModal on_close={edit_web_configuration_cancel_handler}>
          <UiModal.Form
            title="Edit Configuration"
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
      {updating_api_configuration && (
        <UiModal on_close={edit_api_configuration_cancel_handler}>
          <UiModal.Form
            title="Edit Configuration"
            on_save={edit_api_configuration_save_handler}
            on_cancel={edit_api_configuration_cancel_handler}
          >
            <EditApiConfigurationForm
              api_configuration={updating_api_configuration}
              on_update={set_updated_api_configuration}
              pick_model_provider={(current) => {
                post_message(vscode, {
                  command: 'PICK_MODEL_PROVIDER',
                  current_model_provider_name: current
                })
              }}
              pick_model={(provider, current) => {
                post_message(vscode, {
                  command: 'PICK_API_MODEL',
                  model_provider_name: provider,
                  current_model: current
                })
              }}
              pick_reasoning_effort={(provider, model, current) => {
                post_message(vscode, {
                  command: 'PICK_API_REASONING_EFFORT',
                  model_provider_name: provider,
                  model,
                  current_effort: current
                })
              }}
            />
          </UiModal.Form>
        </UiModal>
      )}
      {updating_model_provider && (
        <UiModal on_close={edit_model_provider_cancel_handler}>
          <UiModal.Form
            title="Edit Model Provider"
            on_save={edit_model_provider_save_handler}
            on_cancel={edit_model_provider_cancel_handler}
          >
            <EditModelProviderForm
              provider={updating_model_provider.provider}
              on_update={set_updated_model_provider}
              on_open_external_url={settings_hook.handle_open_external_url}
            />
          </UiModal.Form>
        </UiModal>
      )}
      {updating_template && (
        <UiModal on_close={edit_template_cancel_handler}>
          <UiModal.Form
            title={
              updating_template.index !== undefined
                ? 'Edit Template'
                : 'Add Template'
            }
            on_save={edit_template_save_handler}
            on_cancel={edit_template_cancel_handler}
          >
            <EditTemplateForm
              template={updating_template.template}
              on_update={set_updated_template}
            />
          </UiModal.Form>
        </UiModal>
      )}
    </div>
  )
}
