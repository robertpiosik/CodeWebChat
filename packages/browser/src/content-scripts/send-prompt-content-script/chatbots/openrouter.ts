import { Chatbot } from '../types/chatbot'
import browser from 'webextension-polyfill'
import { show_response_ready_notification } from '../utils/show-response-ready-notification'
import { add_apply_response_button } from '../utils/add-apply-response-button'

export const openrouter: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('textarea')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
    await new Promise((resolve) => setTimeout(resolve, 500))
  },
  enter_system_instructions: async (system_instructions?: string) => {
    if (!system_instructions) return
    const options_button = Array.from(
      document.querySelectorAll('main > div > div > div.flex-col button')
    ).find((button) => {
      const path = button.querySelector('path')
      return (
        path?.getAttribute('d') ==
        'M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z'
      )
    }) as HTMLButtonElement
    options_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const textarea = document.querySelector(
      'div[role="dialog"] textarea'
    ) as HTMLTextAreaElement
    textarea.focus()
    textarea.value = system_instructions
    textarea.dispatchEvent(new Event('change', { bubbles: true }))
    textarea.blur()
    const close_button = document.querySelector(
      'div[role="dialog"] button[data-slot="dialog-close"]'
    ) as HTMLButtonElement
    close_button.click()
  },
  set_temperature: async (temperature?: number) => {
    if (!temperature) return
    const options_button = Array.from(
      document.querySelectorAll('main > div > div > div.flex-col button')
    ).find((button) => {
      const path = button.querySelector('path')
      return (
        path?.getAttribute('d') ==
        'M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z'
      )
    }) as HTMLButtonElement
    options_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const sampling_parameters_button = Array.from(
      document.querySelectorAll('div[role="dialog"] button')
    ).find(
      (button) => button.textContent?.trim() == 'Sampling Parameters'
    ) as HTMLButtonElement
    sampling_parameters_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const temperature_div = Array.from(
      document.querySelectorAll(
        'div[role="dialog"] div.flex.justify-between.text-sm'
      )
    ).find((div) => div.textContent?.trim() == 'Temperature') as HTMLElement
    const temperature_input = temperature_div.querySelector(
      'input'
    ) as HTMLInputElement
    temperature_input.focus()
    temperature_input.value = temperature.toString()
    temperature_input.dispatchEvent(new Event('change', { bubbles: true }))
    temperature_input.blur()
    const close_button = document.querySelector(
      'div[role="dialog"] button[data-slot="dialog-close"]'
    ) as HTMLButtonElement
    close_button.click()
  },
  set_top_p: async (top_p?: number) => {
    if (!top_p) return
    const options_button = Array.from(
      document.querySelectorAll('main > div > div > div.flex-col button')
    ).find((button) => {
      const path = button.querySelector('path')
      return (
        path?.getAttribute('d') ==
        'M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z'
      )
    }) as HTMLButtonElement
    options_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const sampling_parameters_button = Array.from(
      document.querySelectorAll('div[role="dialog"] button')
    ).find(
      (button) => button.textContent?.trim() == 'Sampling Parameters'
    ) as HTMLButtonElement
    sampling_parameters_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const top_p_div = Array.from(
      document.querySelectorAll(
        'div[role="dialog"] div.flex.justify-between.text-sm'
      )
    ).find((div) => div.textContent?.trim() == 'Top P') as HTMLElement
    const top_p_input = top_p_div.querySelector('input') as HTMLInputElement
    top_p_input.focus()
    top_p_input.value = top_p.toString()
    top_p_input.dispatchEvent(new Event('change', { bubbles: true }))
    top_p_input.blur()
    const close_button = document.querySelector(
      'div[role="dialog"] button[data-slot="dialog-close"]'
    ) as HTMLButtonElement
    close_button.click()
  },
  inject_apply_response_button: (client_id: number) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id,
        footer,
        get_chat_turn: (f) => f.closest('div[data-message-id]'),
        get_code_blocks: (t) => t.querySelectorAll('code'),
        perform_copy: (f) => {
          const actions = f.querySelectorAll('button')
          const copy_button = Array.from(actions).find((button) => {
            const path = button.querySelector('path')
            return (
              path?.getAttribute('d') ==
              'M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184'
            )
          }) as HTMLButtonElement
          copy_button.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[5])
      })
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        if (
          document.querySelector(
            'path[d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z"]'
          )
        ) {
          return
        }

        show_response_ready_notification({ chatbot_name: 'OpenRouter' })

        const all_footers = document.querySelectorAll(
          'div[data-message-id] > div > div:last-child > div'
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
