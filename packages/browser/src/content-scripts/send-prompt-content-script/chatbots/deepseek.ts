import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'
import { show_response_ready_notification } from '../utils/show-response-ready-notification'
import { add_apply_response_button } from '../utils/add-apply-response-button'

export const deepseek: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('div.intercom-lightweight-app')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
    await new Promise((resolve) => setTimeout(resolve, 500))
  },
  set_options: async (options?: string[]) => {
    if (!options) return
    // Uncheck deep think
    const deep_think_button = Array.from(
      document.querySelectorAll('button')
    ).find(
      (button) =>
        button.textContent == 'DeepThink' || button.textContent == '深度思考'
    ) as HTMLElement
    const deep_think_button_style = window.getComputedStyle(deep_think_button)
    if (
      deep_think_button_style.getPropertyValue('color') != 'rgb(15, 17, 21)' &&
      deep_think_button_style.getPropertyValue('color') != 'rgb(249, 250, 251)'
    ) {
      deep_think_button.click()
    }

    // Uncheck search
    const search_button = Array.from(document.querySelectorAll('button')).find(
      (button) =>
        button.textContent == 'Search' || button.textContent == '联网搜索'
    ) as HTMLElement
    const search_button_style = window.getComputedStyle(search_button)
    if (
      search_button_style.getPropertyValue('color') != 'rgb(15, 17, 21)' &&
      search_button_style.getPropertyValue('color') != 'rgb(249, 250, 251)'
    ) {
      search_button.click()
    }

    await new Promise((r) => requestAnimationFrame(r))

    const supported_options = CHATBOTS['DeepSeek'].supported_options || {}
    for (const option of options) {
      if (option == 'deep-think' && supported_options['deep-think']) {
        const deep_think_button = Array.from(
          document.querySelectorAll('button')
        ).find(
          (button) =>
            button.textContent == 'DeepThink' ||
            button.textContent == '深度思考'
        ) as HTMLElement
        deep_think_button.click()
      } else if (option == 'search' && supported_options['search']) {
        const search_button = Array.from(
          document.querySelectorAll('button')
        ).find(
          (button) =>
            button.textContent == 'Search' || button.textContent == '联网搜索'
        ) as HTMLElement
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
        get_chat_turn: (f) =>
          f.parentElement?.parentElement?.querySelector(
            '.ds-markdown'
          ) as HTMLElement,
        get_code_blocks: (t) => t.querySelectorAll('pre'),
        perform_copy: (f) => {
          const copy_button = f.querySelector('.ds-icon-button') as HTMLElement
          copy_button.click()
        },
        insert_button: (f, b) =>
          f.insertBefore(b, f.children[f.children.length])
      })
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        if (
          document.querySelector(
            'input[type="file"] + div[aria-disabled="false"]'
          ) &&
          !(
            document.querySelector('textarea#chat-input') as HTMLTextAreaElement
          )?.value
        ) {
          return
        }

        show_response_ready_notification({
          chatbot_name: 'DeepSeek'
        })

        const all_footers = document.querySelectorAll(
          '.ds-flex[style="align-items: center; gap: 16px;"]'
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
