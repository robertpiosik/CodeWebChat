import * as vscode from 'vscode'
import {
  BackendMessage,
  FrontendMessage
} from '@/views/settings/types/messages'
import {
  handle_add_provider,
  handle_update_provider,
  handle_delete_provider,
  handle_get_api_configurations,
  handle_get_commit_message_instructions,
  handle_get_attach_ascii_tree_of_context,
  handle_get_use_context_files_in_commit_message_prompt,
  handle_get_include_prompts_in_commit_messages,
  handle_get_edit_files_system_instructions,
  handle_get_gemini_user_id,
  handle_get_ai_studio_user_id,
  handle_get_providers,
  handle_get_send_with_shift_enter,
  handle_reorder_providers,
  handle_set_default_api_configuration,
  handle_select_default_api_configuration,
  handle_update_commit_message_instructions,
  handle_update_attach_ascii_tree_of_context,
  handle_update_use_context_files_in_commit_message_prompt,
  handle_update_include_prompts_in_commit_messages,
  handle_update_edit_files_system_instructions,
  handle_update_gemini_user_id,
  handle_update_ai_studio_user_id,
  handle_update_send_with_shift_enter,
  handle_open_ignore_patterns_settings,
  handle_open_allow_patterns_settings,
  handle_open_keybindings,
  handle_delete_web_configuration,
  handle_reorder_web_configurations,
  handle_create_web_configuration,
  handle_pick_chatbot,
  handle_pick_model,
  handle_pick_reasoning_effort,
  handle_update_web_configuration,
  handle_create_api_configuration,
  handle_update_api_configuration,
  handle_delete_api_configuration,
  handle_reorder_api_configurations,
  handle_pick_provider,
  handle_pick_api_model,
  handle_pick_api_reasoning_effort,
  handle_get_templates,
  handle_update_templates,
  handle_create_template,
  handle_delete_template,
  handle_create_cli_configuration,
  handle_delete_cli_configuration,
  handle_update_cli_configuration,
  handle_reorder_cli_configurations,
  handle_pick_agent
} from './message-handlers'
import { config_web_configuration_to_ui_format } from '@/utils/web-configuration-format-converters'
import { webview_html } from '@/views/shared/utils/webview-html'
import { CHATBOTS } from '@shared/constants/chatbots'
import { config_cli_configuration_to_ui_format } from '@/utils/cli-configuration-format-converters'
import { AGENTS } from '@/constants/agents'
import { t } from '@/i18n'

export class SettingsViewProvider {
  private _webview_panel: vscode.WebviewPanel | undefined
  private _disposables: vscode.Disposable[] = []
  private _pending_section_to_show: string | undefined

  constructor(
    private readonly _extensionUri: vscode.Uri,
    public readonly extension_context: vscode.ExtensionContext
  ) {}

  private _send_web_configurations() {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const web_configurations_config = config.get<any[]>('chatbots', []) || []

    this.postMessage({
      command: 'WEB_CONFIGURATIONS',
      web_configurations: web_configurations_config
        .filter(
          (c: any) => c.chatbot && CHATBOTS[c.chatbot as keyof typeof CHATBOTS]
        )
        .map((config: any) => {
          let model = config.model
          if (config.chatbot && model) {
            const chatbot_info =
              CHATBOTS[config.chatbot as keyof typeof CHATBOTS]
            const is_user_provided_supported =
              chatbot_info.supports_user_provided_model
            const is_model_predefined = chatbot_info.models?.[model]

            if (
              !is_user_provided_supported &&
              !is_model_predefined &&
              config.chatbot != 'OpenRouter'
            ) {
              model = undefined
            }
          }
          return config_web_configuration_to_ui_format({ ...config, model })
        })
    })
  }

  private _send_cli_configurations() {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const cli_configurations_config = config.get<any[]>('agents', []) || []

    this.postMessage({
      command: 'CLI_CONFIGURATIONS',
      cli_configurations: cli_configurations_config
        .filter(
          (c: any) => c.agent && AGENTS[c.agent as keyof typeof AGENTS]
        )
        .map((config: any) => {
          return config_cli_configuration_to_ui_format(config)
        }),
      defaults: {
        'agentic-search': cli_configurations_config.find((c: any) => c.isDefaultForAgenticSearch)?.name || null
      }
    })
  }

  private _send_is_modern_ui() {
    const config = vscode.workspace.getConfiguration('workbench')
    const is_modern_ui = config.get<boolean>('experimental.modernUI', false)
    this.postMessage({
      command: 'IS_MODERN_UI',
      is_modern_ui
    })
  }

  public createOrShow(section_to_show?: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined

    if (this._webview_panel) {
      this._webview_panel.reveal(column)
      if (section_to_show) {
        this.postMessage({
          command: 'SHOW_SECTION',
          section: section_to_show
        })
      }
      return
    }

    this._pending_section_to_show = section_to_show

    this._webview_panel = vscode.window.createWebviewPanel(
      'codeWebChatSettings',
      'Settings',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [this._extensionUri]
      }
    )

    this._webview_panel.iconPath = new vscode.ThemeIcon('gear') as any

    this._webview_panel.onDidDispose(() => {
      this._webview_panel = undefined
      this._disposables.forEach((d) => d.dispose())
      this._disposables = []
    }, null)

    this._webview_panel.webview.html = this._getHtmlForWebview(
      this._webview_panel.webview
    )

    this._webview_panel.webview.onDidReceiveMessage(
      async (message: FrontendMessage) => {
        if (message.command == 'SETTINGS_UI_READY') {
          if (this._pending_section_to_show) {
            this.postMessage({
              command: 'SHOW_SECTION',
              section: this._pending_section_to_show
            })
            this._pending_section_to_show = undefined
          }
        } else if (message.command == 'GET_PROVIDERS') {
          await handle_get_providers(this)
        } else if (message.command == 'REORDER_PROVIDERS') {
          await handle_reorder_providers(this, message)
        } else if (message.command == 'ADD_PROVIDER') {
          await handle_add_provider(this, message)
        } else if (message.command == 'DELETE_PROVIDER') {
          await handle_delete_provider(this, message)
        } else if (message.command == 'UPDATE_PROVIDER') {
          await handle_update_provider(this, message)
        } else if (message.command == 'GET_TEMPLATES') {
          await handle_get_templates(this)
        } else if (message.command == 'UPDATE_TEMPLATES') {
          await handle_update_templates(message)
        } else if (message.command == 'CREATE_TEMPLATE') {
          await handle_create_template(this, message)
        } else if (message.command == 'DELETE_TEMPLATE') {
          await handle_delete_template(this, message)
        } else if (message.command == 'GET_API_CONFIGURATIONS') {
          await handle_get_api_configurations(this)
        } else if (message.command == 'SET_DEFAULT_API_CONFIGURATION') {
          await handle_set_default_api_configuration(
            this,
            message.api_configuration_id,
            message.api_feature
          )
        } else if (message.command == 'SELECT_DEFAULT_API_CONFIGURATION') {
          await handle_select_default_api_configuration(this, message)
        } else if (message.command == 'GET_EDIT_FILES_SYSTEM_INSTRUCTIONS') {
          await handle_get_edit_files_system_instructions(this)
        } else if (message.command == 'UPDATE_EDIT_FILES_SYSTEM_INSTRUCTIONS') {
          await handle_update_edit_files_system_instructions(message)
        } else if (message.command == 'GET_COMMIT_MESSAGE_INSTRUCTIONS') {
          await handle_get_commit_message_instructions(this)
        } else if (message.command == 'UPDATE_COMMIT_MESSAGE_INSTRUCTIONS') {
          await handle_update_commit_message_instructions(message)
        } else if (message.command == 'GET_ATTACH_ASCII_TREE_OF_CONTEXT') {
          await handle_get_attach_ascii_tree_of_context(this)
        } else if (message.command == 'UPDATE_ATTACH_ASCII_TREE_OF_CONTEXT') {
          await handle_update_attach_ascii_tree_of_context(message)
        } else if (
          message.command == 'GET_USE_CONTEXT_FILES_IN_COMMIT_MESSAGE_PROMPT'
        ) {
          await handle_get_use_context_files_in_commit_message_prompt(this)
        } else if (
          message.command == 'UPDATE_USE_CONTEXT_FILES_IN_COMMIT_MESSAGE_PROMPT'
        ) {
          await handle_update_use_context_files_in_commit_message_prompt(
            message
          )
        } else if (
          message.command ==
          'GET_SELECT_ALL_PROMPTS_IN_COMMIT_MESSAGES_BY_DEFAULT'
        ) {
          await handle_get_include_prompts_in_commit_messages(this)
        } else if (
          message.command ==
          'UPDATE_SELECT_ALL_PROMPTS_IN_COMMIT_MESSAGES_BY_DEFAULT'
        ) {
          await handle_update_include_prompts_in_commit_messages(message)
        } else if (message.command == 'GET_GEMINI_USER_ID') {
          await handle_get_gemini_user_id(this)
        } else if (message.command == 'UPDATE_GEMINI_USER_ID') {
          await handle_update_gemini_user_id(message)
        } else if (message.command == 'GET_AI_STUDIO_USER_ID') {
          await handle_get_ai_studio_user_id(this)
        } else if (message.command == 'UPDATE_AI_STUDIO_USER_ID') {
          await handle_update_ai_studio_user_id(message)
        } else if (message.command == 'GET_SEND_WITH_SHIFT_ENTER') {
          await handle_get_send_with_shift_enter(this)
        } else if (message.command == 'UPDATE_SEND_WITH_SHIFT_ENTER') {
          await handle_update_send_with_shift_enter(message)
        } else if (message.command == 'OPEN_EDITOR_SETTINGS') {
          await vscode.commands.executeCommand('workbench.action.openSettings')
        } else if (message.command == 'OPEN_IGNORE_PATTERNS_SETTINGS') {
          await handle_open_ignore_patterns_settings()
        } else if (message.command == 'OPEN_ALLOW_PATTERNS_SETTINGS') {
          await handle_open_allow_patterns_settings()
        } else if (message.command == 'OPEN_KEYBINDINGS') {
          await handle_open_keybindings(message)
        } else if (message.command == 'GET_CLI_CONFIGURATIONS') {
          this._send_cli_configurations()
        } else if (message.command == 'CREATE_CLI_CONFIGURATION') {
          await handle_create_cli_configuration(this, message)
        } else if (message.command == 'DELETE_CLI_CONFIGURATION') {
          await handle_delete_cli_configuration(message.name)
        } else if (message.command == 'UPDATE_CLI_CONFIGURATION') {
          await handle_update_cli_configuration(this, message)
        } else if (message.command == 'REORDER_CLI_CONFIGURATIONS') {
          await handle_reorder_cli_configurations(message)
        } else if (message.command == 'PICK_AGENT') {
          await handle_pick_agent(this, message)
        } else if (message.command == 'GET_WEB_CONFIGURATIONS') {
          this._send_web_configurations()
        } else if (message.command == 'REORDER_WEB_CONFIGURATIONS') {
          await handle_reorder_web_configurations(message)
        } else if (message.command == 'DELETE_WEB_CONFIGURATION') {
          await handle_delete_web_configuration(message.name)
        } else if (message.command == 'CREATE_WEB_CONFIGURATION') {
          await handle_create_web_configuration(this, message)
        } else if (message.command == 'PICK_CHATBOT') {
          await handle_pick_chatbot(this, message)
        } else if (message.command == 'PICK_MODEL') {
          await handle_pick_model(this, message)
        } else if (message.command == 'PICK_REASONING_EFFORT') {
          await handle_pick_reasoning_effort(this, message)
        } else if (message.command == 'UPDATE_WEB_CONFIGURATION') {
          await handle_update_web_configuration(this, message)
        } else if (message.command == 'CREATE_API_CONFIGURATION') {
          await handle_create_api_configuration(this, message)
        } else if (message.command == 'UPDATE_API_CONFIGURATION') {
          await handle_update_api_configuration(this, message)
        } else if (message.command == 'DELETE_API_CONFIGURATION') {
          await handle_delete_api_configuration(this, message)
        } else if (message.command == 'REORDER_API_CONFIGURATIONS') {
          await handle_reorder_api_configurations(this, message)
        } else if (message.command == 'PICK_PROVIDER') {
          await handle_pick_provider(this, message)
        } else if (message.command == 'PICK_API_MODEL') {
          await handle_pick_api_model(this, message)
        } else if (message.command == 'PICK_API_REASONING_EFFORT') {
          await handle_pick_api_reasoning_effort(this, message)
        } else if (message.command == 'SET_DEFAULT_CLI_CONFIGURATION') {
          const config = vscode.workspace.getConfiguration('codeWebChat')
          const agent_configs = config.get<any[]>('agents', []) || []
          const updated = agent_configs.map((c) => {
            const new_c = { ...c }
            if (message.cli_feature === 'agentic-search') {
              if (c.name === message.cli_configuration_name) {
                new_c.isDefaultForAgenticSearch = true
              } else {
                delete new_c.isDefaultForAgenticSearch
              }
            }
            return new_c
          })
          await config.update('agents', updated, vscode.ConfigurationTarget.Global)
        } else if (message.command == 'SELECT_DEFAULT_CLI_CONFIGURATION') {
          const config = vscode.workspace.getConfiguration('codeWebChat')
          const agent_configs = config.get<any[]>('agents', []) || []
          if (agent_configs.length === 0) return

          const items = agent_configs.map((c) => {
            const is_unnamed = /^\(\d+\)$/.test(c.name.trim())
            const display_name = is_unnamed ? c.agent : c.name.replace(/ \(\d+\)$/, '')

            return {
              label: display_name,
              description: c.agent === display_name ? undefined : c.agent,
              cli_configuration_name: c.name
            }
          })

          const quick_pick = vscode.window.createQuickPick<
            vscode.QuickPickItem & { cli_configuration_name: string }
          >()
          quick_pick.items = items
          quick_pick.title = t('common.title.agents')
          quick_pick.placeholder = t('common.placeholder.select-agent')

          const close_button: vscode.QuickInputButton = {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: t('common.close')
          }
          quick_pick.buttons = [close_button]

          quick_pick.onDidTriggerButton((button) => {
            if (button === close_button) {
              quick_pick.hide()
            }
          })

          quick_pick.onDidAccept(async () => {
            const selected = quick_pick.selectedItems[0]
            quick_pick.hide()

            if (selected) {
              const updated = agent_configs.map((c) => {
                const new_c = { ...c }
                if (message.cli_feature == 'agentic-search') {
                  if (c.name == selected.cli_configuration_name) {
                    new_c.isDefaultForAgenticSearch = true
                  } else {
                    delete new_c.isDefaultForAgenticSearch
                  }
                }
                return new_c
              })
              await config.update('agents', updated, vscode.ConfigurationTarget.Global)
            }
          })

          quick_pick.onDidHide(() => quick_pick.dispose())
          quick_pick.show()
        } else if (message.command == 'GET_IS_MODERN_UI') {
          this._send_is_modern_ui()
        }
      },
      null,
      this._disposables
    )

    this._disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('codeWebChat')) {
          void handle_get_providers(this)
          void handle_get_api_configurations(this)
          void handle_get_edit_files_system_instructions(this)
          void handle_get_commit_message_instructions(this)
          void handle_get_attach_ascii_tree_of_context(this)
          void handle_get_use_context_files_in_commit_message_prompt(this)
          void handle_get_include_prompts_in_commit_messages(this)
          void handle_get_gemini_user_id(this)
          void handle_get_ai_studio_user_id(this)
          void handle_get_send_with_shift_enter(this)
          void handle_get_templates(this)
          this._send_web_configurations()
          this._send_cli_configurations()
        }
        if (e.affectsConfiguration('workbench.experimental.modernUI')) {
          this._send_is_modern_ui()
        }
      })
    )
  }

  public postMessage(message: BackendMessage) {
    if (this._webview_panel) {
      this._webview_panel.webview.postMessage(message)
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return webview_html({
      webview,
      extension_uri: this._extensionUri,
      name: 'settings',
      title: 'Settings'
    })
  }
}
