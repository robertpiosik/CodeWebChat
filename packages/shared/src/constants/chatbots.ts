type Chatbot = {
  [key: string]: {
    url: string
    supports_custom_temperature: boolean
    supports_system_instructions: boolean
    supports_user_provided_model: boolean
    supports_user_provided_port: boolean
    default_system_instructions: string
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
    supports_system_instructions: true,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    default_system_instructions:
      "You're a helpful coding assistant. Whenever proposing a file use the file block syntax.\nFiles must be represented as code blocks with their `name` in the header.\nExample of a code block with a file name in the header:\n```typescript name=filename.ts\ncontents of file\n```",
    supported_options: {},
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
    supports_custom_temperature: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    supported_options: { canvas: 'Canvas' },
    default_system_instructions: '',
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
    supports_user_provided_port: true,
    default_system_instructions:
      "You're a helpful coding assistant. Whenever proposing a file use the file block syntax.\nFiles must be represented as code blocks with their `name` in the first line.\nExample of a code block with a file name in the first line:\n```typescript\n// filename.ts\ncontents of file\n```",
    supported_options: {},
    models: {}
  },
  OpenRouter: {
    url: 'https://openrouter.ai/chat',
    supports_custom_temperature: true,
    supports_system_instructions: true,
    supports_user_provided_model: true,
    supports_user_provided_port: false,
    default_system_instructions:
      "You're a helpful coding assistant. Whenever proposing a file use the file block syntax.\nFiles must be represented as code blocks with their `name` in the header.\nExample of a code block with a file name in the header:\n```typescript name=filename.ts\ncontents of file\n```",
    supported_options: {},
    models: {}
  },
  ChatGPT: {
    url: 'https://chatgpt.com/',
    supports_custom_temperature: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    default_system_instructions: '',
    supported_options: {},
    models: {}
  },
  'GitHub Copilot': {
    url: 'https://github.com/copilot',
    supports_custom_temperature: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    default_system_instructions: '',
    supported_options: {},
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
    url: 'https://claude.ai/new',
    supports_custom_temperature: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    default_system_instructions: '',
    supported_options: {},
    models: {}
  },
  DeepSeek: {
    url: 'https://chat.deepseek.com/',
    supports_custom_temperature: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    default_system_instructions: '',
    supported_options: { 'deep-think': 'DeepThink (R1)', search: 'Search' },
    models: {}
  },
  Mistral: {
    url: 'https://chat.mistral.ai/chat',
    supports_custom_temperature: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    default_system_instructions: '',
    supported_options: {},
    models: {}
  },
  Grok: {
    url: 'https://grok.com/',
    supports_custom_temperature: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    default_system_instructions: '',
    supported_options: { think: 'Think' },
    models: {}
  },
  HuggingChat: {
    url: 'https://huggingface.co/chat/',
    supports_custom_temperature: false,
    supports_system_instructions: false,
    supports_user_provided_model: false,
    supports_user_provided_port: false,
    default_system_instructions: '',
    supported_options: {},
    models: {}
  }
} satisfies Chatbot
