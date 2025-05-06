import BuyMeACoffee from '../../../assets/icons/buy-me-a-coffee.svg'
import AIStudio from '../../../assets/icons/ai-studio.svg'
import Gemini from '../../../assets/icons/gemini.svg'
import OpenWebUI from '../../../assets/icons/open-webui.svg'
import OpenRouter from '../../../assets/icons/openrouter.svg'
import ChatGPT from '../../../assets/icons/openai.svg'
import Claude from '../../../assets/icons/claude.svg'
import DeepSeek from '../../../assets/icons/deepseek.svg'
import Mistral from '../../../assets/icons/mistral.svg'
import Grok from '../../../assets/icons/grok.svg'
import HuggingChat from '../../../assets/icons/hugging-chat.svg'
import Qwen from '../../../assets/icons/qwen.svg'
import Yuanbao from '../../../assets/icons/yuanbao.svg'

export namespace Icon {
  export type Variant =
    | 'BUY_ME_A_COFFEE'
    | 'AI_STUDIO'
    | 'GEMINI'
    | 'OPEN_WEBUI'
    | 'OPENROUTER'
    | 'CHATGPT'
    | 'CLAUDE'
    | 'DEEPSEEK'
    | 'MISTRAL'
    | 'GROK'
    | 'HUGGING_CHAT'
    | 'QWEN'
    | 'YUANBAO'

  export type Props = {
    variant: Variant
  }
}

export const Icon: React.FC<Icon.Props> = ({ variant }) => {
  let icon: JSX.Element

  switch (variant) {
    case 'BUY_ME_A_COFFEE':
      icon = <BuyMeACoffee />
      break
    case 'AI_STUDIO':
      icon = <AIStudio />
      break
    case 'GEMINI':
      icon = <Gemini />
      break
    case 'OPEN_WEBUI':
      icon = <OpenWebUI />
      break
    case 'OPENROUTER':
      icon = <OpenRouter />
      break
    case 'CHATGPT':
      icon = <ChatGPT />
      break
    case 'CLAUDE':
      icon = <Claude />
      break
    case 'DEEPSEEK':
      icon = <DeepSeek />
      break
    case 'MISTRAL':
      icon = <Mistral />
      break
    case 'GROK':
      icon = <Grok />
      break
    case 'HUGGING_CHAT':
      icon = <HuggingChat />
      break
    case 'QWEN':
      icon = <Qwen />
      break
    case 'YUANBAO':
      icon = <Yuanbao />
      break
    default:
      // Handle cases where variant might not match any known icon
      // This could be an empty fragment, a default icon, or throw an error
      icon = <></>
      break
  }

  return icon
}
