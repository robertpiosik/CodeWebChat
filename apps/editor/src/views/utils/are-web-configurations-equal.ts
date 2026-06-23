import { WebConfiguration } from '@shared/types/web-configuration'

export const are_web_configurations_equal = (a: WebConfiguration, b: WebConfiguration): boolean => {
  return (
    a.name == b.name &&
    a.chatbot == b.chatbot &&
    a.model == b.model &&
    a.temperature === b.temperature &&
    a.top_p === b.top_p &&
    a.thinking_budget === b.thinking_budget &&
    a.reasoning_effort == b.reasoning_effort &&
    a.system_instructions == b.system_instructions &&
    JSON.stringify(a.options) == JSON.stringify(b.options) &&
    a.port == b.port &&
    a.new_url == b.new_url &&
    a.is_pinned == b.is_pinned
  )
}
