import React from 'react';
import cn from 'classnames';
import styles from './WebsiteActions.module.scss';

type Props = {
  is_loading?: boolean;
  has_content: boolean;
  is_saved: boolean;
  on_save: () => void;
  on_remove: () => void;
};

const LegacyTab: React.FC<Props> = ({
  is_loading,
  has_content,
  is_saved,
  on_save,
  on_remove,
}) => {
  // JSX content will be pasted here in the next step
  if (is_loading === undefined) {
    // Return an empty fragment or a minimal div if necessary, but not with styles.container
    return <></>;
  }

  return (
    <>
      {!is_loading ? (
        <>
          {has_content ? (
            <div className={styles.actions}>
              {!is_saved ? (
                <button
                  onClick={on_save}
                  className={cn(
                    styles.actions__button,
                    styles['actions__button--save']
                  )}
                >
                  Enable for context
                </button>
              ) : (
                <button
                  onClick={on_remove}
                  className={cn(
                    styles.actions__button,
                    styles['actions__button--delete']
                  )}
                >
                  Remove
                </button>
              )}
            </div>
          ) : (
            <p className={styles.message}>
              No content could be parsed from this tab.
            </p>
          )}
        </>
      ) : (
        <p className={styles.message}>Loading...</p>
      )}
    </div>
  );
};

export default LegacyTab;
