import * as vscode from 'vscode'
import { PROVIDERS } from '@shared/constants/providers'
import { SAVED_API_PROVIDERS_STATE_KEY } from '@/constants/state-keys'

export type BuiltInProvider = {
  type: 'built-in'
  name: keyof typeof PROVIDERS
  api_key: string
}

export type CustomProvider = {
  type: 'custom'
  name: string
  base_url: string
  api_key: string
}

export type Provider = BuiltInProvider | CustomProvider

export class ApiProvidersManager {
  private _providers: Provider[] = []

  constructor(private readonly _vscode: vscode.ExtensionContext) {
    this._load_providers()
  }

  private async _load_providers() {
    const saved_providers = this._vscode.globalState
      .get<Provider[]>(SAVED_API_PROVIDERS_STATE_KEY, [])
      .filter(
        (provider) => provider.type == 'custom' || PROVIDERS[provider.name]
      ) // Make sure all built-in providers exist
    this._providers = saved_providers
  }

  public async save_providers(providers: Provider[]) {
    await this._vscode.globalState.update(
      SAVED_API_PROVIDERS_STATE_KEY,
      providers
    )
    this._providers = providers
  }

  public get_providers() {
    return this._providers
  }
}
