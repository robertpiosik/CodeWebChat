import { Progress } from './Progress'

export default {
  component: Progress
}

const sample_items = [
  {
    id: '1',
    status: 'Generating response...',
    provider_name: 'OpenAI',
    model: 'gpt-4o',
    reasoning_effort: 'high',
    tokens_per_second: 42.5,
    total_tokens: 1250
  },
  {
    id: '2',
    status: 'Thinking...',
    provider_name: 'Anthropic',
    model: 'claude-3-7-sonnet',
    reasoning_effort: 'medium',
    tokens_per_second: 18.2,
    total_tokens: 432
  }
]

export const Default = () => (
  <Progress
    progress_items={sample_items}
    on_cancel={(id) => console.log('Cancel item:', id)}
  />
)

export const SingleItem = () => (
  <Progress
    progress_items={[sample_items[0]]}
    on_cancel={(id) => console.log('Cancel item:', id)}
  />
)

export const Minimal = () => (
  <Progress
    progress_items={[
      {
        id: '3',
        status: 'Connecting...',
        provider_name: 'DeepSeek'
      }
    ]}
    on_cancel={(id) => console.log('Cancel item:', id)}
  />
)
