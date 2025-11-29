import { FC } from 'react'
import { CHATBOTS } from '@shared/constants/chatbots'
import { DefaultOptions } from './DefaultOptions'
import { ChatgptOptions } from './chatbots/ChatgptOptions'
import { OptionsOverrideProps } from './types'

const options_overrides: {
  [key in keyof typeof CHATBOTS]?: FC<OptionsOverrideProps>
} = {
  ChatGPT: ChatgptOptions
}

export const Options: FC<OptionsOverrideProps> = (props) => {
  const OptionsComponent =
    (props.chatbot && options_overrides[props.chatbot]) || DefaultOptions
  return <OptionsComponent {...props} />
}