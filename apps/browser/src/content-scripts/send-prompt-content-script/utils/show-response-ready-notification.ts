export const show_response_ready_notification = async (params: {
  chatbot_name: string
}) => {
  if (!('Notification' in window) || document.hasFocus()) {
    return
  }

  let permission = Notification.permission

  if (permission == 'default') {
    permission = await Notification.requestPermission()
  }

  if (permission == 'granted') {
    const notification = new Notification(
      `CWC - ${params.chatbot_name} finished responding`,
      {
        body: 'Your response is ready. Click to view.',
        tag: 'cwc'
      }
    )

    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  }
}
