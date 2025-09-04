import { Chatbot } from '../types/chatbot'
import browser from 'webextension-polyfill'
import { show_response_ready_notification } from '../utils/show-response-ready-notification'
import { add_apply_response_button } from '../utils/add-apply-response-button'

export const open_webui: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (
          document.querySelector('#messages-container') &&
          document.visibilityState == 'visible'
        ) {
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
    const controls_button = document.querySelector(
      'button[aria-label="Controls"]'
    ) as HTMLButtonElement
    controls_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const controls_pane =
      window.innerWidth >= 1024
        ? (document.querySelector('[data-pane]:last-child') as HTMLElement)
        : (document.querySelector('div.modal') as HTMLElement)
    const system_instructions_textarea = controls_pane.querySelector(
      'textarea'
    ) as HTMLTextAreaElement
    system_instructions_textarea.value = system_instructions
    system_instructions_textarea.dispatchEvent(
      new Event('input', { bubbles: true })
    )
    system_instructions_textarea.dispatchEvent(
      new Event('change', { bubbles: true })
    )
    const close_button = controls_pane.querySelector(
      'button'
    ) as HTMLButtonElement
    close_button.click()
  },
  set_temperature: async (temperature?: number) => {
    if (!temperature) return
    const controls_button = document.querySelector(
      'button[aria-label="Controls"]'
    ) as HTMLButtonElement
    controls_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const controls_pane =
      window.innerWidth >= 1024
        ? (document.querySelector('[data-pane]:last-child') as HTMLElement)
        : (document.querySelector('div.modal') as HTMLElement)
    const pb_safe_bottom = controls_pane.querySelector(
      '.pb-safe-bottom'
    ) as HTMLElement
    const fifth_div = pb_safe_bottom.querySelector(
      'div:nth-child(5)'
    ) as HTMLElement
    const button = fifth_div.querySelector('button') as HTMLElement
    button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const input = fifth_div.querySelector('input') as HTMLInputElement
    input.value = temperature.toString()
    input.dispatchEvent(new Event('change', { bubbles: true }))
    const close_button = controls_pane.querySelector(
      'button'
    ) as HTMLButtonElement
    close_button.click()
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_top_p: async (top_p?: number) => {
    if (!top_p) return
    const controls_button = document.querySelector(
      'button[aria-label="Controls"]'
    ) as HTMLButtonElement
    controls_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const controls_pane =
      window.innerWidth >= 1024
        ? (document.querySelector('[data-pane]:last-child') as HTMLElement)
        : (document.querySelector('div.modal') as HTMLElement)
    const pb_safe_bottom = controls_pane.querySelector(
      '.pb-safe-bottom'
    ) as HTMLElement
    const fifth_div = pb_safe_bottom.querySelector(
      'div:nth-child(12)'
    ) as HTMLElement
    const button = fifth_div.querySelector('button') as HTMLElement
    button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const input = fifth_div.querySelector('input') as HTMLInputElement
    input.value = top_p.toString()
    input.dispatchEvent(new Event('change', { bubbles: true }))
    const close_button = controls_pane.querySelector(
      'button'
    ) as HTMLButtonElement
    close_button.click()
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_model: async (model?: string) => {
    if (!model) return
    const model_selector_button = document.querySelector(
      'button#model-selector-0-button'
    ) as HTMLElement
    model_selector_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const model_selector_menu = document.querySelector(
      'div[aria-labelledby="model-selector-0-button"]'
    ) as HTMLElement
    const model_button = model_selector_menu.querySelector(
      `button[data-value="${model}"]`
    ) as HTMLElement
    if (model_button) {
      model_button.click()
    }
    model_selector_button.click()
    await new Promise((r) => requestAnimationFrame(r))
  },
  inject_apply_response_button: (client_id: number) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id,
        footer,
        get_chat_turn: (f) =>
          f.parentElement?.querySelector(
            '#response-content-container'
          ) as HTMLElement,
        get_code_blocks: (t) => t.querySelectorAll('.cm-content'),
        get_code_from_block: (b) => b.querySelector('.cm-line')?.textContent,
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button.copy-response-button'
          ) as HTMLElement
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
            'path[d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm6-2.438c0-.724.588-1.312 1.313-1.312h4.874c.725 0 1.313.588 1.313 1.313v4.874c0 .725-.588 1.313-1.313 1.313H9.564a1.312 1.312 0 01-1.313-1.313V9.564z"]'
          )
        ) {
          return
        }

        show_response_ready_notification({ chatbot_name: 'Open WebUI' })

        const all_footers = document.querySelectorAll('.chat-assistant + div')
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
