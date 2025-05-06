import { Chatbot } from '../types/chatbot'
import { CHATBOTS } from '@shared/constants/chatbots'

export const deepseek: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        const ds_icon = document.querySelector('.ds-icon')
        if (
          ds_icon &&
          ds_icon.parentElement &&
          ds_icon.parentElement.querySelector('img')
        ) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  set_options: async (options: string[]) => {
    const supported_options = CHATBOTS['DeepSeek'].supported_options
    let should_ensure_deep_think_is_unchecked = true
    let should_ensure_search_is_unchecked = true
    for (const option of options) {
      if (option == 'deep-think' && supported_options['deep-think']) {
        should_ensure_deep_think_is_unchecked = false
        const deep_think_button = Array.from(
          document.querySelectorAll('div[role="button"]')
        ).find(
          (button) =>
            button.textContent == 'DeepThink (R1)' ||
            button.textContent == '深度思考 (R1)'
        ) as HTMLElement
        const button_style = window.getComputedStyle(deep_think_button)
        if (
          button_style.getPropertyValue('--ds-button-color') == 'transparent'
        ) {
          deep_think_button.click()
          await new Promise((r) => requestAnimationFrame(r))
        }
      } else if (option == 'search' && supported_options['search']) {
        should_ensure_search_is_unchecked = false
        const search_button = Array.from(
          document.querySelectorAll('div[role="button"]')
        ).find(
          (button) =>
            button.textContent == 'Search' || button.textContent == '联网搜索'
        ) as HTMLElement
        const button_style = window.getComputedStyle(search_button)
        if (
          button_style.getPropertyValue('--ds-button-color') == 'transparent'
        ) {
          search_button.click()
          await new Promise((r) => requestAnimationFrame(r))
        }
      }
    }
    if (should_ensure_deep_think_is_unchecked) {
      const deep_think_button = Array.from(
        document.querySelectorAll('div[role="button"]')
      ).find(
        (button) =>
          button.textContent == 'DeepThink (R1)' ||
          button.textContent == '深度思考 (R1)'
      ) as HTMLElement
      const button_style = window.getComputedStyle(deep_think_button)
      console.log(button_style.getPropertyValue('--ds-button-color'))
      if (button_style.getPropertyValue('--ds-button-color') != 'transparent') {
        deep_think_button.click()
        await new Promise((r) => requestAnimationFrame(r))
      }
    }
    if (should_ensure_search_is_unchecked) {
      const search_button = Array.from(
        document.querySelectorAll('div[role="button"]')
      ).find(
        (button) =>
          button.textContent == 'Search' || button.textContent == '联网搜索'
      ) as HTMLElement
      const button_style = window.getComputedStyle(search_button)
      if (
        button_style.getPropertyValue('--ds-button-color') != 'transparent' &&
        button_style.getPropertyValue('--ds-button-color') != '#fff'
      ) {
        search_button.click()
        await new Promise((r) => requestAnimationFrame(r))
      }
    }
  }
}
