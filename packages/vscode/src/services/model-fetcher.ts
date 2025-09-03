import { Logger } from '@/utils/logger'
import { PROVIDERS } from '@shared/constants/providers'
import axios from 'axios'

export const MODELS_ROUTE_NOT_FOUND_ERROR = '/models route not found'

type Model = {
  id: string
  name?: string
  description?: string
}

type ProviderModels = {
  [base_url: string]: Model[]
}

type ApiResponse = {
  data: {
    id: string
    name?: string
    description?: string
  }[]
}

export class ModelFetcher {
  private _fetched_providers: ProviderModels = {}

  public async get_models(params: {
    base_url: string
    api_key?: string
  }): Promise<Model[]> {
    if (this._fetched_providers[params.base_url]) {
      return this._fetched_providers[params.base_url]
    }

    try {
      const response = await axios.get<ApiResponse>(
        `${params.base_url}/models`,
        {
          headers: {
            ['Content-Type']: 'application/json',
            Authorization: params.api_key ? `Bearer ${params.api_key}` : ''
          }
        }
      )

      const models: Model[] = response.data.data
        .map((item) => {
          if (params.base_url == PROVIDERS['Google'].base_url) {
            return {
              id: item.id.split('/')[1],
              description: item.description
            }
          } else {
            return {
              id: item.id,
              name: item.name,
              description: item.description
            }
          }
        })
        .sort((a, b) => a.id.localeCompare(b.id))

      this._fetched_providers[params.base_url] = models

      return models
    } catch (error) {
      Logger.error({
        function_name: 'get_models',
        message: 'Failed to fetch models',
        data: error
      })
      if (axios.isAxiosError(error)) {
        if (error.response?.status == 404) {
          throw new Error(MODELS_ROUTE_NOT_FOUND_ERROR)
        } else if (
          error.response?.status &&
          error.response?.status >= 400 &&
          error.response?.status < 500
        ) {
          throw new Error('Invalid API key')
        } else if (error.response?.status && error.response.status >= 500) {
          throw new Error('Server error')
        } else if (error.request) {
          throw new Error('Network error')
        }
      }
      throw error
    }
  }
}
