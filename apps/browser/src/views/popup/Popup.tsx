import React from 'react'
import styles from './Popup.module.scss'
import { use_firefox_containers } from './use-firefox-containers'
import { use_browser_profile_name } from './use-browser-profile-name'

export const Popup: React.FC = () => {
  const {
    is_firefox,
    has_permission,
    containers,
    selected_container_id,
    request_permissions,
    handle_container_change
  } = use_firefox_containers()

  const { profile_name, handle_profile_name_change } =
    use_browser_profile_name()

  return (
    <div className={styles.popup}>
      <p className={styles['popup__title']}>Code Web Chat</p>

      <div className={styles['popup__profile-name']}>
        <label className={styles['popup__input-label']}>
          Browser Profile Name:
        </label>
        <input
          type="text"
          value={profile_name}
          onChange={handle_profile_name_change}
          className={styles['popup__profile-name-input']}
          placeholder="e.g. Work, Personal"
        />
      </div>

      {is_firefox && (
        <div className={styles['popup__firefox']}>
          {!has_permission ? (
            <button
              onClick={request_permissions}
              className={styles['popup__enable-button']}
            >
              Enable Firefox Containers
            </button>
          ) : (
            <>
              <label className={styles['popup__select-label']}>
                Autofill prompts in container:
              </label>
              <select
                value={selected_container_id}
                onChange={handle_container_change}
                className={styles['popup__container-select']}
              >
                <option value="">Default (no container)</option>
                {containers.map((c) => (
                  <option key={c.cookieStoreId} value={c.cookieStoreId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}
    </div>
  )
}
