import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'
import { WebSocketManager } from '@/services/websocket-manager'
import {
  WebviewMessage,
  ExtensionMessage,
  PresetsMessage,
  TokenCountMessage,
  SelectionTextMessage,
  ActiveFileInfoMessage,
  UpdatePresetMessage,
  DeletePresetMessage,
  SelectedPresetsMessage,
  DuplicatePresetMessage,
  CreatePresetMessage,
  GeminiApiKeyMessage,
  CustomProvidersUpdatedMessage,
  OpenRouterModelsMessage,
  OpenRouterModelSelectedMessage,
  ApiToolCodeCompletionsSettingsMessage,
  ApiToolFileRefactoringSettingsMessage,
  ApiToolCommitMessageSettingsMessage,
  OpenRouterApiKeyMessage,
  ExecuteCommandMessage,
  ShowQuickPickMessage,
  PreviewPresetMessage,
  SelectedCodeCompletionPresetsMessage,
  InstructionsMessage,
  CodeCompletionSuggestionsMessage,
  EditFormatSelectorVisibilityMessage
} from './types/messages'
import { WebsitesProvider } from '../context/providers/websites-provider'
import { OpenEditorsProvider } from '@/context/providers/open-editors-provider'
import { WorkspaceProvider } from '@/context/providers/workspace-provider'
import { apply_preset_affixes_to_instruction } from '../helpers/apply-preset-affixes'
import { token_count_emitter } from '@/context/context-initialization'
import { Preset } from '@shared/types/preset'
import { CHATBOTS } from '@shared/constants/chatbots'
import { ApiToolsSettingsManager } from '@/services/api-tools-settings-manager'
import axios from 'axios'
import { Logger } from '@/helpers/logger'
import { OpenRouterModelsResponse } from '@/types/open-router-models-response'
import { ApiToolSettings } from '@shared/types/api-tool-settings'
import { replace_selection_placeholder } from '../utils/replace-selection-placeholder'
import { EditFormat } from '@shared/types/edit-format'
import { EditFormatSelectorVisibility } from './types/edit-format-selector-visibility'

type ConfigPresetFormat = {
  name: string
  chatbot: keyof typeof CHATBOTS
  promptPrefix?: string
  promptSuffix?: string
  model?: string
  temperature?: number
  topP?: number
  systemInstructions?: string
  options?: string[]
  port?: number
}

export class ViewProvider implements vscode.WebviewViewProvider {
  private _webview_view: vscode.WebviewView | undefined
  private _config_listener: vscode.Disposable | undefined
  private _has_active_editor: boolean = false
  private _has_active_selection: boolean = false
  private _is_code_completions_mode: boolean = false
  private _api_tools_settings_manager: ApiToolsSettingsManager
  private _instructions: string = ''
  private _code_completion_suggestions: string = ''

  constructor(
    private readonly _extension_uri: vscode.Uri,
    private readonly _workspace_provider: WorkspaceProvider,
    private readonly _open_editors_provider: OpenEditorsProvider,
    private readonly _websites_provider: WebsitesProvider,
    private readonly _context: vscode.ExtensionContext,
    private readonly websocket_server_instance: WebSocketManager
  ) {
    this.websocket_server_instance.on_connection_status_change((connected) => {
      if (this._webview_view) {
        this._send_message<ExtensionMessage>({
          command: 'CONNECTION_STATUS',
          connected
        })
      }
    })

    // Listen for changes to the new configuration keys
    this._config_listener = vscode.workspace.onDidChangeConfiguration(
      (event) => {
        const config = vscode.workspace.getConfiguration()

        if (
          event.affectsConfiguration('geminiCoder.presets') &&
          this._webview_view
        ) {
          this._send_presets_to_webview(this._webview_view.webview)
        }
        if (
          event.affectsConfiguration('geminiCoder.providers') &&
          this._webview_view
        ) {
          const providers = config.get<any[]>('geminiCoder.providers', [])
          this._send_message<CustomProvidersUpdatedMessage>({
            command: 'CUSTOM_PROVIDERS_UPDATED',
            custom_providers: providers
          })
        }
        if (
          event.affectsConfiguration(
            'geminiCoder.apiToolCodeCompletionsSettings'
          ) &&
          this._webview_view
        ) {
          const config = vscode.workspace.getConfiguration()
          const settings = config.get<ApiToolSettings>(
            'geminiCoder.apiToolCodeCompletionsSettings',
            {}
          )
          this._send_message<ApiToolCodeCompletionsSettingsMessage>({
            command: 'CODE_COMPLETIONS_SETTINGS',
            settings
          })
        }
        if (
          event.affectsConfiguration(
            'geminiCoder.apiToolFileRefactoringSettings'
          ) &&
          this._webview_view
        ) {
          const config = vscode.workspace.getConfiguration()
          const settings = config.get<ApiToolSettings>(
            'geminiCoder.apiToolFileRefactoringSettings',
            {}
          )
          this._send_message<ApiToolFileRefactoringSettingsMessage>({
            command: 'FILE_REFACTORING_SETTINGS',
            settings
          })
        }
        if (
          event.affectsConfiguration(
            'geminiCoder.apiToolCommitMessageSettings'
          ) &&
          this._webview_view
        ) {
          const config = vscode.workspace.getConfiguration()
          const settings = config.get<ApiToolSettings>(
            'geminiCoder.apiToolCommitMessageSettings',
            {}
          )
          this._send_message<ApiToolCommitMessageSettingsMessage>({
            command: 'COMMIT_MESSAGES_SETTINGS',
            settings
          })
        }
        if (
          event.affectsConfiguration('geminiCoder.editFormat') &&
          this._webview_view
        ) {
          const config = vscode.workspace.getConfiguration()
          const edit_format = config.get<EditFormat>('geminiCoder.editFormat')!
          this._send_message<ExtensionMessage>({
            command: 'EDIT_FORMAT',
            edit_format
          })
        }
        if (
          event.affectsConfiguration(
            'geminiCoder.editFormatSelectorVisibility'
          ) &&
          this._webview_view
        ) {
          const config = vscode.workspace.getConfiguration()
          const visibility = config.get<EditFormatSelectorVisibility>(
            'geminiCoder.editFormatSelectorVisibility'
          )!
          this._send_message<EditFormatSelectorVisibilityMessage>({
            command: 'EDIT_FORMAT_SELECTOR_VISIBILITY',
            visibility
          })
        }
      }
    )

    token_count_emitter.on('token-count-updated', () => {
      if (this._webview_view) {
        this._calculate_token_count()
      }
    })

    this._context.subscriptions.push(this._config_listener)
    this._api_tools_settings_manager = new ApiToolsSettingsManager(
      this._context
    )

    this._instructions = this._context.workspaceState.get<string>(
      'instructions',
      ''
    )
    this._code_completion_suggestions =
      this._context.workspaceState.get<string>(
        'code-completion-suggestions',
        ''
      )

    const update_editor_state = () => {
      const has_active_editor = !!vscode.window.activeTextEditor
      if (has_active_editor != this._has_active_editor) {
        this._has_active_editor = has_active_editor
        if (this._webview_view) {
          this._send_message<ExtensionMessage>({
            command: 'EDITOR_STATE_CHANGED',
            has_active_editor: has_active_editor
          })
        }
      }
    }

    vscode.window.onDidChangeActiveTextEditor(() =>
      setTimeout(update_editor_state, 100)
    )
    update_editor_state()

    // Add selection change listener
    vscode.window.onDidChangeTextEditorSelection((event) => {
      const has_selection = !event.textEditor.selection.isEmpty
      if (has_selection != this._has_active_selection) {
        this._has_active_selection = has_selection
        if (this._webview_view) {
          this._send_message<ExtensionMessage>({
            command: 'EDITOR_SELECTION_CHANGED',
            hasSelection: has_selection
          })
        }
      }
    })

    const update_selection_state = () => {
      const active_text_editor = vscode.window.activeTextEditor
      const has_selection = active_text_editor
        ? !active_text_editor.selection.isEmpty
        : false
      this._has_active_selection = has_selection
      if (this._webview_view) {
        this._send_message<ExtensionMessage>({
          command: 'EDITOR_SELECTION_CHANGED',
          hasSelection: has_selection
        })
      }
    }

    const update_selection_text = () => {
      const active_text_editor = vscode.window.activeTextEditor
      if (active_text_editor && !active_text_editor.selection.isEmpty) {
        const selected_text = active_text_editor.document.getText(
          active_text_editor.selection
        )

        if (this._webview_view) {
          this._send_message<SelectionTextMessage>({
            command: 'SELECTION_TEXT_UPDATED',
            text: selected_text
          })
        }
      }
    }

    vscode.window.onDidChangeActiveTextEditor(() =>
      setTimeout(update_selection_state, 100)
    )
    update_selection_state()

    vscode.window.onDidChangeTextEditorSelection(() =>
      setTimeout(update_selection_text, 100)
    )
    update_selection_text()

    vscode.window.onDidChangeActiveTextEditor(() => {
      this._update_active_file_info()
    })

    vscode.workspace.onDidChangeTextDocument((event) => {
      if (
        vscode.window.activeTextEditor &&
        event.document === vscode.window.activeTextEditor.document
      ) {
        this._update_active_file_info()

        // Also recalculate token count when active file changes in FIM mode
        if (this._is_code_completions_mode && this._webview_view) {
          this._calculate_token_count()
        }
      }
    })
  }

  private _calculate_token_count() {
    const files_collector = new FilesCollector(
      this._workspace_provider,
      this._open_editors_provider,
      this._websites_provider
    )

    const active_editor = vscode.window.activeTextEditor
    const active_path = active_editor?.document.uri.fsPath

    const options = {
      disable_xml: true,
      ...(this._is_code_completions_mode && active_path
        ? { exclude_path: active_path }
        : {})
    }

    files_collector
      .collect_files(options)
      .then((context_text) => {
        let current_token_count = Math.floor(context_text.length / 4)

        if (active_editor && this._is_code_completions_mode) {
          const document = active_editor.document
          const text = document.getText()
          const file_token_count = Math.floor(text.length / 4)
          current_token_count += file_token_count
        }

        this._send_message<TokenCountMessage>({
          command: 'TOKEN_COUNT_UPDATED',
          tokenCount: current_token_count
        })
      })
      .catch((error) => {
        console.error('Error calculating token count:', error)
        this._send_message<TokenCountMessage>({
          command: 'TOKEN_COUNT_UPDATED',
          tokenCount: 0
        })
      })
  }

  private _send_message<
    T extends
      | ExtensionMessage
      | PresetsMessage
      | TokenCountMessage
      | SelectionTextMessage
      | ActiveFileInfoMessage
      | UpdatePresetMessage
      | DeletePresetMessage
      | SelectedPresetsMessage
      | SelectedCodeCompletionPresetsMessage
      | DuplicatePresetMessage
      | CreatePresetMessage
      | GeminiApiKeyMessage
      | CustomProvidersUpdatedMessage
      | OpenRouterModelsMessage
      | OpenRouterModelSelectedMessage
      | ApiToolCodeCompletionsSettingsMessage
      | ApiToolFileRefactoringSettingsMessage
      | ApiToolCommitMessageSettingsMessage
      | ExecuteCommandMessage
      | ShowQuickPickMessage
      | PreviewPresetMessage
      | InstructionsMessage
      | CodeCompletionSuggestionsMessage
      | EditFormatSelectorVisibilityMessage
  >(message: T) {
    if (this._webview_view) {
      this._webview_view.webview.postMessage(message)
    }
  }

  // Inside ChatViewProvider class, add this new helper method
  private async _validate_presets(preset_names: string[]): Promise<string[]> {
    const config = vscode.workspace.getConfiguration()
    const presets = config.get<any[]>('geminiCoder.presets', [])
    const available_presets = presets.filter((preset) =>
      !this._is_code_completions_mode
        ? true
        : !preset.promptPrefix && !preset.promptSuffix
    )
    const available_preset_names = available_presets.map(
      (preset) => preset.name
    )

    // Filter out any presets that no longer exist
    const valid_presets = preset_names.filter((name) =>
      available_preset_names.includes(name)
    )

    // If no valid presets, show the picker
    if (valid_presets.length == 0) {
      const preset_quick_pick_items = available_presets.map((preset) => ({
        label: preset.name,
        description: `${preset.chatbot}${
          preset.model ? ` - ${preset.model}` : ''
        }`,
        picked: false
      }))

      const placeholder = !this._is_code_completions_mode
        ? 'Select one or more presets'
        : 'Select one or more presets to use when asking for code completions'

      const selected_presets = await vscode.window.showQuickPick(
        preset_quick_pick_items,
        {
          placeHolder: placeholder,
          canPickMany: true
        }
      )

      if (selected_presets) {
        const selected_names = selected_presets.map((preset) => preset.label)
        const selected_names_key = this._is_code_completions_mode
          ? 'selectedCodeCompletionPresets'
          : 'selectedPresets'
        await this._context.globalState.update(
          selected_names_key,
          selected_names
        )

        // Send the appropriate message back to the webview
        if (this._is_code_completions_mode) {
          this._send_message<SelectedCodeCompletionPresetsMessage>({
            command: 'SELECTED_CODE_COMPLETION_PRESETS',
            names: selected_names
          })
        } else {
          this._send_message<SelectedPresetsMessage>({
            command: 'SELECTED_PRESETS',
            names: selected_names
          })
        }

        return selected_names
      }
      return []
    }

    return valid_presets
  }

  // Helper function to convert UI Preset format to Config format
  private _ui_preset_to_config_format(preset: Preset): ConfigPresetFormat {
    return {
      name: preset.name,
      chatbot: preset.chatbot,
      promptPrefix: preset.prompt_prefix,
      promptSuffix: preset.prompt_suffix,
      model: preset.model,
      temperature: preset.temperature,
      topP: preset.top_p,
      systemInstructions: preset.system_instructions,
      options: preset.options,
      port: preset.port
    }
  }

  // Helper function to convert Config Preset format to UI format (already used in _send_presets_to_webview)
  private _config_preset_to_ui_format(
    config_preset: ConfigPresetFormat
  ): Preset {
    return {
      name: config_preset.name,
      chatbot: config_preset.chatbot,
      prompt_prefix: config_preset.promptPrefix,
      prompt_suffix: config_preset.promptSuffix,
      model: config_preset.model,
      temperature: config_preset.temperature,
      top_p: config_preset.topP,
      system_instructions: config_preset.systemInstructions,
      options: config_preset.options,
      port: config_preset.port
    }
  }

  private async _fetch_open_router_models(): Promise<{
    [model_id: string]: {
      name: string
      description: string
    }
  }> {
    try {
      const response = await axios.get<OpenRouterModelsResponse>(
        'https://openrouter.ai/api/v1/models'
      )

      const models: {
        [model_id: string]: {
          name: string
          description: string
        }
      } = {}

      for (const model of response.data.data
        .filter((m) => m.created >= 1725148800) // skip older models created before Sep 2024
        .sort((a, b) => a.id.localeCompare(b.id))) {
        models[model.id] = {
          name: model.name,
          description: model.description
        }
      }

      return models
    } catch (error) {
      Logger.error({
        function_name: '_fetch_open_router_models',
        message: 'Error fetching OpenRouter models',
        data: error
      })
      vscode.window.showErrorMessage('Failed to fetch OpenRouter models.')
      return {}
    }
  }

  async resolveWebviewView(
    webview_view: vscode.WebviewView,
    _: vscode.WebviewViewResolveContext,
    __: vscode.CancellationToken
  ) {
    this._webview_view = webview_view

    webview_view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extension_uri]
    }

    webview_view.webview.html = this._get_html_for_webview(webview_view.webview)

    webview_view.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        try {
          if (message.command == 'GET_HISTORY') {
            const history = this._context.workspaceState.get<string[]>(
              'history',
              []
            )
            this._send_message<ExtensionMessage>({
              command: 'CHAT_HISTORY',
              messages: history
            })
          } else if (message.command == 'GET_CODE_COMPLETIONS_HISTORY') {
            const history = this._context.workspaceState.get<string[]>(
              'code-completions-history',
              []
            )
            this._send_message<ExtensionMessage>({
              command: 'FIM_CHAT_HISTORY',
              messages: history
            })
          } else if (message.command == 'SAVE_HISTORY') {
            const key = !this._is_code_completions_mode
              ? 'history'
              : 'code-completions-history'
            this._context.workspaceState.update(key, message.messages)
          } else if (message.command == 'GET_INSTRUCTIONS') {
            this._send_message<InstructionsMessage>({
              command: 'INSTRUCTIONS',
              value: this._instructions
            })
          } else if (message.command == 'SAVE_INSTRUCTIONS') {
            this._instructions = message.instruction
            this._context.workspaceState.update(
              'instructions',
              message.instruction
            )
          } else if (message.command == 'GET_CODE_COMPLETION_SUGGESTIONS') {
            this._send_message<CodeCompletionSuggestionsMessage>({
              command: 'CODE_COMPLETION_SUGGESTIONS',
              value: this._code_completion_suggestions
            })
          } else if (message.command == 'SAVE_CODE_COMPLETION_SUGGESTIONS') {
            this._code_completion_suggestions = message.instruction
            this._context.workspaceState.update(
              'code-completion-suggestions',
              message.instruction
            )
          } else if (message.command == 'GET_CONNECTION_STATUS') {
            this._send_message<ExtensionMessage>({
              command: 'CONNECTION_STATUS',
              connected:
                this.websocket_server_instance.is_connected_with_browser()
            })
          } else if (message.command == 'GET_PRESETS') {
            this._send_presets_to_webview(webview_view.webview)
          } else if (message.command == 'GET_SELECTED_PRESETS') {
            const selected_names = this._context.globalState.get<string[]>(
              'selectedPresets',
              []
            )
            this._send_message<SelectedPresetsMessage>({
              command: 'SELECTED_PRESETS',
              names: selected_names
            })
          } else if (message.command == 'SAVE_SELECTED_PRESETS') {
            await this._context.globalState.update(
              'selectedPresets',
              message.names
            )
          } else if (
            message.command == 'GET_SELECTED_CODE_COMPLETION_PRESETS'
          ) {
            const selected_names = this._context.globalState.get<string[]>(
              'selectedCodeCompletionPresets',
              []
            )
            this._send_message<SelectedCodeCompletionPresetsMessage>({
              command: 'SELECTED_CODE_COMPLETION_PRESETS',
              names: selected_names
            })
          } else if (
            message.command == 'SAVE_SELECTED_CODE_COMPLETION_PRESETS'
          ) {
            await this._context.globalState.update(
              'selectedCodeCompletionPresets',
              message.names
            )
          } else if (message.command == 'SEND_PROMPT') {
            // Validate presets first
            const valid_preset_names = await this._validate_presets(
              message.preset_names
            )

            // If no presets were selected in the picker
            if (valid_preset_names.length == 0) {
              vscode.window.showInformationMessage(
                'Please select at least one preset to continue.'
              )
              return
            }

            await vscode.workspace.saveAll()

            const files_collector = new FilesCollector(
              this._workspace_provider,
              this._open_editors_provider,
              this._websites_provider
            )

            const active_editor = vscode.window.activeTextEditor
            const active_path = active_editor?.document.uri.fsPath

            if (this._is_code_completions_mode && active_editor) {
              const document = active_editor.document
              const position = active_editor.selection.active

              const text_before_cursor = document.getText(
                new vscode.Range(new vscode.Position(0, 0), position)
              )
              const text_after_cursor = document.getText(
                new vscode.Range(
                  position,
                  document.positionAt(document.getText().length)
                )
              )

              const context_text = await files_collector.collect_files({
                exclude_path: active_path
              })

              const workspace_folder =
                vscode.workspace.workspaceFolders?.[0].uri.fsPath
              const relative_path = active_path!.replace(
                workspace_folder + '/',
                ''
              )

              const config = vscode.workspace.getConfiguration()
              const chat_code_completion_instructions = config.get<string>(
                'geminiCoder.chatCodeCompletionInstructions'
              )

              const instructions = `${chat_code_completion_instructions}${
                this._code_completion_suggestions
                  ? ` Follow suggestions: ${this._code_completion_suggestions}`
                  : ''
              }`

              const text = `${instructions}\n<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}<missing text>${text_after_cursor}\n]]>\n</file>\n</files>\n${instructions}`

              this.websocket_server_instance.initialize_chats(
                text,
                valid_preset_names
              )
            } else if (!this._is_code_completions_mode) {
              if (!this._instructions) {
                vscode.window.showInformationMessage(
                  'Please enter instructions to use the preset.'
                )
                return
              }

              const context_text = await files_collector.collect_files({
                active_path
              })

              let instructions = this._instructions
              instructions = replace_selection_placeholder(instructions)
              instructions = apply_preset_affixes_to_instruction(
                instructions,
                valid_preset_names
              )

              const config = vscode.workspace.getConfiguration()
              const edit_format = config.get<EditFormat>(
                'geminiCoder.editFormat'
              )!
              const edit_format_instructions = config.get<string>(
                `geminiCoder.editFormatInstructions${
                  edit_format.charAt(0).toUpperCase() + edit_format.slice(1)
                }`
              )
              if (edit_format_instructions) {
                instructions += `\n${edit_format_instructions}`
              }

              const text = `${
                context_text
                  ? `${instructions}\n<files>\n${context_text}</files>\n`
                  : ''
              }${instructions}`

              this.websocket_server_instance.initialize_chats(
                text,
                valid_preset_names
              )
            }
            vscode.window.showInformationMessage(
              valid_preset_names.length > 1
                ? 'Chats have been initialized in the connected browser.'
                : 'Chat has been initialized in the connected browser.'
            )
          } else if (message.command == 'PREVIEW_PRESET') {
            await vscode.workspace.saveAll()

            const files_collector = new FilesCollector(
              this._workspace_provider,
              this._open_editors_provider,
              this._websites_provider
            )

            const active_editor = vscode.window.activeTextEditor
            const active_path = active_editor?.document.uri.fsPath

            let text_to_send: string
            const current_instructions = !this._is_code_completions_mode
              ? this._instructions
              : this._code_completion_suggestions

            if (this._is_code_completions_mode && active_editor) {
              const document = active_editor.document
              const position = active_editor.selection.active

              const text_before_cursor = document.getText(
                new vscode.Range(new vscode.Position(0, 0), position)
              )
              const text_after_cursor = document.getText(
                new vscode.Range(
                  position,
                  document.positionAt(document.getText().length)
                )
              )

              const context_text = await files_collector.collect_files({
                exclude_path: active_path
              })

              const workspace_folder =
                vscode.workspace.workspaceFolders?.[0].uri.fsPath
              const relative_path = active_path!.replace(
                workspace_folder + '/',
                ''
              )

              const config = vscode.workspace.getConfiguration()
              const chat_code_completion_instructions = config.get<string>(
                'geminiCoder.chatCodeCompletionInstructions'
              )

              const instructions = `${chat_code_completion_instructions}${
                current_instructions
                  ? ` Follow suggestions: ${current_instructions}`
                  : ''
              }`

              text_to_send = `${instructions}\n<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}<missing text>${text_after_cursor}\n]]>\n</file>\n</files>\n${instructions}`
            } else if (!this._is_code_completions_mode) {
              const context_text = await files_collector.collect_files({
                active_path
              })

              let instructions =
                replace_selection_placeholder(current_instructions)

              // Apply affixes from the PREVIEW preset, not default selected ones
              if (message.preset.prompt_prefix) {
                instructions =
                  message.preset.prompt_prefix + '\n' + instructions
              }
              if (message.preset.prompt_suffix) {
                instructions =
                  instructions + '\n' + message.preset.prompt_suffix
              }

              const config = vscode.workspace.getConfiguration()
              const edit_format = config.get<EditFormat>(
                'geminiCoder.editFormat'
              )!
              const edit_format_instructions = config.get<string>(
                `geminiCoder.editFormatInstructions${
                  edit_format.charAt(0).toUpperCase() + edit_format.slice(1)
                }`
              )
              if (edit_format_instructions) {
                instructions += `\n${edit_format_instructions}`
              }

              text_to_send = `${
                context_text
                  ? `${instructions}\n<files>\n${context_text}</files>\n`
                  : ''
              }${instructions}`
            } else {
              vscode.window.showWarningMessage(
                'Cannot preview in code completion mode without an active editor.'
              )
              return
            }

            this.websocket_server_instance.preview_preset(
              text_to_send,
              message.preset
            )
            vscode.window.showInformationMessage(
              'Preset preview sent to the connected browser.'
            )
          } else if (message.command == 'COPY_PROMPT') {
            const files_collector = new FilesCollector(
              this._workspace_provider,
              this._open_editors_provider,
              this._websites_provider
            )

            const active_editor = vscode.window.activeTextEditor
            const current_instruction = this._is_code_completions_mode
              ? this._code_completion_suggestions
              : this._instructions

            if (this._is_code_completions_mode && active_editor) {
              const document = active_editor.document
              const position = active_editor.selection.active
              const active_path = document.uri.fsPath

              const text_before_cursor = document.getText(
                new vscode.Range(new vscode.Position(0, 0), position)
              )
              const text_after_cursor = document.getText(
                new vscode.Range(
                  position,
                  document.positionAt(document.getText().length)
                )
              )

              const context_text = await files_collector.collect_files({
                exclude_path: active_path
              })

              const workspace_folder =
                vscode.workspace.workspaceFolders?.[0].uri.fsPath
              const relative_path = active_path.replace(
                workspace_folder + '/',
                ''
              )

              // Use the configurable instruction for code completions copy
              const config = vscode.workspace.getConfiguration()
              const chatCodeCompletionInstructions = config.get<string>(
                'geminiCoder.chatCodeCompletionInstructions'
              )

              const instructions = `${chatCodeCompletionInstructions}${
                current_instruction
                  ? ` Follow suggestions: ${current_instruction}`
                  : ''
              }`

              const text = `${instructions}\n<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}<missing text>${text_after_cursor}\n]]>\n</file>\n</files>\n${instructions}`

              vscode.env.clipboard.writeText(text)
            } else if (!this._is_code_completions_mode) {
              const active_path = active_editor?.document.uri.fsPath
              const context_text = await files_collector.collect_files({
                active_path
              })

              let instructions =
                replace_selection_placeholder(current_instruction)

              const config = vscode.workspace.getConfiguration()
              const edit_format = config.get<EditFormat>(
                'geminiCoder.editFormat'
              )!
              const edit_format_instructions = config.get<string>(
                `geminiCoder.editFormatInstructions${
                  edit_format.charAt(0).toUpperCase() + edit_format.slice(1)
                }`
              )
              if (edit_format_instructions) {
                instructions += `\n${edit_format_instructions}`
              }

              const text = `${
                context_text
                  ? `${instructions}\n<files>\n${context_text}</files>\n`
                  : ''
              }${instructions}`

              vscode.env.clipboard.writeText(text)
            } else {
              vscode.window.showWarningMessage(
                'Cannot copy prompt in code completion mode without an active editor.'
              )
              return
            }

            vscode.window.showInformationMessage('Prompt copied to clipboard!')
          } else if (message.command == 'SHOW_PRESET_PICKER') {
            const config = vscode.workspace.getConfiguration()
            const web_chat_presets = config.get<ConfigPresetFormat[]>(
              'geminiCoder.presets',
              []
            )

            // Determine which global state key to use based on mode
            const selected_preset_names_state_key = this
              ._is_code_completions_mode
              ? 'selectedCodeCompletionPresets'
              : 'selectedPresets'

            const available_preset_names = web_chat_presets
              .filter((preset) =>
                !this._is_code_completions_mode
                  ? preset
                  : !preset.promptPrefix && !preset.promptSuffix
              )
              .map((preset) => preset.name)
            let selected_preset_names = this._context.globalState.get<string[]>(
              selected_preset_names_state_key,
              []
            )
            selected_preset_names = selected_preset_names.filter((name) =>
              available_preset_names.includes(name)
            )

            // Update the global state with validated selection
            await this._context.globalState.update(
              selected_preset_names_state_key,
              selected_preset_names
            )

            const preset_quick_pick_items = web_chat_presets
              .filter((preset) =>
                !this._is_code_completions_mode
                  ? preset
                  : !preset.promptPrefix && !preset.promptSuffix
              )
              .map((preset) => ({
                label: preset.name,
                description: `${preset.chatbot}${
                  preset.model ? ` - ${preset.model}` : ''
                }`,
                picked: selected_preset_names.includes(preset.name) // Set picked state directly
              }))

            const placeholder = this._is_code_completions_mode
              ? 'Select one or more code completion presets'
              : 'Select one or more chat presets'

            const selected_presets = await vscode.window.showQuickPick(
              preset_quick_pick_items,
              {
                placeHolder: placeholder,
                canPickMany: true
              }
            )

            if (selected_presets) {
              const selected_names = selected_presets.map(
                (preset) => preset.label
              )
              await this._context.globalState.update(
                selected_preset_names_state_key,
                selected_names
              )

              if (this._is_code_completions_mode) {
                this._send_message<SelectedCodeCompletionPresetsMessage>({
                  command: 'SELECTED_CODE_COMPLETION_PRESETS',
                  names: selected_names
                })
              } else {
                this._send_message<SelectedPresetsMessage>({
                  command: 'SELECTED_PRESETS',
                  names: selected_names
                })
              }
            }
          } else if (message.command == 'GET_CODE_COMPLETIONS_MODE') {
            const has_active_editor = !!vscode.window.activeTextEditor

            if (this._is_code_completions_mode && !has_active_editor) {
              this._is_code_completions_mode = false
              this._send_message<ExtensionMessage>({
                command: 'CODE_COMPLETIONS_MODE',
                enabled: false
              })
            } else {
              this._send_message<ExtensionMessage>({
                command: 'CODE_COMPLETIONS_MODE',
                enabled: this._is_code_completions_mode
              })
            }
          } else if (message.command == 'SAVE_CODE_COMPLETIONS_MODE') {
            this._is_code_completions_mode = message.enabled
            this._calculate_token_count()
            this._send_message<ExtensionMessage>({
              command: 'CODE_COMPLETIONS_MODE',
              enabled: message.enabled
            })
          } else if (message.command == 'REQUEST_EDITOR_STATE') {
            this._send_message<ExtensionMessage>({
              command: 'EDITOR_STATE_CHANGED',
              has_active_editor: this._has_active_editor
            })
          } else if (message.command == 'REQUEST_EDITOR_SELECTION_STATE') {
            this._send_message<ExtensionMessage>({
              command: 'EDITOR_SELECTION_CHANGED',
              hasSelection: this._has_active_selection
            })
          } else if (message.command == 'GET_CURRENT_TOKEN_COUNT') {
            this._calculate_token_count()
          } else if (message.command == 'SAVE_PRESETS_ORDER') {
            const config = vscode.workspace.getConfiguration()
            // Convert UI format from message to config format before saving
            const config_formatted_presets = message.presets.map((preset) =>
              this._ui_preset_to_config_format(preset)
            )
            await config.update(
              'geminiCoder.presets',
              config_formatted_presets,
              vscode.ConfigurationTarget.Global
            )
          } else if (message.command == 'UPDATE_PRESET') {
            const config = vscode.workspace.getConfiguration()
            const current_presets =
              config.get<ConfigPresetFormat[]>('geminiCoder.presets', []) || []

            const preset_index = current_presets.findIndex(
              (p) => p.name == message.updating_preset.name
            )

            if (preset_index != -1) {
              const are_presets_equal = (a: Preset, b: Preset): boolean => {
                return (
                  a.name == b.name &&
                  a.chatbot == b.chatbot &&
                  a.prompt_prefix == b.prompt_prefix &&
                  a.prompt_suffix == b.prompt_suffix &&
                  a.model == b.model &&
                  a.temperature === b.temperature && // can be undefined and 0
                  a.top_p === b.top_p && // same
                  a.system_instructions == b.system_instructions &&
                  JSON.stringify(a.options) == JSON.stringify(b.options) &&
                  a.port == b.port
                )
              }

              const has_changes = !are_presets_equal(
                message.updating_preset,
                message.updated_preset
              )

              if (!has_changes) {
                this._send_message<ExtensionMessage>({
                  command: 'PRESET_UPDATED'
                })
                return
              }

              const save_changes_button = 'Save'
              const discard_changes = 'Discard Changes'
              const result = await vscode.window.showInformationMessage(
                'Save changes to the preset?',
                {
                  modal: true,
                  detail:
                    "If you don't save, updates to the preset will be lost."
                },
                save_changes_button,
                discard_changes
              )

              if (result == discard_changes) {
                this._send_message<ExtensionMessage>({
                  command: 'PRESET_UPDATED'
                })
                return
              }

              if (result != save_changes_button) {
                return
              }

              const updated_ui_preset = { ...message.updated_preset }
              let final_name = updated_ui_preset.name.trim()

              // --- Start uniqueness check ---
              let is_unique = false
              let copy_number = 0
              const base_name = final_name

              while (!is_unique) {
                const name_to_check =
                  copy_number == 0
                    ? base_name
                    : `${base_name} (${copy_number})`.trim()

                // Check if this name exists in *other* presets
                const conflict = current_presets.some(
                  (p, index) => index != preset_index && p.name == name_to_check
                )

                if (!conflict) {
                  final_name = name_to_check
                  is_unique = true
                } else {
                  copy_number++
                }
              }
              // --- End uniqueness check ---

              // If the name had to be changed, update the preset object
              if (final_name != updated_ui_preset.name) {
                updated_ui_preset.name = final_name
              }

              const updated_presets = [...current_presets]
              // Convert the updated preset (with potentially modified name) from UI format to config format
              updated_presets[preset_index] =
                this._ui_preset_to_config_format(updated_ui_preset)

              await config.update(
                'geminiCoder.presets',
                updated_presets,
                vscode.ConfigurationTarget.Global
              )

              // Update selected (default) presets for both modes
              const selected_chat_names = this._context.globalState.get<
                string[]
              >('selectedPresets', [])
              if (selected_chat_names.includes(message.updating_preset.name)) {
                const updated_selected_names = selected_chat_names.map((name) =>
                  name == message.updating_preset.name ? final_name : name
                )
                await this._context.globalState.update(
                  'selectedPresets',
                  updated_selected_names
                )
                // Send updated selected presets to webview
                this._send_message<SelectedPresetsMessage>({
                  command: 'SELECTED_PRESETS',
                  names: updated_selected_names
                })
              }

              // Handle selected code completion presets
              const selected_fim_names = this._context.globalState.get<
                string[]
              >('selectedCodeCompletionPresets', [])
              const was_in_selected_fim = selected_fim_names.includes(
                message.updating_preset.name
              )

              if (was_in_selected_fim) {
                // Check if preset now has prefix or suffix (making it ineligible for FIM)
                const has_affixes =
                  updated_ui_preset.prompt_prefix ||
                  updated_ui_preset.prompt_suffix

                if (has_affixes) {
                  // Remove from selected FIM presets
                  const updated_selected_fim = selected_fim_names.filter(
                    (name) => name !== message.updating_preset.name
                  )
                  await this._context.globalState.update(
                    'selectedCodeCompletionPresets',
                    updated_selected_fim
                  )
                  this._send_message<SelectedCodeCompletionPresetsMessage>({
                    command: 'SELECTED_CODE_COMPLETION_PRESETS',
                    names: updated_selected_fim
                  })
                } else if (final_name != message.updating_preset.name) {
                  // Just update the name if it changed but still no affixes
                  const updated_selected_fim = selected_fim_names.map((name) =>
                    name == message.updating_preset.name ? final_name : name
                  )
                  await this._context.globalState.update(
                    'selectedCodeCompletionPresets',
                    updated_selected_fim
                  )
                  this._send_message<SelectedCodeCompletionPresetsMessage>({
                    command: 'SELECTED_CODE_COMPLETION_PRESETS',
                    names: updated_selected_fim
                  })
                }
              }

              this._send_presets_to_webview(webview_view.webview)
              this._send_message<ExtensionMessage>({
                command: 'PRESET_UPDATED'
              })
            } else {
              console.error(
                `Preset with original name "${message.updating_preset.name}" not found.`
              )
              vscode.window.showErrorMessage(
                `Could not update preset: Original preset "${message.updating_preset.name}" not found.`
              )
            }
          } else if (message.command == 'DELETE_PRESET') {
            const preset_name = message.name
            const config = vscode.workspace.getConfiguration()
            const current_presets =
              config.get<ConfigPresetFormat[]>('geminiCoder.presets', []) || []

            // Show confirmation dialog with revert option
            const delete_button = 'Delete'
            const result = await vscode.window.showInformationMessage(
              'Please confirm',
              {
                modal: true,
                detail: `Are you sure you want to delete preset "${preset_name}"?`
              },
              delete_button
            )

            if (result != delete_button) {
              return // User cancelled
            }

            // Store the deleted preset and its index in case we need to revert
            const preset_index = current_presets.findIndex(
              (p) => p.name == preset_name
            )
            const deleted_preset = current_presets[preset_index]
            const updated_presets = current_presets.filter(
              (p) => p.name != preset_name
            )

            try {
              await config.update(
                'geminiCoder.presets',
                updated_presets,
                vscode.ConfigurationTarget.Global
              )

              // Show notification with undo option
              const button_text = 'Undo'
              const undo_result = await vscode.window.showInformationMessage(
                `Preset "${preset_name}" has been deleted.`,
                button_text
              )

              if (undo_result == button_text && deleted_preset) {
                // Restore the preset at its original position
                const restored_presets = [...updated_presets]
                restored_presets.splice(preset_index, 0, deleted_preset)

                await config.update(
                  'geminiCoder.presets',
                  restored_presets,
                  vscode.ConfigurationTarget.Global
                )
                vscode.window.showInformationMessage(
                  `Preset "${preset_name}" restored.`
                )
              }

              // Send updated list back to webview
              this._send_presets_to_webview(webview_view.webview)

              // Also update selected presets for both modes if needed
              const selected_chat_names = this._context.globalState.get<
                string[]
              >('selectedPresets', [])
              if (selected_chat_names.includes(preset_name)) {
                const updated_selected = selected_chat_names.filter(
                  (n) => n != preset_name
                )
                await this._context.globalState.update(
                  'selectedPresets',
                  updated_selected
                )
                this._send_message<SelectedPresetsMessage>({
                  command: 'SELECTED_PRESETS',
                  names: updated_selected
                })
              }

              const selected_fim_names = this._context.globalState.get<
                string[]
              >('selectedCodeCompletionPresets', [])
              if (selected_fim_names.includes(preset_name)) {
                const updated_selected = selected_fim_names.filter(
                  (n) => n != preset_name
                )
                await this._context.globalState.update(
                  'selectedCodeCompletionPresets',
                  updated_selected
                )
                this._send_message<SelectedCodeCompletionPresetsMessage>({
                  command: 'SELECTED_CODE_COMPLETION_PRESETS',
                  names: updated_selected
                })
              }
            } catch (error) {
              vscode.window.showErrorMessage(
                `Failed to delete preset: ${error}`
              )
            }
          } else if (message.command == 'DUPLICATE_PRESET') {
            const preset_name = message.name
            const config = vscode.workspace.getConfiguration()
            const current_presets =
              config.get<ConfigPresetFormat[]>('geminiCoder.presets', []) || []

            const preset_to_duplicate = current_presets.find(
              (p) => p.name == preset_name
            )
            if (!preset_to_duplicate) {
              vscode.window.showErrorMessage(
                `Preset "${preset_name}" not found`
              )
              return
            }

            // Find the index of the original preset
            const original_index = current_presets.findIndex(
              (p) => p.name == preset_name
            )

            // Generate unique name
            let new_name = `${preset_name} (1)`
            let copy_number = 1
            while (current_presets.some((p) => p.name == new_name)) {
              new_name = `${preset_name} (${copy_number++})`
            }

            // Create duplicate with new name
            const duplicated_preset = {
              ...preset_to_duplicate,
              name: new_name
            }

            // Add to presets right after the original
            const updated_presets = [...current_presets]
            updated_presets.splice(original_index + 1, 0, duplicated_preset)

            try {
              await config.update('geminiCoder.presets', updated_presets, true)
              this._send_presets_to_webview(webview_view.webview)
            } catch (error) {
              vscode.window.showErrorMessage(
                `Failed to duplicate preset: ${error}`
              )
            }
          } else if (message.command == 'CREATE_PRESET') {
            // Get current presets
            const config = vscode.workspace.getConfiguration()
            const current_presets =
              config.get<ConfigPresetFormat[]>('geminiCoder.presets', []) || []

            // Generate unique name
            let new_name = ''
            let copy_number = 0
            while (current_presets.some((p) => p.name == new_name)) {
              new_name = `(${copy_number++})`
            }

            const new_preset: ConfigPresetFormat = {
              name: new_name,
              chatbot: 'AI Studio',
              model: Object.keys(CHATBOTS['AI Studio'].models)[0],
              temperature: 0.5,
              systemInstructions:
                CHATBOTS['AI Studio'].default_system_instructions
            }

            const updated_presets = [...current_presets, new_preset]

            try {
              this._send_message<ExtensionMessage>({
                command: 'PRESET_CREATED',
                preset: this._config_preset_to_ui_format(new_preset)
              })
              config.update('geminiCoder.presets', updated_presets, true)
            } catch (error) {
              vscode.window.showErrorMessage(
                `Failed to create preset: ${error}`
              )
            }
          } else if (message.command == 'GET_GEMINI_API_KEY') {
            const api_key =
              this._api_tools_settings_manager.get_gemini_api_key()
            this._send_message<GeminiApiKeyMessage>({
              command: 'GEMINI_API_KEY',
              api_key
            })
          } else if (message.command == 'GET_OPEN_ROUTER_API_KEY') {
            const api_key =
              this._api_tools_settings_manager.get_open_router_api_key()
            this._send_message<OpenRouterApiKeyMessage>({
              command: 'OPEN_ROUTER_API_KEY',
              api_key
            })
          } else if (message.command == 'UPDATE_GEMINI_API_KEY') {
            await this._api_tools_settings_manager.set_gemini_api_key(
              message.api_key
            )
          } else if (message.command == 'UPDATE_OPEN_ROUTER_API_KEY') {
            await this._api_tools_settings_manager.set_open_router_api_key(
              message.api_key
            )
          } else if (message.command == 'GET_CUSTOM_PROVIDERS') {
            const config = vscode.workspace.getConfiguration()
            const providers = config.get<any[]>('geminiCoder.providers', [])
            this._send_message<CustomProvidersUpdatedMessage>({
              command: 'CUSTOM_PROVIDERS_UPDATED',
              custom_providers: providers
            })
          } else if (message.command == 'GET_OPEN_ROUTER_MODELS') {
            const models = await this._fetch_open_router_models()
            this._send_message<OpenRouterModelsMessage>({
              command: 'OPEN_ROUTER_MODELS',
              models
            })
          } else if (message.command == 'SHOW_OPEN_ROUTER_MODEL_PICKER') {
            const model_items = message.models.map((model) => ({
              label: model.name,
              description: model.id,
              detail: model.description
            }))

            const selected_model = await vscode.window.showQuickPick(
              model_items,
              {
                placeHolder: 'Select an OpenRouter model'
              }
            )

            if (selected_model) {
              this._send_message<OpenRouterModelSelectedMessage>({
                command: 'OPEN_ROUTER_MODEL_SELECTED',
                model_id: selected_model.description
              })
            } else {
              this._send_message<OpenRouterModelSelectedMessage>({
                command: 'OPEN_ROUTER_MODEL_SELECTED',
                model_id: undefined
              })
            }
          } else if (message.command == 'GET_CODE_COMPLETIONS_SETTINGS') {
            const settings =
              this._api_tools_settings_manager.get_code_completions_settings()
            this._send_message<ApiToolCodeCompletionsSettingsMessage>({
              command: 'CODE_COMPLETIONS_SETTINGS',
              settings
            })
          } else if (message.command == 'UPDATE_CODE_COMPLETIONS_SETTINGS') {
            this._api_tools_settings_manager.set_code_completions_settings(
              message.settings
            )
          } else if (message.command == 'GET_FILE_REFACTORING_SETTINGS') {
            const settings =
              this._api_tools_settings_manager.get_file_refactoring_settings()
            this._send_message<ApiToolFileRefactoringSettingsMessage>({
              command: 'FILE_REFACTORING_SETTINGS',
              settings
            })
          } else if (message.command == 'UPDATE_FILE_REFACTORING_SETTINGS') {
            this._api_tools_settings_manager.set_file_refactoring_settings(
              message.settings
            )
          } else if (message.command == 'GET_COMMIT_MESSAGES_SETTINGS') {
            const settings =
              this._api_tools_settings_manager.get_commit_messages_settings()
            this._send_message<ApiToolCommitMessageSettingsMessage>({
              command: 'COMMIT_MESSAGES_SETTINGS',
              settings
            })
          } else if (message.command == 'UPDATE_COMMIT_MESSAGES_SETTINGS') {
            this._api_tools_settings_manager.set_commit_messages_settings(
              message.settings
            )
          } else if (message.command == 'EXECUTE_COMMAND') {
            vscode.commands.executeCommand(message.command_id)
          } else if (message.command == 'SHOW_QUICK_PICK') {
            const items = message.items.map((item) => ({
              label: item.label,
              description: item.description
            }))

            const selected_item = await vscode.window.showQuickPick(items, {
              placeHolder: message.title
            })

            if (selected_item) {
              const selected_command = message.items.find(
                (item) => item.label == selected_item.label
              )?.command

              if (selected_command) {
                vscode.commands.executeCommand(selected_command)
              }
            }
          } else if (message.command == 'GET_EDIT_FORMAT') {
            const config = vscode.workspace.getConfiguration()
            const edit_format = config.get<EditFormat>(
              'geminiCoder.editFormat'
            )!
            this._send_message({
              command: 'EDIT_FORMAT',
              edit_format
            })
          } else if (message.command == 'SAVE_EDIT_FORMAT') {
            const config = vscode.workspace.getConfiguration()
            await config.update(
              'geminiCoder.editFormat',
              message.edit_format,
              vscode.ConfigurationTarget.Global
            )
          } else if (message.command == 'GET_EDIT_FORMAT_SELECTOR_VISIBILITY') {
            const config = vscode.workspace.getConfiguration()
            const visibility = config.get<EditFormatSelectorVisibility>(
              'geminiCoder.editFormatSelectorVisibility'
            )!
            this._send_message<EditFormatSelectorVisibilityMessage>({
              command: 'EDIT_FORMAT_SELECTOR_VISIBILITY',
              visibility
            })
          } else if (
            message.command == 'SAVE_EDIT_FORMAT_SELECTOR_VISIBILITY'
          ) {
            const config = vscode.workspace.getConfiguration()
            await config.update(
              'geminiCoder.editFormatSelectorVisibility',
              message.visibility,
              vscode.ConfigurationTarget.Global
            )
          }
        } catch (error: any) {
          console.error('Error handling message:', message, error)
          vscode.window.showErrorMessage(
            `Error handling message: ${error.message}`
          )
        }
      }
    )

    // Send initial states
    this._send_message<ExtensionMessage>({
      command: 'CONNECTION_STATUS',
      connected: this.websocket_server_instance.is_connected_with_browser()
    })

    this._send_message<ExtensionMessage>({
      command: 'EDITOR_STATE_CHANGED',
      has_active_editor: this._has_active_editor
    })
    this._send_message<ExtensionMessage>({
      command: 'EDITOR_SELECTION_CHANGED',
      hasSelection: this._has_active_selection
    })
    this._send_message<ExtensionMessage>({
      command: 'CODE_COMPLETIONS_MODE',
      enabled: this._is_code_completions_mode
    })
    this._send_message<ExtensionMessage>({
      command: 'INSTRUCTIONS',
      value: this._instructions
    })
    this._send_message<CodeCompletionSuggestionsMessage>({
      command: 'CODE_COMPLETION_SUGGESTIONS',
      value: this._code_completion_suggestions
    })

    // Added initial message for edit format selector visibility
    const config = vscode.workspace.getConfiguration()
    const initial_visibility = config.get<'visible' | 'hidden'>(
      'geminiCoder.editFormatSelectorVisibility',
      'visible'
    )
    this._send_message<EditFormatSelectorVisibilityMessage>({
      command: 'EDIT_FORMAT_SELECTOR_VISIBILITY',
      visibility: initial_visibility
    })

    this._update_active_file_info()
    this._send_presets_to_webview(webview_view.webview)
    this._send_custom_providers()

    // Send initial settings for new tools
    this._send_message<ApiToolCodeCompletionsSettingsMessage>({
      command: 'CODE_COMPLETIONS_SETTINGS',
      settings: config.get<ApiToolSettings>(
        'geminiCoder.apiToolCodeCompletionsSettings',
        {}
      )
    })
    this._send_message<ApiToolFileRefactoringSettingsMessage>({
      command: 'FILE_REFACTORING_SETTINGS',
      settings: config.get<ApiToolSettings>(
        'geminiCoder.apiToolFileRefactoringSettings',
        {}
      )
    })
    this._send_message<ApiToolCommitMessageSettingsMessage>({
      command: 'COMMIT_MESSAGES_SETTINGS',
      settings: config.get<ApiToolSettings>(
        'geminiCoder.apiToolCommitMessageSettings',
        {}
      )
    })
    this._send_message<SelectedCodeCompletionPresetsMessage>({
      command: 'SELECTED_CODE_COMPLETION_PRESETS',
      names: this._context.globalState.get<string[]>(
        'selectedCodeCompletionPresets',
        []
      )
    })
  }

  // Add this method to the ChatViewProvider class
  private _update_active_file_info() {
    if (!this._webview_view) return

    const active_editor = vscode.window.activeTextEditor
    if (active_editor) {
      const document = active_editor.document
      const text_length = document.getText().length

      this._send_message<ActiveFileInfoMessage>({
        command: 'ACTIVE_FILE_INFO_UPDATED',
        fileLength: text_length
      })
    }
  }

  private _send_presets_to_webview(_: vscode.Webview) {
    const config = vscode.workspace.getConfiguration()
    const web_chat_presets_config =
      config.get<ConfigPresetFormat[]>('geminiCoder.presets', []) || []

    // Convert from config format to UI format before sending
    const presets_for_ui: Preset[] = web_chat_presets_config.map(
      (preset_config) => this._config_preset_to_ui_format(preset_config)
    )

    this._send_message<PresetsMessage>({
      command: 'PRESETS',
      presets: presets_for_ui
    })
  }

  private _get_html_for_webview(webview: vscode.Webview) {
    const resources_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extension_uri, 'resources')
    )

    const script_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extension_uri, 'out', 'view.js')
    )

    const style_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extension_uri, 'out', 'view.css')
    )

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="${style_uri}">
        <script>
          window.resources_uri = "${resources_uri}";
        </script>
        <style>
          body {
            overflow: hidden;
          }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script src="${script_uri}"></script>
      </body>
      </html>
    `
  }

  private _send_custom_providers() {
    const config = vscode.workspace.getConfiguration()
    const providers = config.get<any[]>('geminiCoder.providers', [])
    this._send_message<CustomProvidersUpdatedMessage>({
      command: 'CUSTOM_PROVIDERS_UPDATED',
      custom_providers: providers
    })
  }

  public append_text_to_prompt(text: string) {
    if (this._is_code_completions_mode) {
      this._code_completion_suggestions =
        this._code_completion_suggestions.trim() +
        `${this._code_completion_suggestions ? ` ${text} ` : `${text} `}`

      this._context.workspaceState.update(
        'code-completion-suggestions',
        this._code_completion_suggestions
      )
      this._send_message<CodeCompletionSuggestionsMessage>({
        command: 'CODE_COMPLETION_SUGGESTIONS',
        value: this._code_completion_suggestions
      })
    } else {
      this._instructions =
        this._instructions.trim() +
        `${this._instructions ? ` ${text} ` : `${text} `}`
      this._context.workspaceState.update('instructions', this._instructions)
      this._send_message<InstructionsMessage>({
        command: 'INSTRUCTIONS',
        value: this._instructions
      })
    }
  }
}
