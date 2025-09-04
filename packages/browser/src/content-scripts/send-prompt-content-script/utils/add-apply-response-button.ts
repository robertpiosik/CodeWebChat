import { Message } from '@/types/messages'
import { Logger } from '@shared/utils/logger'
import browser from 'webextension-polyfill'
import {
  apply_response_button_text,
  apply_response_button_title
} from '../constants/copy'
import {
  apply_chat_response_button_style,
  set_button_disabled_state
} from './apply-response-styles'
import { is_eligible_code_block } from './is-eligible-code-block'
import { show_response_ready_notification } from './show-response-ready-notification'

export function add_apply_response_button(params: {
  client_id: number
  footer: Element
  get_chat_turn: (footer: Element) => HTMLElement | null
  get_code_blocks: (chat_turn: HTMLElement) => NodeListOf<Element>
  get_code_from_block?: (code_block: Element) => string | null | undefined
  perform_copy: (footer: Element) => void | Promise<void>
  insert_button: (footer: Element, button: HTMLButtonElement) => void
  customize_button?: (button: HTMLButtonElement) => void
}) {
  const existing_apply_response_button = Array.from(
    params.footer.querySelectorAll('button')
  ).find((btn) => btn.textContent == apply_response_button_text)

  if (existing_apply_response_button) return

  const chat_turn = params.get_chat_turn(params.footer)
  if (!chat_turn) {
    Logger.error({
      function_name: 'add_apply_response_button',
      message: 'Chat turn container not found for footer',
      data: params.footer
    })
    return
  }

  const code_blocks = params.get_code_blocks(chat_turn)
  let has_eligible_block = false
  for (const code_block of Array.from(code_blocks)) {
    const code = params.get_code_from_block
      ? params.get_code_from_block(code_block)
      : code_block.textContent
    const first_line_text = code?.split('\n')[0]
    if (first_line_text && is_eligible_code_block(first_line_text)) {
      has_eligible_block = true
      break
    }
  }
  if (!has_eligible_block) return

  const apply_response_button = document.createElement('button')
  apply_response_button.textContent = apply_response_button_text
  apply_response_button.title = apply_response_button_title
  apply_chat_response_button_style(apply_response_button)
  if (params.customize_button) params.customize_button(apply_response_button)

  apply_response_button.addEventListener('click', async () => {
    set_button_disabled_state(apply_response_button)
    await params.perform_copy(params.footer)
    await new Promise((resolve) => setTimeout(resolve, 500))
    browser.runtime.sendMessage<Message>({
      action: 'apply-chat-response',
      client_id: params.client_id
    })
  })

  params.insert_button(params.footer, apply_response_button)
  apply_response_button.focus()
}

interface ResponseObserverParams {
  chatbot_name: string
  is_generating: () => boolean
  footer_selector: string
  add_buttons: (footer: Element) => void
}

export function observe_for_responses(params: ResponseObserverParams) {
  const observer = new MutationObserver(() => {
    if (params.is_generating()) {
      return
    }

    const all_footers = document.querySelectorAll(params.footer_selector)
    if (all_footers.length == 0) {
      return
    }

    show_response_ready_notification({ chatbot_name: params.chatbot_name })

    all_footers.forEach((footer) => {
      params.add_buttons(footer)
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  })
}
