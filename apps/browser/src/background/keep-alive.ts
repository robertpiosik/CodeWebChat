import browser from 'webextension-polyfill'
import { check_and_recover_connection } from './websocket'
const ALARM_NAME = 'keep-alive'
const ALARM_PERIOD_MINUTES = 0.5 // fires every 30 seconds


export const setup_keep_alive = () => {
  if (!browser.browserAction) {
    const ensure_alarm = () => {
      chrome.alarms.get(ALARM_NAME, (alarm) => {
        if (!alarm) {
          chrome.alarms.create(ALARM_NAME, {
            delayInMinutes: ALARM_PERIOD_MINUTES,
            periodInMinutes: ALARM_PERIOD_MINUTES
          })
        }
      })
    }
    chrome.runtime.onStartup.addListener(ensure_alarm)
    chrome.runtime.onInstalled.addListener(ensure_alarm)
    ensure_alarm()

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === ALARM_NAME) {
        check_and_recover_connection()
      }

    })
  }
}
