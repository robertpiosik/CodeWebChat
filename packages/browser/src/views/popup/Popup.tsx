import React, { useEffect, useState } from 'react'
import browser from 'webextension-polyfill'
import { HtmlParser } from '../../utils/html-parser'
import { StoredWebsite, use_websites_store } from './hooks/use-websites-store'
import { SavedWebsites } from '@ui/components/browser/SavedWebsites'
import { WebsiteActions } from '@ui/components/browser/WebsiteActions'
import { GetTabDataResponse } from '@/types/responses'

export const Popup: React.FC = () => {
  const [url, set_url] = useState<string>()
  const [title, set_title] = useState<string>()
  const [content, set_content] = useState<string>() // Markdown of the current page
  const [is_loading, set_is_loading] = useState<boolean>()
  const [saved_websites, set_saved_websites] = useState<StoredWebsite[]>()
  const [is_saved, set_is_saved] = useState<boolean>(false)
  const [favicon, set_favicon] = useState<string>()

  const websites_store_hook = use_websites_store()

  useEffect(() => {
    load_saved_websites().then(() => {
      browser.tabs
        .query({ active: true, currentWindow: true })
        .then(async (tabs) => {
          const url = tabs[0]?.url!
          const title = tabs[0]?.title

          if (url.startsWith('http')) {
            set_url(url)
            const stored = await websites_store_hook.get_website(url)

            if (stored) {
              set_content(stored.content)
              set_favicon(stored.favicon)
              set_title(stored.title)
              set_is_saved(true)
              set_is_loading(false)
              return
            } else {
              set_is_loading(true)
              if (title) set_title(title)

              browser.runtime
                .sendMessage({
                  action: 'get-tab-data'
                })
                .then((response) => {
                  if (response) {
                    const res = response as GetTabDataResponse
                    if (res.favicon_base64) {
                      set_favicon(res.favicon_base64)
                    }

                    HtmlParser.parse(res.html).then((content) => {
                      if (content) set_content(content)
                      set_is_loading(false)
                    })
                  } else {
                    set_is_loading(false)
                  }
                })
            }
          } else {
            set_is_loading(false)
          }
        })
    })
  }, [])

  const load_saved_websites = async () => {
    const websites = await websites_store_hook.get_all_websites()
    set_saved_websites(websites)
  }

  const save_current_page = async () => {
    if (content && url) {
      const success = await websites_store_hook.store_website({
        url,
        title,
        content,
        favicon
      })

      if (success) {
        set_is_saved(true)
        await load_saved_websites()
      }
    }
  }

  const remove_saved_page = async (url: string) => {
    const success = await websites_store_hook.delete_website(url)
    if (success) {
      if (url == url) {
        set_is_saved(false)
      }
      await load_saved_websites()
    }
  }

  const open_website_in_new_tab = (url: string) => {
    browser.tabs.create({ url, active: false })
  }

  return (
    <div>
      {saved_websites && (
        <SavedWebsites
          websites={saved_websites}
          on_delete={remove_saved_page}
          on_link_click={open_website_in_new_tab}
        />
      )}

      <WebsiteActions
        is_loading={is_loading}
        has_content={!!content}
        is_saved={is_saved}
        on_save={save_current_page}
        on_remove={() => {
          if (url) remove_saved_page(url)
        }}
      />
    </div>
  )
}
