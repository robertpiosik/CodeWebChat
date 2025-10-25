import browser from 'webextension-polyfill'

export function setup_keep_alive() {
  if (!browser.browserAction) {
    const create_keep_alive_alarm = async () => {
      try {
        chrome.alarms.create('keep-alive', {
          when: Date.now() + 1000 * 30
        }) // 30 seconds interval
      } catch (error) {
        console.error('Error creating KeepAlive alarm:', error)
      }
    }

    chrome.runtime.onStartup.addListener(create_keep_alive_alarm)
    chrome.runtime.onInstalled.addListener(create_keep_alive_alarm)
    chrome.alarms.onAlarm.addListener(() => {
      create_keep_alive_alarm()
    })
  }
}
