import {
  WebSocketMessage,
  InitializeChatsMessage,
  InitializeChatMessage,
  ApplyChatResponseMessage
} from '@shared/types/websocket-message'
import browser from 'webextension-polyfill'
import { send_saved_websites, send_message_to_server } from './websocket'
import { is_message } from '@/utils/is-message'
import { GetTabDataResponse } from '@/types/responses'
import { image_url_to_base64 } from '@/utils/image-url-to-base64'

interface ChatQueueItem {
  message: InitializeChatsMessage
  remaining_chats: number
  current_index: number
  timeout_id?: number
}

// Global queue of chat initialization requests
const chat_queue: ChatQueueItem[] = []
let is_processing = false

const CHAT_INITIALIZATION_TIMEOUT = 10000

export const handle_messages = (message: WebSocketMessage) => {
  if (message.action == 'initialize-chats') {
    handle_initialize_chats_message(message as InitializeChatsMessage)
  } else if (message.action == 'initialize-chat') {
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

  // Clear any existing timeout
  if (current_queue_item.timeout_id) {
    clearTimeout(current_queue_item.timeout_id)
    current_queue_item.timeout_id = undefined
  }

  if (
    current_queue_item.current_index >= current_queue_item.message.chats.length
  ) {
    // Current queue item is complete, remove it and process the next one
    chat_queue.shift()

    if (chat_queue.length > 0) {
      // Start processing the next queue item
      chat_queue[0].current_index = 0
      await process_next_chat()
    } else {
      is_processing = false
    }
    return
  }

  const current_chat =
    current_queue_item.message.chats[current_queue_item.current_index]

  // Generate a unique 3-character alphanumeric batch ID
  const batch_id = await generate_alphanumeric_id('chat-init')

  // Store only the relevant information - the text and the current chat configuration
  await browser.storage.local.set({
    [`chat-init:${batch_id}`]: {
      text: current_queue_item.message.text,
      current_chat: current_chat,
      client_id: current_queue_item.message.client_id,
      without_submission: current_queue_item.message.without_submission,
      raw_instructions: current_queue_item.message.raw_instructions,
      mode: current_queue_item.message.mode
    }
  })

  // OpenRouter is a special case, in model handling via search params
  if (current_chat.url == 'https://openrouter.ai/chat') {
    // https://openrouter.ai/chat?models=openrouter/quasar-alpha
    const search_params = new URLSearchParams()
    if (current_chat.model) {
      search_params.set('models', current_chat.model)
    }
    const open_router_url = `${
      current_chat.url
    }?${search_params.toString()}#cwc-${batch_id}`
    browser.tabs.create({
      url: open_router_url,
      active: true
    })
  } else {
    // Open the tab with the current chat URL
    browser.tabs.create({
      url: `${current_chat.url}#cwc-${batch_id}`,
      active: true
    })
  }

  // Increment the current index for the next chat
  current_queue_item.current_index++

  // Set a timeout to automatically proceed if no confirmation is received
  current_queue_item.timeout_id = setTimeout(() => {
    console.warn(
      `Chat initialization timeout for ${current_chat.url}. Moving to next chat.`
    )
    current_queue_item.remaining_chats--
    process_next_chat()
  }, CHAT_INITIALIZATION_TIMEOUT) as unknown as number
}

const start_processing = async () => {
  if (!is_processing && chat_queue.length > 0) {
    is_processing = true
    await process_next_chat()
  }
}

// Will be deprecated
const handle_initialize_chats_message = async (
  message: InitializeChatsMessage
) => {
  if (message.chats && message.chats.length > 0) {
    // Add the new request to the queue
    chat_queue.push({
      message,
      remaining_chats: message.chats.length,
      current_index: 0
    })

    // Start processing if not already doing so
    await start_processing()
  }
}

const handle_initialize_chat_message = async (
  message: InitializeChatMessage
) => {
  const chat_config = {
    url: message.url,
    model: message.model,
    temperature: message.temperature,
    reasoning_effort: message.reasoning_effort,
    thinking_budget: message.thinking_budget,
    top_p: message.top_p,
    system_instructions: message.system_instructions,
    options: message.options
  }

  const chats_message: InitializeChatsMessage = {
    action: 'initialize-chats',
    text: message.text,
    chats: [chat_config],
    client_id: message.client_id,
    without_submission: message.without_submission,
    raw_instructions: message.raw_instructions,
    edit_format: message.edit_format,
    mode: message.mode
  }

  handle_initialize_chats_message(chats_message)
}

const handle_chat_initialized = async () => {
  // Process the next chat in the queue if one exists
  if (chat_queue.length > 0) {
    // Clear the timeout since we received confirmation
    if (chat_queue[0].timeout_id) {
      clearTimeout(chat_queue[0].timeout_id)
      chat_queue[0].timeout_id = undefined
    }

    chat_queue[0].remaining_chats--
    await process_next_chat()
  }
}

const handle_get_tab_data = async (
  callback: (tab_data?: GetTabDataResponse) => void
) => {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    const url = tabs[0]?.url
    const favicon_url = tabs[0]?.favIconUrl

    if (!url || !url.startsWith('http')) {
      throw new Error('URL is not valid')
    }

    let html = ''
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
    html = await response.text()

    let favicon_base64: string | undefined
    if (favicon_url) {
      try {
        favicon_base64 = (await image_url_to_base64(favicon_url)) || undefined
      } catch (faviconError) {
        console.error('Error converting favicon to base64:', faviconError)
      }
    }

    callback({
      html,
      favicon_base64
    })
  } catch (error) {
    console.error('Error getting tab data:', error)
    callback()
  }
}

export const setup_message_listeners = () => {
  browser.runtime.onMessage.addListener(
    (message: any, _: any, sendResponse: any): any => {
      if (is_message(message)) {
        if (message.action == 'update-saved-websites' && message.websites) {
          send_saved_websites(message.websites)
        } else if (message.action == 'chat-initialized') {
          handle_chat_initialized()
        } else if (message.action == 'apply-chat-response') {
          send_message_to_server({
            action: 'apply-chat-response',
            client_id: message.client_id,
            raw_instructions: message.raw_instructions,
            edit_format: message.edit_format
          } as ApplyChatResponseMessage)
        } else if (message.action == 'get-tab-data') {
          handle_get_tab_data((tab_data) => {
            sendResponse(tab_data)
          })
          return true
        }
      }
      return false // For messages that don't need a response
    }
  )
}
