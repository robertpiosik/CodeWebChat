import { ReactComponent as AIStudio } from '../../../../assets/icons/ai-studio.svg'
import { ReactComponent as AtSign } from '../../../../assets/icons/at-sign.svg'
import { ReactComponent as Arena } from '../../../../assets/icons/arena.svg'
import { ReactComponent as ChatGPT } from '../../../../assets/icons/openai.svg'
import { ReactComponent as Claude } from '../../../../assets/icons/claude.svg'
import { ReactComponent as CodeWebChatLogo } from '../../../../assets/icons/code-web-chat-logo.svg'
import { ReactComponent as CodeWebChatText } from '../../../../assets/icons/code-web-chat-text.svg'
import { ReactComponent as Copilot } from '../../../../assets/icons/copilot.svg'
import { ReactComponent as Slash } from '../../../../assets/icons/slash.svg'
import { ReactComponent as DeepSeek } from '../../../../assets/icons/deepseek.svg'
import { ReactComponent as GithubCopilot } from '../../../../assets/icons/github-copilot.svg'
import { ReactComponent as DiscordLogo } from '../../../../assets/icons/discord-logo.svg'
import { ReactComponent as Doubao } from '../../../../assets/icons/doubao.svg'
import { ReactComponent as Gemini } from '../../../../assets/icons/gemini.svg'
import { ReactComponent as Grok } from '../../../../assets/icons/grok.svg'
import { ReactComponent as HashSign } from '../../../../assets/icons/hash-sign.svg'
import { ReactComponent as HuggingChat } from '../../../../assets/icons/hugging-chat.svg'
import { ReactComponent as Kimi } from '../../../../assets/icons/kimi.svg'
import { ReactComponent as Mistral } from '../../../../assets/icons/mistral.svg'
import { ReactComponent as OpenRouter } from '../../../../assets/icons/openrouter.svg'
import { ReactComponent as OpenWebUI } from '../../../../assets/icons/open-webui.svg'
import { ReactComponent as Qwen } from '../../../../assets/icons/qwen.svg'
import { ReactComponent as Together } from '../../../../assets/icons/together.svg'
import { ReactComponent as X } from '../../../../assets/icons/x.svg'
import { ReactComponent as Yuanbao } from '../../../../assets/icons/yuanbao.svg'
import { ReactComponent as ZAI } from '../../../../assets/icons/z-ai.svg'
import { ReactComponent as Meta } from '../../../../assets/icons/meta.svg'

export namespace Icon {
  export type Variant =
    | 'AI_STUDIO'
    | 'AT_SIGN'
    | 'CHATGPT'
    | 'CLAUDE'
    | 'CODE_WEB_CHAT_LOGO'
    | 'CODE_WEB_CHAT_TEXT'
    | 'COPILOT'
    | 'SLASH'
    | 'DEEPSEEK'
    | 'DISCORD'
    | 'DOUBAO'
    | 'GEMINI'
    | 'GITHUB_COPILOT'
    | 'GROK'
    | 'HASH_SIGN'
    | 'HUGGING_CHAT'
    | 'KIMI'
    | 'ARENA'
    | 'MISTRAL'
    | 'OPENROUTER'
    | 'OPEN_WEBUI'
    | 'QWEN'
    | 'TOGETHER'
    | 'X'
    | 'META'
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
    case 'SLASH':
      icon = <Slash />
      break
    case 'DEEPSEEK':
      icon = <DeepSeek />
      break
    case 'DISCORD':
      icon = <DiscordLogo />
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
    case 'ARENA':
      icon = <Arena />
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
    case 'QWEN':
      icon = <Qwen />
      break
    case 'TOGETHER':
      icon = <Together />
      break
    case 'X':
      icon = <X />
      break
    case 'META':
      icon = <Meta />
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
