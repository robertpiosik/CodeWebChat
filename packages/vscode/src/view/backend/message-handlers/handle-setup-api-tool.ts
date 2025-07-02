import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import {
  ApiProvidersManager,
  Provider,
  ToolConfig
} from '@/services/api-providers-manager'
import { ModelFetcher } from '@/services/model-fetcher'
import { PROVIDERS } from '@shared/constants/providers'
import { COMMIT_MESSAGES_CONFIRMATION_THRESHOLD_STATE_KEY } from '@/constants/state-keys'

type SupportedTool = 'commit-messages' | 'some-other-introduced-later'

const DEFAULT_TEMPERATURE: { [key in SupportedTool]: number } = {
  'commit-messages': 0.3,
  'some-other-introduced-later': 0.3
}

const DEFAULT_CONFIRMATION_THRESHOLD = 20000

export const handle_setup_api_tool = async (params: {
  provider: ViewProvider
  tool: SupportedTool
}): Promise<void> => {
  const providers_manager = new ApiProvidersManager(params.provider.context)
  const model_fetcher = new ModelFetcher()

  const current_config =
    await providers_manager.get_commit_messages_tool_config()

  if (!current_config) {
    await setup_new_config()
  } else {
    await update_existing_config(current_config)
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
      await params.provider.context.globalState.update(
        COMMIT_MESSAGES_CONFIRMATION_THRESHOLD_STATE_KEY,
        DEFAULT_CONFIRMATION_THRESHOLD
      )
    }

    vscode.window.showInformationMessage(
      'Commit Messages tool configuration completed successfully.'
    )
  }

  async function update_existing_config(config: ToolConfig) {
    const api_provider_label = 'API Provider'
    const model_label = 'Model'
    const temperature_label = 'Temperature'
    const edit_instructions_label = 'Instructions'
    const confirmation_threshold_label = 'Ask for confirmation above'

    const show_config_options = async () => {
      const current_threshold = params.provider.context.globalState.get<number>(
        COMMIT_MESSAGES_CONFIRMATION_THRESHOLD_STATE_KEY,
        DEFAULT_CONFIRMATION_THRESHOLD
      )

      const options: vscode.QuickPickItem[] = [
        { label: api_provider_label, description: config.provider_name },
        { label: model_label, description: config.model },
        {
          label: temperature_label,
          description: `${config.temperature.toString()}${
            config.temperature == DEFAULT_TEMPERATURE[params.tool]
              ? ' (default)'
              : ''
          }`
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

      if (!selection) return

      let updated = false

      if (selection.label == api_provider_label) {
        const provider_info = await select_provider()
        if (!provider_info) {
          await show_config_options()
          return
        }

        const model = await select_model(provider_info)
        if (!model) {
          await show_config_options()
          return
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
          await show_config_options()
          return
        }
        config.model = new_model
        config.temperature = DEFAULT_TEMPERATURE[params.tool]
        updated = true
      } else if (selection.label == temperature_label) {
        const new_temperature = await set_temperature(config.temperature)
        if (new_temperature === undefined) {
          await show_config_options()
          return
        }
        config.temperature = new_temperature
        updated = true
      } else if (selection.label == edit_instructions_label) {
        await vscode.commands.executeCommand(
          'workbench.action.openSettings',
          'codeWebChat.commitMessageInstructions'
        )
        return
      } else if (selection.label == confirmation_threshold_label) {
        const new_threshold = await set_confirmation_threshold(
          current_threshold
        )
        if (new_threshold !== undefined) {
          await params.provider.context.globalState.update(
            COMMIT_MESSAGES_CONFIRMATION_THRESHOLD_STATE_KEY,
            new_threshold
          )
        }
      }

      if (updated) {
        await providers_manager.save_commit_messages_tool_config(config)
      }
      await show_config_options()
    }
    await show_config_options()
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
      placeHolder: '',
      validateInput: (value) => {
        const num = Number(value)
        if (isNaN(num)) return 'Please enter a valid number'
        if (num < 0 || num > 1) return 'Temperature must be between 0 and 1'
        return null
      }
    })

    if (temperature_input === undefined || temperature_input == '') {
      return DEFAULT_TEMPERATURE[params.tool]
    }

    return Number(temperature_input)
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
