import { Chatbot } from '../types/chatbot'
import { CHATBOTS } from '@shared/constants/chatbots'

export const gemini: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('toolbox-drawer')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  set_model: async (model: string) => {
    if (model && model in CHATBOTS['Gemini'].models) {
      const model_selector_trigger = document.querySelector(
        'bard-logo + button'
      ) as HTMLButtonElement
      if (model_selector_trigger) {
        model_selector_trigger.click()
        await new Promise((r) => requestAnimationFrame(r))
        const menu_content =
          document.querySelector('.mat-mdc-menu-content') ||
          document.querySelector('mat-action-list')
        if (menu_content) {
          const model_options = Array.from(
            menu_content.querySelectorAll('button[mat-menu-item]')
          )
          for (const option of model_options) {
            const name_element = option.querySelector(
              '.title-and-description > span:first-child'
            )
            if (
              name_element &&
              name_element.textContent?.trim() ==
                (CHATBOTS['Gemini'].models as any)[model]
            ) {
              ;(option as HTMLElement).click()
              await new Promise((r) => requestAnimationFrame(r))
              break
            }
          }
        }
      }
    } else if (model) {
      alert(`Model "${model}" is no longer supported.`)
    }
  },
  set_options: async (options: string[]) => {
    const supported_options = CHATBOTS['Gemini'].supported_options
    for (const option of options) {
      if (option == 'canvas' && supported_options['canvas']) {
        const canvas_button = Array.from(
          document.querySelectorAll('button')
        ).find(
          (button) => button.textContent?.trim() == 'Canvas'
        ) as HTMLButtonElement
        if (canvas_button) {
          canvas_button.click()
        }
      }
    }
  }
}
