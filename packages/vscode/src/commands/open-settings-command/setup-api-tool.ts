import * as vscode from 'vscode'
import {
  ApiProvidersManager,
  Provider,
  ReasoningEffort,
  ToolConfig
} from '@/services/api-providers-manager'
import { ModelFetcher } from '@/services/model-fetcher'
import { PROVIDERS } from '@shared/constants/providers'
import { COMMIT_MESSAGES_CONFIRMATION_THRESHOLD_STATE_KEY } from '@/constants/state-keys'
import { DEFAULT_TEMPERATURE, SupportedTool } from '@shared/constants/api-tools'

const DEFAULT_CONFIRMATION_THRESHOLD = 20000

const BACK_LABEL = '$(arrow-left) Back'

export const setup_api_tool = async (params: {
  context: vscode.ExtensionContext
  tool: SupportedTool
}): Promise<boolean> => {
  const providers_manager = new ApiProvidersManager(params.context)
  const model_fetcher = new ModelFetcher()

  const current_config =
    await providers_manager.get_commit_messages_tool_config()

  if (!current_config) {
    await setup_new_config()
    return false
  } else {
    return await update_existing_config(current_config)
  }

  async function setup_new_config() {
    const provider_info = await select_provider()
    if (!provider_info) return

    const model = await select_model(provider_info)
    if (!model) return

    const config: ToolConfig = {
      provider_type: provider_info.type,
      provider_name: provider_info.name,
      model,
      temperature: DEFAULT_TEMPERATURE[params.tool]
    }

    await providers_manager.save_commit_messages_tool_config(config)

    if (params.tool == 'commit-messages') {
      await params.context.globalState.update(
        COMMIT_MESSAGES_CONFIRMATION_THRESHOLD_STATE_KEY,
        DEFAULT_CONFIRMATION_THRESHOLD
      )
    }

    vscode.window.showInformationMessage(
      'Commit Messages tool configuration completed successfully.'
    )
  }

  async function update_existing_config(config: ToolConfig): Promise<boolean> {
    const api_provider_label = 'API provider'
    const model_label = 'Model'
    const temperature_label = 'Temperature'
    const reasoning_effort_label = 'Reasoning effort'
    const edit_instructions_label = 'Instructions'
    const confirmation_threshold_label = 'Ask for confirmation above'

    let show_menu = true
    while (show_menu) {
      const current_threshold = params.context.globalState.get<number>(
        COMMIT_MESSAGES_CONFIRMATION_THRESHOLD_STATE_KEY,
        DEFAULT_CONFIRMATION_THRESHOLD
      )

      const options: vscode.QuickPickItem[] = [
        { label: BACK_LABEL },
        { label: api_provider_label, description: config.provider_name },
        { label: model_label, description: config.model },
        {
          label: temperature_label,
          description: `${config.temperature.toString()}${
            config.temperature == DEFAULT_TEMPERATURE[params.tool]
              ? ' (default)'
              : ''
          }`
        },
        {
          label: reasoning_effort_label,
          description: config.reasoning_effort
            ? config.reasoning_effort
            : 'Not set / Auto'
        }
      ]

      if (params.tool == 'commit-messages') {
        const current_prompt = vscode.workspace
          .getConfiguration('codeWebChat')
          .get<string>('commitMessageInstructions', '')

        options.push({
          label: edit_instructions_label,
          detail: current_prompt
        })

        options.push({
          label: confirmation_threshold_label,
          description: `${current_threshold.toString()} tokens${
            current_threshold == DEFAULT_CONFIRMATION_THRESHOLD
              ? ' (default)'
              : ''
          }`
        })
      }

      const selection = await vscode.window.showQuickPick(options, {
        title: 'Update Commit Messages Configuration',
        placeHolder: 'Select setting to update'
      })

      if (!selection || selection.label === BACK_LABEL) {
        show_menu = false
        continue
      }

      let updated = false

      if (selection.label == api_provider_label) {
        const provider_info = await select_provider()
        if (!provider_info) {
          continue
        }

        const model = await select_model(provider_info)
        if (!model) {
          continue
        }

        config = {
          ...config,
          provider_type: provider_info.type,
          provider_name: provider_info.name,
          model,
          temperature: DEFAULT_TEMPERATURE[params.tool]
        }
        updated = true
      } else if (selection.label == model_label) {
        const provider_info: {
          type: Provider['type']
          name: Provider['name']
        } = {
          type: config.provider_type as any,
          name: config.provider_name
        }
        const new_model = await select_model(provider_info)
        if (!new_model) {
          continue
        }
        config.model = new_model
        config.temperature = DEFAULT_TEMPERATURE[params.tool]
        updated = true
      } else if (selection.label == temperature_label) {
        const new_temperature = await set_temperature(config.temperature)
        if (new_temperature === undefined) {
          continue
        }
        config.temperature = new_temperature
        updated = true
      } else if (selection.label == reasoning_effort_label) {
        const new_reasoning_effort = await select_reasoning_effort(
          config.reasoning_effort
        )
        if (new_reasoning_effort.cancelled) {
          continue
        }
        config.reasoning_effort = new_reasoning_effort.value
        updated = true
      } else if (selection.label == edit_instructions_label) {
        await vscode.commands.executeCommand(
          'workbench.action.openSettings',
          'codeWebChat.commitMessageInstructions'
        )
        return true
      } else if (selection.label == confirmation_threshold_label) {
        const new_threshold = await set_confirmation_threshold(
          current_threshold
        )
        if (new_threshold !== undefined) {
          await params.context.globalState.update(
            COMMIT_MESSAGES_CONFIRMATION_THRESHOLD_STATE_KEY,
            new_threshold
          )
        }
      }

      if (updated) {
        await providers_manager.save_commit_messages_tool_config(config)
      }
    }
    return false
  }

  async function select_provider(): Promise<
    Pick<Provider, 'type' | 'name'> | undefined
  > {
    const providers = await providers_manager.get_providers()

    if (providers.length == 0) {
      vscode.window.showErrorMessage(
        'No API providers found. Please configure an API provider first.'
      )
      return undefined
    }

    const provider_items = providers.map((p) => ({
      label: p.name,
      description: p.type == 'built-in' ? 'Built-in' : 'Custom',
      provider: p
    }))

    const selected = await vscode.window.showQuickPick(provider_items, {
      title: 'Select API Provider',
      placeHolder: 'Choose an API provider'
    })

    if (!selected) return undefined

    return {
      type: selected.provider.type,
      name: selected.provider.name
    }
  }

  async function select_model(
    provider_info: Pick<Provider, 'type' | 'name'>
  ): Promise<string | undefined> {
    try {
      const provider = await providers_manager.get_provider(provider_info.name)
      if (!provider) {
        throw new Error(`Provider ${provider_info.name} not found`)
      }

      const base_url =
        provider.type == 'built-in'
          ? PROVIDERS[provider.name].base_url
          : provider.base_url

      if (!base_url) {
        throw new Error(`Base URL not found for provider ${provider_info.name}`)
      }

      const models = await model_fetcher.get_models({
        base_url,
        api_key: provider.api_key
      })

      if (!models.length) {
        vscode.window.showWarningMessage(
          `No models found for ${provider_info.name}.`
        )
      }

      const model_items = models.map((model) => ({
        label: model.name || model.id,
        description: model.name ? model.id : undefined,
        detail: model.description
      }))

      const selected = await vscode.window.showQuickPick(model_items, {
        title: 'Select Model',
        placeHolder: 'Choose an AI model'
      })

      return selected?.description || selected?.label
    } catch (error) {
      console.error('Error fetching models:', error)
      vscode.window.showErrorMessage(
        `Failed to fetch models: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  async function set_temperature(
    temperature: number
  ): Promise<number | undefined> {
    const temperature_input = await vscode.window.showInputBox({
      title: 'Set Temperature',
      prompt: 'Enter a value between 0 and 1',
      value: temperature.toString(),
      placeHolder: 'Leave empty to restore default',
      validateInput: (value) => {
        if (value == '') return null // Allow empty to restore default
        const num = Number(value)
        if (isNaN(num)) return 'Please enter a valid number'
        if (num < 0 || num > 1) return 'Temperature must be between 0 and 1'
        return null
      }
    })

    if (temperature_input === undefined) {
      return undefined
    }

    if (temperature_input == '') {
      return DEFAULT_TEMPERATURE[params.tool]
    }

    return Number(temperature_input)
  }

  async function select_reasoning_effort(
    current_effort: ReasoningEffort | undefined
  ): Promise<{ value: ReasoningEffort | undefined; cancelled: boolean }> {
    const effort_levels: (ReasoningEffort | undefined)[] = [
      undefined,
      'none',
      'low',
      'medium',
      'high'
    ]
    const items = effort_levels.map((level) => {
      const is_current = current_effort !== undefined && level == current_effort

      return {
        label:
          level === undefined
            ? 'Unset'
            : level.charAt(0).toUpperCase() + level.slice(1),
        description: is_current ? 'Current' : '',
        effort: level
      }
    })

    const selected = await vscode.window.showQuickPick(items, {
      title: 'Select Reasoning Effort',
      placeHolder: 'Choose a reasoning effort level'
    })

    if (!selected) {
      return { value: current_effort, cancelled: true }
    }

    return { value: selected.effort, cancelled: false }
  }

  async function set_confirmation_threshold(
    current_threshold: number
  ): Promise<number | undefined> {
    const threshold_input = await vscode.window.showInputBox({
      title: 'Set Confirmation Threshold',
      prompt: 'Enter token count above which to show affected fiels picker',
      value: current_threshold.toString(),
      validateInput: (value) => {
        // Allow empty value to restore default
        if (value == '') return null

        const num = Number(value)
        if (isNaN(num)) return 'Please enter a valid number'
        if (num < 0) return 'Threshold must be 0 or greater'
        if (num > 1000000) return 'Threshold seems too large'
        return null
      }
    })

    if (threshold_input === undefined) {
      return undefined
    }

    // If input is empty, return default threshold
    if (threshold_input === '') {
      return DEFAULT_CONFIRMATION_THRESHOLD
    }

    return Number(threshold_input)
  }
}
