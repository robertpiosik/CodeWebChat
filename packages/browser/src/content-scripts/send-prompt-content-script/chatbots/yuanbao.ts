import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'
import { debounce } from '@/utils/debounce'
import browser from 'webextension-polyfill'
import { extract_path_from_comment } from '@shared/utils/extract-path-from-comment'
import {
  apply_chat_response_button_style,
  set_button_disabled_state
} from '../utils/apply-response'
import { Message } from '@/types/messages'

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
  set_model: async (model: string) => {
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
  set_options: async (options: string[]) => {
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
    const debounced_add_buttons = debounce((params: { footer: Element }) => {
      const apply_response_button_text = 'Apply response'

      // Check if buttons already exist by text content to avoid duplicates
      const existing_apply_response_button = Array.from(
        params.footer.querySelectorAll('button')
      ).find((btn) => btn.textContent == apply_response_button_text)

      if (existing_apply_response_button) return

      const chat_turn = params.footer.closest(
        '.agent-chat__bubble__content'
      ) as HTMLElement
      const first_lines_of_code_blocks = chat_turn.querySelectorAll('code')
      let has_eligible_block = false
      for (const code_block of Array.from(first_lines_of_code_blocks)) {
        const first_line_text = code_block?.textContent?.split('\n')[0]
        if (first_line_text && extract_path_from_comment(first_line_text)) {
          has_eligible_block = true
          break
        }
      }
      if (!has_eligible_block) return

      const create_apply_response_button = () => {
        const apply_response_button = document.createElement('button')
        apply_response_button.textContent = apply_response_button_text
        apply_response_button.title =
          'Integrate changes with the codebase. You can fully revert this operation.'
        apply_chat_response_button_style(apply_response_button)

        // Add event listener for Fast replace button click
        apply_response_button.addEventListener('click', async () => {
          set_button_disabled_state(apply_response_button)
          const parent = apply_response_button.parentElement!
          const copy_button = parent.querySelector(
            '.agent-chat__toolbar__copy'
          ) as HTMLElement
          copy_button.click()
          await new Promise((resolve) => setTimeout(resolve, 500))
          browser.runtime.sendMessage<Message>({
            action: 'apply-chat-response',
            client_id: client_id
          })
        })

        params.footer.insertBefore(
          apply_response_button,
          params.footer.children[6]
        )
      }

      create_apply_response_button()
    }, 100)

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        if (
          // Stop icon of a stopping response generation button
          document.querySelector('rect[x="7.71448"]')
        ) {
          return
        }

        const all_footers = document.querySelectorAll(
          '.agent-chat__toolbar__right'
        )
        all_footers.forEach((footer) => {
          debounced_add_buttons({
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
