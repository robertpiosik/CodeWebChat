type Chatbot = {
  [key: string]: {
    url: string
    supports_custom_temperature?: boolean
    supports_system_instructions?: boolean
    supports_user_provided_model?: boolean
    supports_user_provided_port?: boolean
    supported_options?: {
      [option: string]: string
    }
    models?: {
      [model: string]: string
    }
  }
}

export const CHATBOTS = {
  'AI Studio': {
    url: 'https://aistudio.google.com/prompts/new_chat',
    supports_custom_temperature: true,
    supports_system_instructions: true,
    models: {
      'gemini-2.0-flash': 'Gemini 2.0 Flash',
      'gemini-2.0-flash-lite': 'Gemini 2.0 Flash-Lite',
      'gemini-2.5-pro-preview-03-25': 'Gemini 2.5 Pro Preview 03-25',
      'gemini-2.0-flash-thinking-exp-01-21':
        'Gemini 2.0 Flash Thinking Exp 01-21'
    }
  },
  Gemini: {
    url: 'https://gemini.google.com/app',
    supported_options: { canvas: 'Canvas' },
    models: {
      '2.0-flash': '2.0 Flash',
      '2.0-flash-thinking': '2.0 Flash Thinking',
      '2.5-pro': '2.5 Pro'
    }
  },
  'Open WebUI': {
    url: 'http://openwebui/',
    supports_custom_temperature: true,
    supports_system_instructions: true,
    supports_user_provided_model: true,
    supports_user_provided_port: true
  },
  OpenRouter: {
    url: 'https://openrouter.ai/chat',
    supports_custom_temperature: true,
    supports_system_instructions: true,
    supports_user_provided_model: true
  },
  ChatGPT: {
    url: 'https://chatgpt.com/'
  },
  'GitHub Copilot': {
    url: 'https://github.com/copilot',
    models: {
      '4o': 'GPT-4o',
      o1: 'o1',
      'o3-mini': 'o3-mini',
      'sonnet-3.5': 'Claude 3.5 Sonnet',
      'sonnet-3.7': 'Claude 3.7 Sonnet',
      'sonnet-3.7-thinking': 'Claude 3.7 Sonnet Thinking',
      'gemini-2.0-flash': 'Gemini 2.0 Flash'
    }
  },
  Claude: {
    url: 'https://claude.ai/new'
  },
  DeepSeek: {
    url: 'https://chat.deepseek.com/',
    supported_options: { 'deep-think': 'DeepThink (R1)', search: 'Search' }
  },
  Mistral: {
    url: 'https://chat.mistral.ai/chat'
  },
  Grok: {
    url: 'https://grok.com/',
    supported_options: { think: 'Think' }
  },
  HuggingChat: {
    url: 'https://huggingface.co/chat/'
  },
} satisfies Chatbot
