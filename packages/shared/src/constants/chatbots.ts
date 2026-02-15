type Chatbot = {
  url: string
  supports_custom_temperature?: boolean
  supports_custom_top_p?: boolean
  supports_system_instructions?: boolean
  supports_user_provided_model?: boolean
  supports_user_provided_port?: boolean
  supports_reasoning_effort?: boolean
  supported_reasoning_efforts?: string[]
  supports_thinking_budget?: boolean
  supports_url_override?: boolean
  url_override_label?: string
  url_override_disabled_options?: string[]
  default_system_instructions?: string
  supported_options?: {
    [option: string]: string
  }
  models?: {
    [model: string]: {
      label: string
      disabled_options?: string[]
      supported_reasoning_efforts?: string[]
    }
  }
}

export const CHATBOTS = {
  'AI Studio': {
    url: 'https://aistudio.google.com/prompts/new_chat',
    supports_custom_temperature: true,
    supports_custom_top_p: true,
    supports_system_instructions: true,
    supports_thinking_budget: true,
    default_system_instructions: "You're a helpful coding assistant.",
    supported_options: {
      'temporary-chat': 'Temporary chat',
      'hide-panel': 'Hide panel',
      'disable-thinking': 'Disable thinking',
      'grounding-with-google-search': 'Grounding with Google Search',
      'url-context': 'URL context'
    },
    models: {
      'gemini-3-pro-preview': {
        label: 'Gemini 3 Pro Preview',
        disabled_options: ['disable-thinking'],
        supported_reasoning_efforts: ['Low', 'High']
      },
      'gemini-3-flash-preview': {
        label: 'Gemini 3 Flash Preview',
        disabled_options: ['disable-thinking'],
        supported_reasoning_efforts: ['Minimal', 'Low', 'Medium', 'High']
      },
      'gemini-2.5-pro': {
        label: 'Gemini 2.5 Pro',
        disabled_options: ['disable-thinking']
      },
      'gemini-2.5-flash': {
        label: 'Gemini 2.5 Flash'
      }
    }
  } as Chatbot,
  Arena: {
    url: 'https://arena.ai/',
    supports_user_provided_model: true
  } as Chatbot,
  ChatGPT: {
    url: 'https://chatgpt.com/',
    supports_url_override: true,
    url_override_label: 'Project URL',
    url_override_disabled_options: ['temporary'],
    supported_options: {
      temporary: 'Temporary',
      thinking: 'Thinking (free plans)'
    }
  } as Chatbot,
  Claude: {
    url: 'https://claude.ai/new',
    supports_url_override: true,
    url_override_label: 'Project URL',
    url_override_disabled_options: ['incognito-chat'],
    supported_options: {
      'incognito-chat': 'Incognito chat'
    },
    models: {
      'sonnet-4-5': { label: 'Sonnet 4.5' },
      'haiku-4-5': { label: 'Haiku 4.5' },
      'opus-4-6': { label: 'Opus 4.6' }
    }
  } as Chatbot,
  Copilot: {
    url: 'https://copilot.microsoft.com/'
  } as Chatbot,
  DeepSeek: {
    url: 'https://chat.deepseek.com/',
    supported_options: { 'deep-think': 'DeepThink', search: 'Search' }
  } as Chatbot,
  Doubao: {
    url: 'https://www.doubao.com/chat/',
    supported_options: { 'deep-thinking': 'Deep Thinking' }
  } as Chatbot,
  Gemini: {
    url: 'https://gemini.google.com/app',
    supported_options: { 'temporary-chat': 'Temporary chat' },
    supports_url_override: true,
    url_override_label: 'Gem URL',
    url_override_disabled_options: ['temporary-chat'],
    models: {
      fast: { label: 'Fast' },
      thinking: { label: 'Thinking' },
      pro: { label: 'Pro' }
    }
  } as Chatbot,
  'GitHub Copilot': {
    url: 'https://github.com/copilot',
    supports_url_override: true,
    url_override_label: 'Space URL',
    models: {
      'gpt-5-mini': { label: 'GPT-5 mini' },
      'grok-code-fast-1': { label: 'Grok Code Fast 1' },
      'gemini-3-flash': { label: 'Gemini 3 Flash' },
      'claude-haiku-4.5': { label: 'Claude Haiku 4.5' },
      'gpt-4.1': { label: 'GPT-4.1' },
      'gpt-4o': { label: 'GPT-4o' },
      'gpt-5': { label: 'GPT-5' },
      'gpt-5.1': { label: 'GPT-5.1' },
      'gpt-5.2': { label: 'GPT-5.2' },
      'claude-sonnet-4': { label: 'Claude Sonnet 4' },
      'claude-sonnet-4.5': { label: 'Claude Sonnet 4.5' },
      'claude-opus-4.5': { label: 'Claude Opus 4.5' },
      'gemini-3-pro': { label: 'Gemini 3 Pro' }
    }
  } as Chatbot,
  Grok: {
    url: 'https://grok.com/',
    supports_url_override: true,
    url_override_label: 'Project URL',
    url_override_disabled_options: ['private'],
    supported_options: { private: 'Private' },
    models: {
      auto: { label: 'Auto' },
      fast: { label: 'Fast' },
      expert: { label: 'Expert' },
      'grok-4-1-thinking': { label: 'Grok 4.1 Thinking' },
      heavy: { label: 'Heavy' }
    }
  } as Chatbot,
  HuggingChat: {
    url: 'https://huggingface.co/chat/',
    supports_user_provided_model: true
  } as Chatbot,
  Kimi: {
    url: 'https://www.kimi.com/'
  } as Chatbot,
  Mistral: {
    url: 'https://chat.mistral.ai/chat',
    supports_url_override: true,
    url_override_label: 'Project URL',
    url_override_disabled_options: ['incognito'],
    supported_options: {
      incognito: 'Incognito mode',
      think: 'Think'
    }
  } as Chatbot,
  'Open WebUI': {
    url: 'http://openwebui/',
    supports_custom_temperature: true,
    supports_custom_top_p: true,
    supports_system_instructions: true,
    supports_user_provided_model: true,
    supports_user_provided_port: true,
    default_system_instructions: "You're a helpful coding assistant."
  } as Chatbot,
  OpenRouter: {
    url: 'https://openrouter.ai/chat',
    supports_custom_temperature: true,
    supports_custom_top_p: true,
    supports_system_instructions: true,
    supports_reasoning_effort: true,
    supported_reasoning_efforts: [
      'None',
      'Minimal',
      'Low',
      'Medium',
      'High',
      'XHigh'
    ],
    default_system_instructions: "You're a helpful coding assistant.",
    supported_options: {
      'disable-reasoning': 'Disable reasoning (for hybrid models)'
    }
  } as Chatbot,
  Qwen: {
    url: 'https://chat.qwen.ai/',
    supports_url_override: true,
    url_override_label: 'Project URL',
    supported_options: {
      thinking: 'Thinking',
      search: 'Search',
      temporary: 'Temporary'
    }
  } as Chatbot,
  Together: {
    url: 'https://chat.together.ai/',
    models: {
      'deepseek-v3.1': { label: 'DeepSeek V3.1' },
      'glm-4.7': { label: 'GLM-4.7' },
      'kimi-k2': { label: 'Kimi K2' },
      'gpt-oss-120b': { label: 'GPT OSS 120B' }
    }
  } as Chatbot,
  Yuanbao: {
    url: 'https://yuanbao.tencent.com/chat'
  } as Chatbot,
  'Z.AI': {
    url: 'https://chat.z.ai/',
    supported_options: {
      'deep-think': 'Deep Think'
    }
  } as Chatbot
}
