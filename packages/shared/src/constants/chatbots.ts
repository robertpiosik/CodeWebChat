type Chatbots = {
  [name: string]: {
    url: string
    supports_custom_temperature: boolean
    supports_custom_top_p: boolean
    supports_system_instructions: boolean
    supports_user_provided_model: boolean
    supports_user_provided_port: boolean
    supports_thinking_budget: boolean
    default_system_instructions: string
    default_top_p: number
    supported_options: {
      [option: string]: string
    }
    models: {
      [model: string]: string
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
    supports_thinking_budget: true,
    default_system_instructions: "You're a helpful coding assistant.",
    default_top_p: 0.95,
    supported_options: {
      'hide-panel': 'Hide panel',
      'disable-thinking': 'Disable thinking',
      'grounding-with-google-search': 'Grounding with Google Search',
      'url-context': 'URL context'
    },
    models: {
      'gemini-2.5-pro': 'Gemini 2.5 Pro',
      'gemini-2.5-flash': 'Gemini 2.5 Flash',
      'gemini-2.5-flash-lite': 'Gemini 2.5 Flash-Lite'
    }
  },
  Gemini: {
    url: 'https://gemini.google.com/app',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_thinking_budget: false,
    supported_options: { canvas: 'Canvas' },
    default_system_instructions: '',
    default_top_p: 0,
    models: {
      '2.5-flash': '2.5 Flash',
      '2.5-pro': '2.5 Pro'
    }
  },
  'Open WebUI': {
    url: 'http://openwebui/',
    supports_custom_temperature: true,
    supports_custom_top_p: true,
    supports_system_instructions: true,
    supports_user_provided_model: true,
    supports_user_provided_port: true,
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
    supports_thinking_budget: false,
    default_system_instructions: "You're a helpful coding assistant.",
    supported_options: {},
    default_top_p: 1,
    models: {}
  },
  ChatGPT: {
    url: 'https://chatgpt.com/',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: {
      temporary: 'Temporary'
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
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: {},
    default_top_p: 0,
    models: {
      'sonnet-4': 'Sonnet 4',
      'opus-4': 'Opus 4'
    }
  },
  DeepSeek: {
    url: 'https://chat.deepseek.com/',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: { 'deep-think': 'DeepThink (R1)', search: 'Search' },
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
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: {
      think: 'Think'
    },
    default_top_p: 0,
    models: {}
  },
  Grok: {
    url: 'https://grok.com/',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: { think: 'Think' },
    default_top_p: 0,
    models: {
      'grok-3': 'Grok 3',
      'grok-4': 'Grok 4',
      'grok-4-heavy': 'Grok 4 Heavy'
    }
  },
  Qwen: {
    url: 'https://chat.qwen.ai/',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: {
      thinking: 'Thinking',
      search: 'Search'
    },
    default_top_p: 0,
    models: {
      'qwen3-coder': 'Qwen3-Coder',
      'qwen3-235b-a22b-2507': 'Qwen3-235B-A22B-2507',
      'qwen3-30b-a3b': 'Qwen3-30B-A3B',
      'qwen3-32b': 'Qwen3-32B'
    }
  },
  Yuanbao: {
    url: 'https://yuanbao.tencent.com/chat',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: { 'deep-think': 'DeepThink', search: 'Search' },
    default_top_p: 0,
    models: {
      deepseek: 'DeepSeek',
      hunyuan: 'Hunyuan'
    }
  },
  Doubao: {
    url: 'https://www.doubao.com/chat/',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: { 'deep-thinking': 'Deep Thinking' },
    default_top_p: 0,
    models: {}
  },
  Kimi: {
    url: 'https://www.kimi.com/',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: {},
    default_top_p: 0,
    models: {}
  },
  Perplexity: {
    url: 'https://www.perplexity.ai/',
    supports_custom_temperature: false,
    supports_custom_top_p: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supports_thinking_budget: false,
    default_system_instructions: '',
    supported_options: {},
    default_top_p: 0,
    models: {}
  }
} satisfies Chatbots
