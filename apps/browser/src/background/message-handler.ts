import {
  WebSocketMessage,
  InitializeChatMessage,
  ApplyChatResponseMessage
} from '@shared/types/websocket-message'
import browser from 'webextension-polyfill'
import { send_message_to_server } from './websocket'
import { is_message } from '@/utils/is-message'

interface ChatQueueItem {
  message: InitializeChatMessage
  timeout_id?: number
}

const chat_queue: ChatQueueItem[] = []
let is_processing = false

const CHAT_INITIALIZATION_TIMEOUT = 5000

export const handle_messages = (message: WebSocketMessage) => {
  if (message.action == 'initialize-chat') {
    handle_initialize_chat_message(message as InitializeChatMessage)
  }
}

const generate_alphanumeric_id = async (
  keyspace: string,
  length: number = 3
): Promise<string> => {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let attempts = 0

  while (attempts < 1000) {
    let result = ''
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    const storage_key = `${keyspace}:${result}`
    const existing = await browser.storage.local.get(storage_key)
    if (!existing[storage_key]) {
      return result
    }
    attempts++
  }

  throw new Error('Unable to generate a unique ID after maximum attempts')
}

const process_next_chat = async () => {
  if (chat_queue.length == 0 || !is_processing) {
    is_processing = false
    return
  }

  const current_queue_item = chat_queue[0]

  if (current_queue_item.timeout_id) {
    clearTimeout(current_queue_item.timeout_id)
    current_queue_item.timeout_id = undefined
  }

  const current_chat_message = current_queue_item.message

  const batch_id = await generate_alphanumeric_id('chat-init')

  await browser.storage.local.set({
    [`chat-init:${batch_id}`]: {
      text: current_chat_message.text,
      current_chat: {
        url: current_chat_message.url,
        model: current_chat_message.model,
        temperature: current_chat_message.temperature,
        reasoning_effort: current_chat_message.reasoning_effort,
        thinking_budget: current_chat_message.thinking_budget,
        top_p: current_chat_message.top_p,
        system_instructions: current_chat_message.system_instructions,
        options: current_chat_message.options
      },
      client_id: current_chat_message.client_id,
      raw_instructions: current_chat_message.raw_instructions,
      prompt_type: current_chat_message.prompt_type
    }
  })

  const { 'selected-firefox-container': selected_firefox_container_id } =
    await browser.storage.local.get('selected-firefox-container')

  const create_tab_options: any = {
    active: true
  }

  if (selected_firefox_container_id) {
    create_tab_options.cookieStoreId = selected_firefox_container_id
  }

  // OpenRouter is a special case—model handling via search params
  if (current_chat_message.url == 'https://openrouter.ai/chat') {
    // https://openrouter.ai/chat?models=openrouter/quasar-alpha
    const search_params = new URLSearchParams()
    if (current_chat_message.model) {
      search_params.set('models', current_chat_message.model)
    }
    const open_router_url = `${
      current_chat_message.url
    }?${search_params.toString()}#cwc-${batch_id}`
    create_tab_options.url = open_router_url
    browser.tabs.create(create_tab_options)
  } else {
    create_tab_options.url = `${current_chat_message.url}#cwc-${batch_id}`
    browser.tabs.create(create_tab_options)
  }

  current_queue_item.timeout_id = setTimeout(() => {
    console.warn(
      `Chat initialization timeout for ${current_chat_message.url}. Moving to next chat.`
    )
    chat_queue.shift()
    process_next_chat()
  }, CHAT_INITIALIZATION_TIMEOUT) as unknown as number
}

const start_processing = async () => {
  if (!is_processing && chat_queue.length > 0) {
    is_processing = true
    await process_next_chat()
  }
}

const handle_initialize_chat_message = async (
  message: InitializeChatMessage
) => {
  chat_queue.push({ message })
  await start_processing()
}

const handle_chat_initialized = async () => {
  if (chat_queue.length > 0) {
    if (chat_queue[0].timeout_id) {
      clearTimeout(chat_queue[0].timeout_id)
    }
    chat_queue.shift()
    await process_next_chat()
  }
}

export const setup_message_listeners = () => {
  browser.runtime.onMessage.addListener(
    (message: any, _: any, __: any): any => {
      if (is_message(message)) {
        if (message.action == 'chat-initialized') {
          handle_chat_initialized()
        } else if (message.action == 'apply-chat-response') {
          send_message_to_server({
            action: 'apply-chat-response',
            client_id: message.client_id,
            raw_instructions: message.raw_instructions,
            edit_format: message.edit_format,
            url: message.url
          } as ApplyChatResponseMessage)
        }
      }
      return false
    }
  )
}
