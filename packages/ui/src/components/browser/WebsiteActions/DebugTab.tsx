import React, { useState } from 'react';
import styles from './WebsiteActions.module.scss'; // Assuming you might reuse some styles

export const DebugTab: React.FC = () => {
  const [showPingMessage, setShowPingMessage] = useState(false);

  const handlePingClick = () => {
    setShowPingMessage(true);
  };

  return (
    <> {/* Or a new style class */}
      <button onClick={handlePingClick} className={styles.actions__button}> {/* Assuming button style reuse */}
        ping
      </button>
      {showPingMessage && (
        <div className={styles.message}> {/* Assuming message style reuse */}
          Ping Clicked
        </div>
      )}
    </>
  );
};
