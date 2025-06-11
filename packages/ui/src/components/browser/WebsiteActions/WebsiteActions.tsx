import React, { useState } from 'react';
import styles from './WebsiteActions.module.scss';
import cn from 'classnames';
import { DebugTab } from './DebugTab';
import { LegacyTab } from './LegacyTab';

type Props = {
  is_loading?: boolean;
  has_content: boolean;
  is_saved: boolean;
  on_save: () => void;
  on_remove: () => void;
};

export const WebsiteActions: React.FC<Props> = (props) => {
  const [activeTab, setActiveTab] = useState<'debug' | 'legacy'>('debug');

  // It's important to handle the loading state for the LegacyTab.
  // If LegacyTab is active and is_loading is undefined, we might want to show a loading state.
  // Or, if props.is_loading is undefined only when the component is initializing,
  // we might not need this check here if LegacyTab handles its own undefined is_loading.
  // For now, let's assume LegacyTab handles undefined is_loading as per its original implementation.
  // The prompt suggested: if (props.is_loading === undefined && activeTab === 'legacy')
  // This means the blank div only shows if legacy tab is active AND is_loading is undefined.
  // LegacyTab itself has: if (is_loading === undefined) { return <div className={styles.container} />; }
  // So, this check might be redundant if LegacyTab is already handling it.
  // Let's rely on LegacyTab to handle its own loading state based on is_loading prop.

  return (
    <div className={styles.container}>
      <div className={styles.tabNavigation}> {/* Define styles.tabNavigation */}
        <button
          onClick={() => setActiveTab('debug')}
          className={cn(styles.tabButton, activeTab === 'debug' ? styles.activeTabButton : '')} // Define these styles
        >
          Debug
        </button>
        <button
          onClick={() => setActiveTab('legacy')}
          className={cn(styles.tabButton, activeTab === 'legacy' ? styles.activeTabButton : '')} // Define these styles
        >
          Legacy
        </button>
      </div>

      <div className={styles.tabContent}> {/* Define styles.tabContent */}
        {activeTab === 'debug' && <DebugTab />}
        {activeTab === 'legacy' && (
          <LegacyTab
            is_loading={props.is_loading}
            has_content={props.has_content}
            is_saved={props.is_saved}
            on_save={props.on_save}
            on_remove={props.on_remove}
          />
        )}
      </div>
    </div>
  );
};
