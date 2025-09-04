import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'
import browser from 'webextension-polyfill'
import { show_response_ready_notification } from '../utils/show-response-ready-notification'
import { add_apply_response_button } from '../utils/add-apply-response-button'

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
    if (!model) return
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
        (CHATBOTS['Yuanbao'].models as any)[model]?.label
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
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id,
        footer,
        get_chat_turn: (f) => f.closest('.agent-chat__bubble__content'),
        get_code_blocks: (t) => t.querySelectorAll('code'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            '.agent-chat__toolbar__copy'
          ) as HTMLElement
          copy_button.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[6])
      })
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        if (document.querySelector('rect[x="7.71448"]')) return

        show_response_ready_notification({ chatbot_name: 'Yuanbao' })

        const all_footers = document.querySelectorAll(
          '.agent-chat__toolbar__right'
        )
        all_footers.forEach((footer) => {
          add_buttons(footer)
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
