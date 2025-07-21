export const apply_chat_response_button_style = (button: HTMLButtonElement) => {
  button.style.fontSize = '13px'
  button.style.margin = '4px 8px'
  button.style.padding = '4px 11px'
  button.style.borderRadius = '999px'
  button.style.fontWeight = '700'
  button.style.color = 'black'
  button.style.backgroundColor = '#fbb100'
  button.style.cursor = 'pointer'
  button.style.transition = 'opacity 0.2s ease-in-out'
  button.style.border = 'none'
}

export const set_button_disabled_state = (button: HTMLButtonElement) => {
  button.disabled = true
  button.style.opacity = '0.5'
  button.style.cursor = 'not-allowed'
  setTimeout(() => {
    button.disabled = false
    button.style.opacity = ''
    button.style.cursor = 'pointer'
  }, 3000)
}
