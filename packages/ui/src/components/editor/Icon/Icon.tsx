import BuyMeACoffee from '../../../assets/icons/buy-me-a-coffee.svg'
import Github from '../../../assets/icons/github.svg'
import AIStudio from '../../../assets/icons/ai-studio.svg'
import Gemini from '../../../assets/icons/gemini.svg'
import OpenWebUI from '../../../assets/icons/open-webui.svg'
import OpenRouter from '../../../assets/icons/openrouter.svg'
import ChatGPT from '../../../assets/icons/openai.svg'
import GitHubCopilot from '../../../assets/icons/github-copilot.svg'
import Claude from '../../../assets/icons/claude.svg'
import DeepSeek from '../../../assets/icons/deepseek.svg'
import Mistral from '../../../assets/icons/mistral.svg'
import Grok from '../../../assets/icons/grok.svg'
import HuggingChat from '../../../assets/icons/hugging-chat.svg'

export namespace Icon {
  export type Variant =
    | 'BUY_ME_A_COFFEE'
    | 'GITHUB'
    | 'AI_STUDIO'
    | 'GEMINI'
    | 'OPEN_WEBUI'
    | 'OPENROUTER'
    | 'CHATGPT'
    | 'GITHUB_COPILOT'
    | 'CLAUDE'
    | 'DEEPSEEK'
    | 'MISTRAL'
    | 'GROK'
    | 'HUGGING_CHAT'

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
    case 'GITHUB':
      icon = <Github />
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
    case 'GITHUB_COPILOT':
      icon = <GitHubCopilot />
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
  }

  return icon
}
