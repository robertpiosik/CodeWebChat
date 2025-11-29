import { useEffect } from 'react'

type Props = {
  chatbot?: string
  new_url?: string
  set_options: React.Dispatch<React.SetStateAction<string[]>>
}

export const useChatgpt = ({ chatbot, new_url, set_options }: Props) => {
  useEffect(() => {
    if (chatbot == 'ChatGPT' && new_url) {
      set_options((prev) =>
        prev.filter((o) => o != 'temporary' && o != 'thinking')
      )
    }
  }, [chatbot, new_url, set_options])
}