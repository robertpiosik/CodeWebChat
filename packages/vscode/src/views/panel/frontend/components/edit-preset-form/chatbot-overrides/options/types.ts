import { CHATBOTS } from '@shared/constants/chatbots'

export type OptionsOverrideProps = {
  chatbot?: keyof typeof CHATBOTS
  model?: string
  options: string[]
  new_url?: string
  on_option_toggle: (option: string) => void
}