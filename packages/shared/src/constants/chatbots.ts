type Chatbots = {
  [name: string]: {
    url: string
    supports_custom_temperature: boolean
    supports_custom_top_p: boolean
    supports_system_instructions: boolean
    supports_user_provided_model: boolean
    supports_user_provided_port: boolean
    supports_reasoning_effort: boolean
    supports_thinking_budget: boolean
    default_system_instructions: string
    default_top_p: number
    supported_options: {
      [option: string]: string
    }
    models: {
      [model: string]: {
        label: string
        disabled_options?: string[]
      }
    }
  }
}

export const CHATBOTS = {
  'AI Studio': {
    url: 'https://aistudio.google.com/prompts/new_chat',
    supports_custom_temperature: true,
    supports_custom_top_p: true,
    supports_system_instructions: true,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_reasoning_effort: false,
    supports_thinking_budget: true,
    default_system_instructions: "You're a helpful coding assistant.",
    default_top_p: 0.95,
    supported_options: {
      'temporary-chat': 'Temporary chat',
      'hide-panel': 'Hide panel',
      'disable-thinking': 'Disable thinking',
      'grounding-with-google-search': 'Grounding with Google Search',
      'url-context': 'URL context'
    },
    models: {
      'gemini-2.5-pro': {
        label: 'Gemini 2.5 Pro',
        disabled_options: ['disable-thinking']
      },
      'gemini-2.5-flash': {
        label: 'Gemini 2.5 Flash'
      },
      'gemini-2.5-flash-lite': {
        label: 'Gemini 2.5 Flash-Lite'
      }
    }
  },
  ChatGPT: {
    url: 'https://chatgpt.com/',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_reasoning_effort: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: {
      temporary: 'Temporary',
      'think-longer': 'Think longer (free plans)'
    },
    default_top_p: 0,
    models: {}
  },
  Claude: {
    url: 'https://claude.ai/new',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_reasoning_effort: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: {
      'incognito-chat': 'Incognito chat'
    },
    default_top_p: 0,
    models: {
      'sonnet-4': { label: 'Sonnet 4' },
      'opus-4-1': { label: 'Opus 4.1' }
    }
  },
  DeepSeek: {
    url: 'https://chat.deepseek.com/',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_reasoning_effort: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: { 'deep-think': 'DeepThink', search: 'Search' },
    default_top_p: 0,
    models: {}
  },
  Doubao: {
    url: 'https://www.doubao.com/chat/',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_reasoning_effort: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: { 'deep-thinking': 'Deep Thinking' },
    default_top_p: 0,
    models: {}
  },
  Gemini: {
    url: 'https://gemini.google.com/app',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_reasoning_effort: false,
    supports_thinking_budget: false,
    supported_options: { 'temporary-chat': 'Temporary chat' },
    default_system_instructions: '',
    default_top_p: 0,
    models: {
      '2.5-flash': { label: '2.5 Flash' },
      '2.5-pro': { label: '2.5 Pro' }
    }
  },
  Grok: {
    url: 'https://grok.com/',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_reasoning_effort: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: { private: 'Private' },
    default_top_p: 0,
    models: {
      auto: { label: 'Auto' },
      fast: { label: 'Fast' },
      expert: { label: 'Expert' },
      'grok-4-fast': { label: 'Grok 4 Fast' },
      heavy: { label: 'Heavy' }
    }
  },
  Kimi: {
    url: 'https://www.kimi.com/',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_reasoning_effort: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: {},
    default_top_p: 0,
    models: {}
  },
  Mistral: {
    url: 'https://chat.mistral.ai/chat',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_reasoning_effort: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: {
      incognito: 'Incognito mode',
      think: 'Think'
    },
    default_top_p: 0,
    models: {}
  },
  // Not supported until they fix code blocks in copied chat responses
  // Meta: {
  //   url: 'https://www.meta.ai/',
  //   supports_custom_temperature: false,
  //   supports_custom_top_p: false,
  //   supports_system_instructions: false,
  //   supports_user_provided_model: false,
  //   supports_user_provided_port: false,
  //   supports_thinking_budget: false,
  //   default_system_instructions: '',
  //   supported_options: {},
  //   default_top_p: 0,
  //   models: {}
  // },
  'Open WebUI': {
    url: 'http://openwebui/',
    supports_custom_temperature: true,
    supports_custom_top_p: true,
    supports_system_instructions: true,
    supports_user_provided_model: true,
    supports_user_provided_port: true,
    supports_reasoning_effort: false,
    supports_thinking_budget: false,
    default_system_instructions: "You're a helpful coding assistant.",
    supported_options: {},
    default_top_p: 0.9,
    models: {}
  },
  OpenRouter: {
    url: 'https://openrouter.ai/chat',
    supports_custom_temperature: true,
    supports_custom_top_p: true,
    supports_system_instructions: true,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_reasoning_effort: true,
    supports_thinking_budget: false,
    default_system_instructions: "You're a helpful coding assistant.",
    supported_options: {
      'disable-reasoning': 'Disable reasoning (for hybrid models)'
    },
    default_top_p: 1,
    models: {}
  },
  Perplexity: {
    url: 'https://www.perplexity.ai/',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_reasoning_effort: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: {},
    default_top_p: 0,
    models: {}
  },
  Qwen: {
    url: 'https://chat.qwen.ai/',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_reasoning_effort: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: {
      thinking: 'Thinking',
      search: 'Search',
      temporary: 'Temporary'
    },
    default_top_p: 0,
    models: {
      'qwen3-max-preview': { label: 'Qwen3-Max-Preview' },
      'qwen3-next-80b-a3b': { label: 'Qwen3-Next-80B-A3B' },
      'qwen3-235b-a22b-2507': {
        label: 'Qwen3-235B-A22B-2507'
      },
      'qwen3-coder': { label: 'Qwen3-Coder' }
    }
  },
  Together: {
    url: 'https://chat.together.ai/',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_reasoning_effort: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: {},
    default_top_p: 0,
    models: {
      'deepseek-r1-0528': { label: 'DeepSeek R1 (0528)' },
      'deepseek-v3-0324': { label: 'DeepSeek V3 (0324)' },
      'gpt-oss-120b': { label: 'GPT OSS 120B' },
      'qwen3-235b-a22b-2507': { label: 'Qwen3 235B (2507)' },
      'qwen3-coder-480b': { label: 'Qwen3 Coder 480B' },
      'glm-4.5-air': { label: 'GLM-4.5-Air' },
      'llama-4-maverick': { label: 'Llama 4 Maverick' }
    }
  },
  Yuanbao: {
    url: 'https://yuanbao.tencent.com/chat',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_reasoning_effort: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: { 'deep-think': 'DeepThink', search: 'Search' },
    default_top_p: 0,
    models: {
      deepseek: { label: 'DeepSeek' },
      hunyuan: { label: 'Hunyuan' }
    }
  },
  'Z.AI': {
    url: 'https://chat.z.ai/',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_reasoning_effort: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: {},
    default_top_p: 0,
    models: {}
  }
} satisfies Chatbots
