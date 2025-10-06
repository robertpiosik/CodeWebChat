import AIStudio from '../../../assets/icons/ai-studio.svg'
import BuyMeACoffeeLogo from '../../../assets/icons/buy-me-a-coffee-logo.svg'
import BuyMeACoffeeText from '../../../assets/icons/buy-me-a-coffee-text.svg'
import ChatGPT from '../../../assets/icons/openai.svg'
import Claude from '../../../assets/icons/claude.svg'
import CodeWebChatLogo from '../../../assets/icons/code-web-chat-logo.svg'
import CodeWebChatText from '../../../assets/icons/code-web-chat-text.svg'
import Command from '../../../assets/icons/command.svg'
import Copilot from '../../../assets/icons/copilot.svg'
import DeepSeek from '../../../assets/icons/deepseek.svg'
import Discord from '../../../assets/icons/discord.svg'
import Doubao from '../../../assets/icons/doubao.svg'
import Enter from '../../../assets/icons/enter.svg'
import Gemini from '../../../assets/icons/gemini.svg'
import Grok from '../../../assets/icons/grok.svg'
import Kimi from '../../../assets/icons/kimi.svg'
import Meta from '../../../assets/icons/meta.svg'
import Mistral from '../../../assets/icons/mistral.svg'
import OpenRouter from '../../../assets/icons/openrouter.svg'
import OpenWebUI from '../../../assets/icons/open-webui.svg'
import Perplexity from '../../../assets/icons/perplexity.svg'
import Qwen from '../../../assets/icons/qwen.svg'
import Reddit from '../../../assets/icons/reddit.svg'
import Together from '../../../assets/icons/together.svg'
import X from '../../../assets/icons/x.svg'
import Yuanbao from '../../../assets/icons/yuanbao.svg'
import ZAI from '../../../assets/icons/z-ai.svg'

export namespace Icon {
  export type Variant =
    | 'AI_STUDIO'
    | 'BUY_ME_A_COFFEE_LOGO'
    | 'BUY_ME_A_COFFEE_TEXT'
    | 'CHATGPT'
    | 'CLAUDE'
    | 'CODE_WEB_CHAT_LOGO'
    | 'CODE_WEB_CHAT_TEXT'
    | 'COMMAND'
    | 'COPILOT'
    | 'DEEPSEEK'
    | 'DISCORD'
    | 'DOUBAO'
    | 'ENTER'
    | 'GEMINI'
    | 'GROK'
    | 'KIMI'
    | 'META'
    | 'MISTRAL'
    | 'OPENROUTER'
    | 'OPEN_WEBUI'
    | 'PERPLEXITY'
    | 'QWEN'
    | 'REDDIT'
    | 'TOGETHER'
    | 'X'
    | 'YUANBAO'
    | 'Z_AI'

  export type Props = {
    variant: Variant
  }
}

export const Icon: React.FC<Icon.Props> = ({ variant }) => {
  let icon: JSX.Element

  switch (variant) {
    case 'AI_STUDIO':
      icon = <AIStudio />
      break
    case 'BUY_ME_A_COFFEE_LOGO':
      icon = <BuyMeACoffeeLogo />
      break
    case 'BUY_ME_A_COFFEE_TEXT':
      icon = <BuyMeACoffeeText />
      break
    case 'CHATGPT':
      icon = <ChatGPT />
      break
    case 'CLAUDE':
      icon = <Claude />
      break
    case 'CODE_WEB_CHAT_LOGO':
      icon = <CodeWebChatLogo />
      break
    case 'CODE_WEB_CHAT_TEXT':
      icon = <CodeWebChatText />
      break
    case 'COMMAND':
      icon = <Command />
      break
    case 'COPILOT':
      icon = <Copilot />
      break
    case 'DEEPSEEK':
      icon = <DeepSeek />
      break
    case 'DISCORD':
      icon = <Discord />
      break
    case 'DOUBAO':
      icon = <Doubao />
      break
    case 'ENTER':
      icon = <Enter />
      break
    case 'GEMINI':
      icon = <Gemini />
      break
    case 'GROK':
      icon = <Grok />
      break
    case 'KIMI':
      icon = <Kimi />
      break
    case 'META':
      icon = <Meta />
      break
    case 'MISTRAL':
      icon = <Mistral />
      break
    case 'OPENROUTER':
      icon = <OpenRouter />
      break
    case 'OPEN_WEBUI':
      icon = <OpenWebUI />
      break
    case 'PERPLEXITY':
      icon = <Perplexity />
      break
    case 'QWEN':
      icon = <Qwen />
      break
    case 'REDDIT':
      icon = <Reddit />
      break
    case 'TOGETHER':
      icon = <Together />
      break
    case 'X':
      icon = <X />
      break
    case 'YUANBAO':
      icon = <Yuanbao />
      break
    case 'Z_AI':
      icon = <ZAI />
      break
    default:
      icon = <></>
      break
  }

  return icon
}
