import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'
import { WebSocketManager } from '@/services/websocket-manager'
import { Presets } from '../../../ui/src/components/editor/Presets'
import { code_completion_instruction_external } from '@/constants/instructions'
import {
  WebviewMessage,
  ExtensionMessage,
  PresetsMessage,
  TokenCountMessage,
  SelectionTextMessage,
  ActiveFileInfoMessage,
  SaveFimModeMessage,
  UpdatePresetMessage,
  DeletePresetMessage,
  SelectedPresetsMessage,
  DuplicatePresetMessage,
  CreatePresetMessage,
  ApiKeyUpdatedMessage,
  UpdateApiKeyMessage,
  DefaultModelsUpdatedMessage,
  UpdateDefaultModelMessage,
  CustomProvidersUpdatedMessage
} from './types/messages'
import { WebsitesProvider } from '../context/providers/websites-provider'
import { OpenEditorsProvider } from '@/context/providers/open-editors-provider'
import { WorkspaceProvider } from '@/context/providers/workspace-provider'
import { apply_preset_affixes_to_instruction } from '../helpers/apply-preset-affixes'
import { token_count_emitter } from '@/context/context-initialization'
import { Preset } from '@shared/types/preset'
import { CHATBOTS } from '@shared/constants/chatbots'
import { ModelManager } from '@/services/model-manager'

type ConfigPresetFormat = {
  name: string
  chatbot: keyof typeof CHATBOTS
  promptPrefix?: string
  promptSuffix?: string
  model?: string
  temperature?: number
  systemInstructions?: string
  options?: string[]
  port?: number
}

export class ViewProvider implements vscode.WebviewViewProvider {
  private _webview_view: vscode.WebviewView | undefined
  private _config_listener: vscode.Disposable | undefined
  private _has_active_editor: boolean = false
  private _has_active_selection: boolean = false
  private _is_fim_mode: boolean = false
  private _model_manager: ModelManager

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

    this._config_listener = vscode.workspace.onDidChangeConfiguration(
      (event) => {
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
          const config = vscode.workspace.getConfiguration()
          const providers = config.get<any[]>('geminiCoder.providers', [])
          this._send_message<CustomProvidersUpdatedMessage>({
            command: 'CUSTOM_PROVIDERS_UPDATED',
            custom_providers: providers
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
    this._model_manager = new ModelManager(this._context)

    const update_editor_state = () => {
      const has_active_editor = !!vscode.window.activeTextEditor
      if (has_active_editor != this._has_active_editor) {
        this._has_active_editor = has_active_editor
        if (this._webview_view) {
          this._send_message<ExtensionMessage>({
            command: 'EDITOR_STATE_CHANGED',
            hasActiveEditor: has_active_editor
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
        if (this._is_fim_mode && this._webview_view) {
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
      ...(this._is_fim_mode && active_path ? { exclude_path: active_path } : {})
    }

    files_collector
      .collect_files(options)
      .then((context_text) => {
        let current_token_count = Math.floor(context_text.length / 4)

        if (active_editor && this._is_fim_mode) {
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
      | DuplicatePresetMessage
      | CreatePresetMessage
      | ApiKeyUpdatedMessage
      | DefaultModelsUpdatedMessage
      | CustomProvidersUpdatedMessage
  >(message: T) {
    if (this._webview_view) {
      this._webview_view.webview.postMessage(message)
    }
  }

  // Helper method to replace @selection with selected text
  private _replace_selection_placeholder(instruction: string): string {
    if (!instruction.includes('@selection')) {
      return instruction
    }

    const active_editor = vscode.window.activeTextEditor
    if (!active_editor || active_editor.selection.isEmpty) {
      // If no selection, just return the original instruction
      vscode.window.showInformationMessage(
        'No text selected for @selection placeholder.'
      )
      return instruction.replace(/@selection/g, '')
    }

    const selected_text = active_editor.document.getText(
      active_editor.selection
    )

    // Check if the selected text is a single line
    const is_single_line = !selected_text.includes('\n')

    if (is_single_line) {
      // For single-line text, wrap with single backticks
      return instruction.replace(/@selection/g, `\`${selected_text}\``)
    } else {
      // For multi-line text, wrap with triple backticks as before
      return instruction.replace(
        /@selection/g,
        `\n\`\`\`\n${selected_text}\n\`\`\`\n`
      )
    }
  }

  // Inside ChatViewProvider class, add this new helper method
  private async _validate_presets(preset_names: string[]): Promise<string[]> {
    // Get current presets from configuration
    const config = vscode.workspace.getConfiguration()
    const web_chat_presets = config.get<any[]>('geminiCoder.presets', [])
    const available_preset_names = web_chat_presets.map((preset) => preset.name)

    // Filter out any presets that no longer exist
    const valid_presets = preset_names.filter((name) =>
      available_preset_names.includes(name)
    )

    // If no valid presets, show the picker
    if (valid_presets.length == 0) {
      const preset_quick_pick_items = web_chat_presets.map((preset) => ({
        label: preset.name,
        description: `${preset.chatbot}${
          preset.model ? ` - ${preset.model}` : ''
        }`,
        picked: false
      }))

      const selected_presets = await vscode.window.showQuickPick(
        preset_quick_pick_items,
        {
          placeHolder: 'Select one or more chat presets',
          canPickMany: true
        }
      )

      if (selected_presets && selected_presets.length > 0) {
        const selected_names = selected_presets.map((preset) => preset.label)
        await this._context.globalState.update(
          'selectedPresets',
          selected_names
        )
        this._send_message<ExtensionMessage>({
          command: 'PRESETS_SELECTED_FROM_PICKER',
          names: selected_names
        })
        return selected_names
      }
      return []
    }

    return valid_presets
  }

  private async handle_fim_mode(message: WebviewMessage) {
    if (message.command == 'GET_FIM_MODE') {
      const has_active_editor = !!vscode.window.activeTextEditor

      if (this._is_fim_mode && !has_active_editor) {
        this._is_fim_mode = false
        this._send_message<ExtensionMessage>({
          command: 'FIM_MODE',
          enabled: false
        })
      } else {
        this._send_message<ExtensionMessage>({
          command: 'FIM_MODE',
          enabled: this._is_fim_mode
        })
      }
    } else if (message.command == 'SAVE_FIM_MODE') {
      this._is_fim_mode = (message as SaveFimModeMessage).enabled
      this._calculate_token_count()
    }
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
      systemInstructions: preset.system_instructions,
      options: preset.options,
      port: preset.port
    }
  }

  // Helper function to convert Config Preset format to UI format (already used in _send_presets_to_webview)
  private _config_preset_to_ui_format(
    configPreset: ConfigPresetFormat
  ): Preset {
    return {
      name: configPreset.name,
      chatbot: configPreset.chatbot,
      prompt_prefix: configPreset.promptPrefix || '',
      prompt_suffix: configPreset.promptSuffix || '',
      model: configPreset.model,
      temperature: configPreset.temperature,
      system_instructions: configPreset.systemInstructions || '',
      options: configPreset.options,
      port: configPreset.port
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
          if (message.command == 'GET_CHAT_HISTORY') {
            const history = this._context.workspaceState.get<string[]>(
              'chat-history',
              []
            )
            this._send_message<ExtensionMessage>({
              command: 'CHAT_HISTORY',
              messages: history
            })
          } else if (message.command == 'GET_FIM_CHAT_HISTORY') {
            const history = this._context.workspaceState.get<string[]>(
              'fim-chat-history',
              []
            )
            this._send_message<ExtensionMessage>({
              command: 'FIM_CHAT_HISTORY',
              messages: history
            })
          } else if (message.command == 'SAVE_CHAT_HISTORY') {
            const key = message.is_fim_mode
              ? 'fim-chat-history'
              : 'chat-history'
            await this._context.workspaceState.update(key, message.messages)
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
            this._send_message<ExtensionMessage>({
              command: 'SELECTED_PRESETS',
              names: selected_names
            })
          } else if (message.command == 'SAVE_SELECTED_PRESETS') {
            await this._context.globalState.update(
              'selectedPresets',
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

            if (this._is_fim_mode && active_editor) {
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

              // relative path
              const workspace_folder =
                vscode.workspace.workspaceFolders?.[0].uri.fsPath
              const relative_path = active_path!.replace(
                workspace_folder + '/',
                ''
              )

              const text = `<files>\n${context_text}<file name="${relative_path}">\n<![CDATA[\n${text_before_cursor}<fill missing code>${text_after_cursor}\n]]>\n</file>\n</files>\n${code_completion_instruction_external}${
                message.instruction
                  ? ` Follow suggestions: ${message.instruction}`
                  : ''
              }`

              this.websocket_server_instance.initialize_chats(
                text,
                valid_preset_names
              )
            } else if (!this._is_fim_mode) {
              const context_text = await files_collector.collect_files({
                active_path
              })

              // Replace @selection with selected text if present
              const instruction = this._replace_selection_placeholder(
                message.instruction
              )

              // Apply prefixes and suffixes to the instruction
              const modified_instruction = apply_preset_affixes_to_instruction(
                instruction,
                valid_preset_names
              )

              const text = `${
                context_text ? `<files>\n${context_text}</files>\n` : ''
              }${modified_instruction}`

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
          } else if (message.command == 'COPY_PROMPT') {
            const files_collector = new FilesCollector(
              this._workspace_provider,
              this._open_editors_provider,
              this._websites_provider
            )

            const active_editor = vscode.window.activeTextEditor

            if (this._is_fim_mode && active_editor) {
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

              // relative path
              const workspace_folder =
                vscode.workspace.workspaceFolders?.[0].uri.fsPath
              const relative_path = active_path.replace(
                workspace_folder + '/',
                ''
              )

              const text = `<files>\n${context_text}<file name="${relative_path}"><![CDATA[${text_before_cursor}<fill missing code>${text_after_cursor}]]>\n</file>\n</files>\n${code_completion_instruction_external}${
                message.instruction
                  ? ` Follow suggestions: ${message.instruction}`
                  : ''
              }`

              await vscode.env.clipboard.writeText(text)
            } else if (!this._is_fim_mode) {
              const active_path = active_editor?.document.uri.fsPath
              const context_text = await files_collector.collect_files({
                active_path
              })

              // Replace @selection with selected text if present
              const instruction = this._replace_selection_placeholder(
                message.instruction
              )

              const text = `${
                context_text ? `<files>\n${context_text}</files>\n` : ''
              }${instruction}`
              await vscode.env.clipboard.writeText(text)
            }

            vscode.window.showInformationMessage('Prompt copied to clipboard!')
          } else if (message.command == 'SHOW_ERROR') {
            vscode.window.showErrorMessage(message.message)
          } else if (message.command == 'SHOW_PRESET_PICKER') {
            const config = vscode.workspace.getConfiguration()
            const web_chat_presets = config.get<any[]>(
              'geminiCoder.presets',
              []
            )

            // First validate the current selection against available presets
            const available_preset_names = web_chat_presets.map(
              (preset) => preset.name
            )
            let selected_preset_names = this._context.globalState.get<string[]>(
              'selectedPresets',
              []
            )
            selected_preset_names = selected_preset_names.filter((name) =>
              available_preset_names.includes(name)
            )

            // Update the global state with validated selection
            await this._context.globalState.update(
              'selectedPresets',
              selected_preset_names
            )

            const preset_quick_pick_items = web_chat_presets.map((preset) => ({
              label: preset.name,
              description: `${preset.chatbot}${
                preset.model ? ` - ${preset.model}` : ''
              }`,
              picked: selected_preset_names.includes(preset.name) // Set picked state directly
            }))

            const selected_presets = await vscode.window.showQuickPick(
              preset_quick_pick_items,
              {
                placeHolder: 'Select one or more chat presets',
                canPickMany: true
              }
            )

            if (selected_presets && selected_presets.length > 0) {
              const selected_names = selected_presets.map(
                (preset) => preset.label
              )
              await this._context.globalState.update(
                'selectedPresets',
                selected_names
              )
              this._send_message<ExtensionMessage>({
                command: 'PRESETS_SELECTED_FROM_PICKER',
                names: selected_names
              })
            }
          } else if (message.command == 'OPEN_SETTINGS') {
            await vscode.commands.executeCommand(
              'workbench.action.openSettings',
              'geminiCoder.presets'
            )
          } else if (
            message.command == 'GET_FIM_MODE' ||
            message.command == 'SAVE_FIM_MODE'
          ) {
            await this.handle_fim_mode(message)
          } else if (message.command == 'REQUEST_EDITOR_STATE') {
            this._send_message<ExtensionMessage>({
              command: 'EDITOR_STATE_CHANGED',
              hasActiveEditor: this._has_active_editor
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
            const config_formatted_presets = message.presets.map(
              (preset) =>
                this._ui_preset_to_config_format(preset as Presets.Preset) // Assuming message.presets matches UI format
            )
            await config.update(
              'geminiCoder.presets',
              config_formatted_presets,
              true // Update globally
            )
          } else if (message.command == 'UPDATE_PRESET') {
            const update_msg = message as UpdatePresetMessage
            const config = vscode.workspace.getConfiguration()
            const current_presets =
              config.get<ConfigPresetFormat[]>('geminiCoder.presets', []) || []

            const preset_index = current_presets.findIndex(
              (p) => p.name == update_msg.original_name
            )

            if (preset_index != -1) {
              const updated_ui_preset = { ...update_msg.updated_preset }
              let final_name = updated_ui_preset.name.trim()

              // --- Start Uniqueness Check ---
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
              // --- End Uniqueness Check ---

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
                true // Update globally
              )

              // Update selected (default) presets
              const selected_names = this._context.globalState.get<string[]>(
                'selectedPresets',
                []
              )
              if (selected_names.includes(update_msg.original_name)) {
                const updated_selected_names = selected_names.map((name) =>
                  name == update_msg.original_name ? final_name : name
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

              this._send_presets_to_webview(webview_view.webview)
              this._send_message<ExtensionMessage>({
                command: 'PRESET_UPDATED'
              })
            } else {
              console.error(
                `Preset with original name "${update_msg.original_name}" not found.`
              )
              vscode.window.showErrorMessage(
                `Could not update preset: Original preset "${update_msg.original_name}" not found.`
              )
            }
          } else if (message.command == 'DELETE_PRESET') {
            const presetName = (message as DeletePresetMessage).name
            const config = vscode.workspace.getConfiguration()
            const current_presets =
              config.get<ConfigPresetFormat[]>('geminiCoder.presets', []) || []

            // Show confirmation dialog with revert option
            const delete_button = 'Delete'
            const result = await vscode.window.showInformationMessage(
              `Are you sure you want to delete the preset "${presetName}"?`,
              { modal: true },
              delete_button
            )

            if (result != delete_button) {
              return // User cancelled
            }

            // Store the deleted preset and its index in case we need to revert
            const preset_index = current_presets.findIndex(
              (p) => p.name == presetName
            )
            const deleted_preset = current_presets[preset_index]
            const updated_presets = current_presets.filter(
              (p) => p.name != presetName
            )

            try {
              await config.update(
                'geminiCoder.presets',
                updated_presets,
                true // Update globally
              )

              // Show notification with undo option
              const button_text = 'Undo'
              const undo_result = await vscode.window.showInformationMessage(
                `Preset "${presetName}" deleted`,
                button_text
              )

              if (undo_result == button_text && deleted_preset) {
                // Restore the preset at its original position
                const restored_presets = [...updated_presets]
                restored_presets.splice(preset_index, 0, deleted_preset)

                await config.update(
                  'geminiCoder.presets',
                  restored_presets,
                  true
                )
                vscode.window.showInformationMessage(
                  `Preset "${presetName}" restored`
                )
              }

              // Send updated list back to webview
              this._send_presets_to_webview(webview_view.webview)

              // Also update selected presets if needed
              const selected_names = this._context.globalState.get<string[]>(
                'selectedPresets',
                []
              )
              if (selected_names.includes(presetName)) {
                const updated_selected = selected_names.filter(
                  (n) => n != presetName
                )
                await this._context.globalState.update(
                  'selectedPresets',
                  updated_selected
                )
                this._send_message<ExtensionMessage>({
                  command: 'SELECTED_PRESETS',
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
              promptPrefix: '',
              promptSuffix: '',
              model: undefined,
              temperature: undefined,
              systemInstructions: '',
              options: undefined,
              port: undefined
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
          } else if (message.command == 'GET_API_KEY') {
            const config = vscode.workspace.getConfiguration()
            const api_key = config.get<string>('geminiCoder.apiKey', '')
            this._send_message<ApiKeyUpdatedMessage>({
              command: 'API_KEY_UPDATED',
              api_key
            })
          } else if (message.command == 'UPDATE_API_KEY') {
            const update_msg = message as UpdateApiKeyMessage
            const config = vscode.workspace.getConfiguration()
            await config.update('geminiCoder.apiKey', update_msg.api_key, true)
            this._send_message<ApiKeyUpdatedMessage>({
              command: 'API_KEY_UPDATED',
              api_key: update_msg.api_key
            })
          } else if (message.command == 'GET_DEFAULT_MODELS') {
            this._send_default_models()
          } else if (message.command == 'UPDATE_DEFAULT_MODEL') {
            const update_msg = message as UpdateDefaultModelMessage
            switch (update_msg.model_type) {
              case 'code_completion':
                this._model_manager.set_default_code_completion_model(
                  update_msg.model
                )
                break
              case 'refactoring':
                this._model_manager.set_default_refactoring_model(
                  update_msg.model
                )
                break
              case 'apply_changes':
                this._model_manager.set_default_apply_changes_model(
                  update_msg.model
                )
                break
              case 'commit_message':
                this._model_manager.set_default_commit_message_model(
                  update_msg.model
                )
                break
            }
            this._send_default_models()
          } else if (message.command == 'GET_CUSTOM_PROVIDERS') {
            const config = vscode.workspace.getConfiguration()
            const providers = config.get<any[]>('geminiCoder.providers', [])
            this._send_message<CustomProvidersUpdatedMessage>({
              command: 'CUSTOM_PROVIDERS_UPDATED',
              custom_providers: providers
            })
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
      hasActiveEditor: this._has_active_editor
    })
    this._send_message<ExtensionMessage>({
      command: 'EDITOR_SELECTION_CHANGED',
      hasSelection: this._has_active_selection
    })
    this._send_message<ExtensionMessage>({
      command: 'FIM_MODE',
      enabled: this._is_fim_mode
    })

    this._update_active_file_info()
    this._send_presets_to_webview(webview_view.webview)
    this._send_default_models()
    this._send_custom_providers()
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

  private _send_default_models() {
    this._send_message<DefaultModelsUpdatedMessage>({
      command: 'DEFAULT_MODELS_UPDATED',
      default_code_completion_model:
        this._model_manager.get_default_fim_model(),
      default_refactoring_model:
        this._model_manager.get_default_refactoring_model(),
      default_apply_changes_model:
        this._model_manager.get_default_apply_changes_model(),
      default_commit_message_model:
        this._model_manager.get_default_commit_message_model()
    })
  }

  private _send_custom_providers() {
    const config = vscode.workspace.getConfiguration()
    const providers = config.get<any[]>('geminiCoder.providers', [])
    this._send_message<CustomProvidersUpdatedMessage>({
      command: 'CUSTOM_PROVIDERS_UPDATED',
      custom_providers: providers
    })
  }
}
