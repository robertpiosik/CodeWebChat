import browser from 'webextension-polyfill'
import { Chat } from '@shared/types/websocket-message'
import { Chatbot } from './types/chatbot'
import { Message } from '@/types/messages'
import {
  ai_studio,
  gemini,
  chatgpt,
  claude,
  mistral,
  open_webui,
  deepseek,
  grok,
  openrouter,
  qwen,
  yuanbao,
  doubao
} from './chatbots'

// In case it changes before finding textarea element (e.g. in mobile AI Studio, when changing model)
const current_url = window.location.href

// Extract batch ID from URL hash if available
const hash = window.location.hash
const hash_prefix = '#gemini-coder'
const is_gemini_coder_hash = hash.startsWith(hash_prefix)
const batch_id = is_gemini_coder_hash
  ? hash.substring(hash_prefix.length + 1) || 'default'
  : ''

const ai_studio_url = 'https://aistudio.google.com/prompts/new_chat'
const is_ai_studio = current_url.startsWith(ai_studio_url)

const gemini_url = 'https://gemini.google.com/app'
const is_gemini = current_url.startsWith(gemini_url)

const openrouter_url = 'https://openrouter.ai/chat'
const is_openrouter = current_url.startsWith(openrouter_url)

const chatgpt_url = 'https://chatgpt.com/'
const is_chatgpt = current_url.startsWith(chatgpt_url)

const claude_url = 'https://claude.ai/new'
const is_claude = current_url.startsWith(claude_url)

const deepseek_url = 'https://chat.deepseek.com/'
const is_deepseek = current_url.startsWith(deepseek_url)

const mistral_url = 'https://chat.mistral.ai/chat'
const is_mistral = current_url.startsWith(mistral_url)

const qwen_url = 'https://chat.qwen.ai/'
const is_qwen = current_url.startsWith(qwen_url)

const yuanbao_url = 'https://yuanbao.tencent.com/chat'
const is_yuanbao = current_url.startsWith(yuanbao_url)

const grok_url = 'https://grok.com/'
const is_grok = current_url.startsWith(grok_url)

const doubao_url = 'https://www.doubao.com/chat/'
const is_doubao = current_url.startsWith(doubao_url)

// No need for special handling
// const huggingchat_url = 'https://huggingface.co/chat/'
// const is_huggingchat = current_url == huggingchat_url

const is_open_webui = document.title.includes('Open WebUI')

let chatbot: Chatbot | null = null

if (is_ai_studio) {
  chatbot = ai_studio
} else if (is_gemini) {
  chatbot = gemini
} else if (is_chatgpt) {
  chatbot = chatgpt
} else if (is_claude) {
  chatbot = claude
} else if (is_mistral) {
  chatbot = mistral
} else if (is_open_webui) {
  chatbot = open_webui
} else if (is_deepseek) {
  chatbot = deepseek
} else if (is_grok) {
  chatbot = grok
} else if (is_openrouter) {
  chatbot = openrouter
} else if (is_qwen) {
  chatbot = qwen
} else if (is_yuanbao) {
  chatbot = yuanbao
} else if (is_doubao) {
  chatbot = doubao
}

export const get_textarea_element = () => {
  const chatbot_selectors = {
    [ai_studio_url]: 'textarea',
    [gemini_url]: 'div[contenteditable="true"]',
    [openrouter_url]: 'textarea',
    [chatgpt_url]: 'div#prompt-textarea',
    [claude_url]: 'div[contenteditable=true]',
    [deepseek_url]: 'textarea',
    [mistral_url]: 'textarea',
    [yuanbao_url]: 'div[contenteditable="true"]',
    [doubao_url]: 'textarea'
  } as any

  // Find the appropriate selector based on the URL without the hash
  let selector = null
  for (const [url, sel] of Object.entries(chatbot_selectors)) {
    if (current_url.split('#')[0].split('?')[0].startsWith(url)) {
      selector = sel
      break
    }
  }

  const active_element = selector
    ? (document.querySelector(selector as string) as HTMLElement)
    : (document.activeElement as HTMLElement)
  return active_element
}

const enter_message_and_send = async (params: {
  input_element: HTMLElement | null
  message: string
}) => {
  if (params.input_element && params.input_element.isContentEditable) {
    params.input_element.innerText = params.message
    params.input_element.dispatchEvent(new Event('input', { bubbles: true }))
    params.input_element.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((r) => requestAnimationFrame(r))
    const form = params.input_element.closest('form')
    if (is_claude) {
      await new Promise((r) => setTimeout(r, 500))
      const submit_button = Array.from(
        document.querySelectorAll('fieldset button')
      ).find((button) =>
        button.querySelector(
          'path[d="M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z"]'
        )
      ) as HTMLButtonElement
      submit_button.click()
    } else if (form) {
      form.requestSubmit()
    } else {
      const enter_event = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      })
      params.input_element.dispatchEvent(enter_event)
    }
  } else if (
    params.input_element &&
    params.input_element.tagName == 'TEXTAREA'
  ) {
    const form = params.input_element.closest('form')
    ;(params.input_element as HTMLTextAreaElement).value = params.message
    params.input_element.dispatchEvent(new Event('input', { bubbles: true }))
    params.input_element.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((r) => requestAnimationFrame(r))
    if (is_openrouter || is_mistral) {
      await new Promise((r) => setTimeout(r, 500))
    }
    if (form) {
      form.requestSubmit()
    } else if (is_ai_studio) {
      ;(document.querySelector('run-button > button') as HTMLElement)?.click()
    } else {
      const enter_event = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      })
      params.input_element.dispatchEvent(enter_event)
    }
  }
}

const initialize_chat = async (params: { message: string; chat: Chat }) => {
  if (params.chat.model && chatbot?.set_model) {
    await chatbot.set_model(params.chat.model)
  }
  if (params.chat.system_instructions && chatbot?.enter_system_instructions) {
    await chatbot.enter_system_instructions(params.chat.system_instructions)
  }
  if (params.chat.temperature !== undefined && chatbot?.set_temperature) {
    await chatbot.set_temperature(params.chat.temperature)
  }
  if (params.chat.top_p !== undefined && chatbot?.set_top_p) {
    await chatbot.set_top_p(params.chat.top_p)
  }
  if (chatbot?.set_options) {
    await chatbot.set_options(params.chat.options || [])
  }

  if (chatbot?.enter_message_and_send) {
    await chatbot.enter_message_and_send(params.message)
  } else {
    await enter_message_and_send({
      input_element: get_textarea_element(),
      message: params.message
    })
  }

  // Process next chat from the queue
  browser.runtime.sendMessage<Message>({
    action: 'chat-initialized'
  })
}

const main = async () => {
  if (!is_gemini_coder_hash) return

  // Remove the hash from the URL to avoid reloading the content script if the page is refreshed
  history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search
  )

  // Get the message using the batch ID from the hash
  const storage_key = `chat-init:${batch_id}`
  const storage = await browser.storage.local.get(storage_key)
  const stored_data = storage[storage_key] as {
    text: string
    current_chat: Chat
    client_id: number
  }

  if (!stored_data) {
    console.error('Chat initialization data not found for batch ID:', batch_id)
    return
  }

  // Now directly use the current_chat instead of searching for it
  const message_text = stored_data.text
  const current_chat = stored_data.current_chat

  if (!current_chat) {
    console.error('Chat configuration not found')
    return
  }

  if (chatbot?.wait_until_ready) {
    await chatbot.wait_until_ready()
  }

  await initialize_chat({
    message: message_text,
    chat: current_chat
  })

  // Clean up the storage entry after using it
  await browser.storage.local.remove(storage_key)

  if (chatbot?.inject_apply_response_button) {
    chatbot.inject_apply_response_button(stored_data.client_id)
  }
}

if (document.readyState == 'loading') {
  document.addEventListener('DOMContentLoaded', main)
} else {
  main()
}
