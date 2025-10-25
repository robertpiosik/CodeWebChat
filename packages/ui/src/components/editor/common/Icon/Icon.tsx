import AIStudio from '../../../../assets/icons/ai-studio.svg'
import AtSign from '../../../../assets/icons/at-sign.svg'
import BuyMeACoffeeLogo from '../../../../assets/icons/buy-me-a-coffee-logo.svg'
import BuyMeACoffeeText from '../../../../assets/icons/buy-me-a-coffee-text.svg'
import ChatGPT from '../../../../assets/icons/openai.svg'
import Claude from '../../../../assets/icons/claude.svg'
import CodeWebChatLogo from '../../../../assets/icons/code-web-chat-logo.svg'
import CodeWebChatText from '../../../../assets/icons/code-web-chat-text.svg'
import Copilot from '../../../../assets/icons/copilot.svg'
import CurlyBraces from '../../../../assets/icons/curly-braces.svg'
import GithubCopilot from '../../../../assets/icons/github-copilot.svg'
import DeepSeek from '../../../../assets/icons/deepseek.svg'
import Discord from '../../../../assets/icons/discord.svg'
import Doubao from '../../../../assets/icons/doubao.svg'
import Gemini from '../../../../assets/icons/gemini.svg'
import Grok from '../../../../assets/icons/grok.svg'
import HashSign from '../../../../assets/icons/hash-sign.svg'
import HuggingChat from '../../../../assets/icons/hugging-chat.svg'
import Kimi from '../../../../assets/icons/kimi.svg'
import Meta from '../../../../assets/icons/meta.svg'
import Minimax from '../../../../assets/icons/minimax.svg'
import Mistral from '../../../../assets/icons/mistral.svg'
import OpenRouter from '../../../../assets/icons/openrouter.svg'
import OpenWebUI from '../../../../assets/icons/open-webui.svg'
import Perplexity from '../../../../assets/icons/perplexity.svg'
import Qwen from '../../../../assets/icons/qwen.svg'
import Reddit from '../../../../assets/icons/reddit.svg'
import Together from '../../../../assets/icons/together.svg'
import X from '../../../../assets/icons/x.svg'
import Yuanbao from '../../../../assets/icons/yuanbao.svg'
import ZAI from '../../../../assets/icons/z-ai.svg'

export namespace Icon {
  export type Variant =
    | 'AI_STUDIO'
    | 'AT_SIGN'
    | 'BUY_ME_A_COFFEE_LOGO'
    | 'BUY_ME_A_COFFEE_TEXT'
    | 'CHATGPT'
    | 'CLAUDE'
    | 'CODE_WEB_CHAT_LOGO'
    | 'CODE_WEB_CHAT_TEXT'
    | 'COPILOT'
    | 'CURLY_BRACES'
    | 'DEEPSEEK'
    | 'DISCORD'
    | 'DOUBAO'
    | 'GEMINI'
    | 'GITHUB_COPILOT'
    | 'GROK'
    | 'HASH_SIGN'
    | 'HUGGING_CHAT'
    | 'KIMI'
    | 'META'
    | 'MINIMAX'
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
    case 'AT_SIGN':
      icon = <AtSign />
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
    case 'COPILOT':
      icon = <Copilot />
      break
    case 'CURLY_BRACES':
      icon = <CurlyBraces />
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
    case 'GEMINI':
      icon = <Gemini />
      break
    case 'GITHUB_COPILOT':
      icon = <GithubCopilot />
      break
    case 'GROK':
      icon = <Grok />
      break
    case 'HASH_SIGN':
      icon = <HashSign />
      break
    case 'HUGGING_CHAT':
      icon = <HuggingChat />
      break
    case 'KIMI':
      icon = <Kimi />
      break
    case 'META':
      icon = <Meta />
      break
    case 'MINIMAX':
      icon = <Minimax />
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
