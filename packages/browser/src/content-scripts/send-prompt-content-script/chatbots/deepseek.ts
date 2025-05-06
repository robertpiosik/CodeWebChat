import { Chatbot } from '../types/chatbot'
import { CHATBOTS } from '@shared/constants/chatbots'

export const deepseek: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
  },
  set_options: async (options: string[]) => {
    // Uncheck deep think
    const deep_think_button = Array.from(
      document.querySelectorAll('div[role="button"]')
    ).find(
      (button) =>
        button.textContent == 'DeepThink (R1)' ||
        button.textContent == '深度思考 (R1)'
    ) as HTMLElement
    const deep_think_button_style = window.getComputedStyle(deep_think_button)
    console.log(deep_think_button_style.getPropertyValue('--ds-button-color'))
    if (
      deep_think_button_style.getPropertyValue('--ds-button-color') !=
        'transparent' &&
      deep_think_button_style.getPropertyValue('--ds-button-color') != '#fff'
    ) {
      deep_think_button.click()
    }

    // Uncheck search
    const search_button = Array.from(
      document.querySelectorAll('div[role="button"]')
    ).find(
      (button) =>
        button.textContent == 'Search' || button.textContent == '联网搜索'
    ) as HTMLElement
    const search_button_style = window.getComputedStyle(search_button)
    if (
      search_button_style.getPropertyValue('--ds-button-color') !=
        'transparent' &&
      search_button_style.getPropertyValue('--ds-button-color') != '#fff'
    ) {
      search_button.click()
    }

    await new Promise((r) => requestAnimationFrame(r))

    const supported_options = CHATBOTS['DeepSeek'].supported_options || {}
    for (const option of options) {
      if (option == 'deep-think' && supported_options['deep-think']) {
        const deep_think_button = Array.from(
          document.querySelectorAll('div[role="button"]')
        ).find(
          (button) =>
            button.textContent == 'DeepThink (R1)' ||
            button.textContent == '深度思考 (R1)'
        ) as HTMLElement
        const button_style = window.getComputedStyle(deep_think_button)
        if (
          button_style.getPropertyValue('--ds-button-color') == 'transparent' ||
          button_style.getPropertyValue('--ds-button-color') == '#fff'
        ) {
          deep_think_button.click()
        }
      } else if (option == 'search' && supported_options['search']) {
        const search_button = Array.from(
          document.querySelectorAll('div[role="button"]')
        ).find(
          (button) =>
            button.textContent == 'Search' || button.textContent == '联网搜索'
        ) as HTMLElement
        const button_style = window.getComputedStyle(search_button)
        if (
          button_style.getPropertyValue('--ds-button-color') == 'transparent' ||
          button_style.getPropertyValue('--ds-button-color') == '#fff'
        ) {
          search_button.click()
        }
      }
    }

    await new Promise((r) => requestAnimationFrame(r))
  }
}
