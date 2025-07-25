import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'
import browser from 'webextension-polyfill'
import {
  apply_chat_response_button_style,
  set_button_disabled_state
} from '../utils/apply-response-styles'
import { Message } from '@/types/messages'
import { is_eligible_code_block } from '../utils/is-eligible-code-block'
import {
  apply_response_button_text,
  apply_response_button_title
} from '../constants/copy'
import { show_response_ready_notification } from '../utils/show-response-ready-notification'

export const yuanbao: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('.input-guide-v2')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
    await new Promise((resolve) => setTimeout(resolve, 500))
  },
  set_model: async (model?: string) => {
    if(!model) return
    const model_selector_button = document.querySelector(
      'button[dt-button-id="model_switch"]'
    ) as HTMLElement
    model_selector_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const model_buttons = document.querySelectorAll(
      '.switch-model-dropdown .drop-down-item'
    ) as NodeListOf<HTMLButtonElement>
    for (const button of Array.from(model_buttons)) {
      const model_name_element = button.querySelector(
        '.drop-down-item__name'
      ) as HTMLDivElement
      if (
        model_name_element.textContent ==
        (CHATBOTS['Yuanbao'].models as any)[model]
      ) {
        button.click()
        break
      }
    }
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_options: async (options?: string[]) => {
    if (!options) return
    // Uncheck DeepThink
    const deep_think_button = document.querySelector(
      'button[dt-button-id="deep_think"]'
    ) as HTMLButtonElement
    if (deep_think_button.classList.contains('checked')) {
      deep_think_button.click()
    }
    // Uncheck Search
    const search_button = document.querySelector(
      'button[dt-button-id="online_search"]'
    ) as HTMLButtonElement
    if (search_button.classList.contains('checked')) {
      search_button.click()
    }
    await new Promise((r) => requestAnimationFrame(r))
    const supported_options = CHATBOTS['Yuanbao'].supported_options
    for (const option of options) {
      if (option == 'deep-think' && supported_options['deep-think']) {
        const deep_think_button = document.querySelector(
          'button[dt-button-id="deep_think"]'
        ) as HTMLButtonElement
        deep_think_button.click()
      } else if (option == 'search' && supported_options['search']) {
        const search_button = document.querySelector(
          'button[dt-button-id="online_search"]'
        ) as HTMLButtonElement
        search_button.click()
      }
    }
    await new Promise((r) => requestAnimationFrame(r))
  },
  inject_apply_response_button: (client_id: number) => {
    const add_buttons = (params: { footer: Element }) => {
      // Check if buttons already exist by text content to avoid duplicates
      const existing_apply_response_button = Array.from(
        params.footer.querySelectorAll('button')
      ).find((btn) => btn.textContent == apply_response_button_text)

      if (existing_apply_response_button) return

      const chat_turn = params.footer.closest(
        '.agent-chat__bubble__content'
      ) as HTMLElement
      const code_blocks = chat_turn.querySelectorAll('code')
      let has_eligible_block = false
      for (const code_block of Array.from(code_blocks)) {
        const first_line_text = code_block?.textContent?.split('\n')[0]
        if (first_line_text && is_eligible_code_block(first_line_text)) {
          has_eligible_block = true
          break
        }
      }
      if (!has_eligible_block) return

      const create_apply_response_button = () => {
        const apply_response_button = document.createElement('button')
        apply_response_button.textContent = apply_response_button_text
        apply_response_button.title = apply_response_button_title
        apply_chat_response_button_style(apply_response_button)

        apply_response_button.addEventListener('click', async () => {
          set_button_disabled_state(apply_response_button)
          const copy_button = params.footer.querySelector(
            '.agent-chat__toolbar__copy'
          ) as HTMLElement
          copy_button.click()
          await new Promise((resolve) => setTimeout(resolve, 500))
          browser.runtime.sendMessage<Message>({
            action: 'apply-chat-response',
            client_id
          })
        })

        params.footer.insertBefore(
          apply_response_button,
          params.footer.children[6]
        )

        apply_response_button.focus()
      }

      create_apply_response_button()
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        if (document.querySelector('rect[x="7.71448"]')) return

        show_response_ready_notification({ chatbot_name: 'Yuanbao' })

        const all_footers = document.querySelectorAll(
          '.agent-chat__toolbar__right'
        )
        all_footers.forEach((footer) => {
          add_buttons({
            footer
          })
        })
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    })
  }
}
