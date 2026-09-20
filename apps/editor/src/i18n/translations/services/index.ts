import { translations as websocket_manager } from './websocket-manager'
import { translations as prompt_view_api_calls_manager } from './prompt-view-api-calls-manager'

export const translations = {
  ...websocket_manager,
  ...prompt_view_api_calls_manager
}
