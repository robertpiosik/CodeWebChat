export const show_response_ready_notification = async (params: {
  chatbot_name: string
}) => {
  const NOTIFICATION_SHOWN_KEY = 'cwc_notification_shown'

  if (sessionStorage.getItem(NOTIFICATION_SHOWN_KEY)) return
  sessionStorage.setItem(NOTIFICATION_SHOWN_KEY, 'true')

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
