import React, { useEffect, useState } from 'react';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import IconButton from '../../atoms/button/IconButton';
import Text from '../../atoms/text/Text';
import Dialog from '../../molecules/dialog/Dialog';
import './ViewSource.scss';

function ViewSource() {
  const [isOpen, setIsOpen] = useState(false);
  const [event, setEvent] = useState(null);

  useEffect(() => {
    const loadViewSource = (e) => {
      setEvent(e);
      setIsOpen(true);
    };
    navigation.on(cons.events.navigation.VIEWSOURCE_OPENED, loadViewSource);
    return () => {
      navigation.removeListener(cons.events.navigation.VIEWSOURCE_OPENED, loadViewSource);
    };
  }, []);

  const handleAfterClose = () => {
    setEvent(null);
  };

  const renderViewSource = () => (
    <div className="view-source text">
      {event.isEncrypted() && (
      <>
        <Text variant="s1" weight="medium">Decrypted source</Text>
        <pre className="scrollbar scrollbar__h scrollbar--auto-hide">
          <code className="language-json">
            {JSON.stringify(event.getEffectiveEvent(), null, 2)}
          </code>
        </pre>
      </>
      )}
      <Text variant="s1" weight="medium">Original source</Text>
      <pre className="scrollbar scrollbar__h scrollbar--auto-hide">
        <code className="language-json">
          {JSON.stringify(event.event, null, 2)}
        </code>
      </pre>
    </div>
  );

  return (
    <Dialog
      isOpen={isOpen}
      title="View source"
      onAfterClose={handleAfterClose}
      onRequestClose={() => setIsOpen(false)}
      contentOptions={<IconButton src={CrossIC} onClick={() => setIsOpen(false)} tooltip="Close" />}
    >
      {event ? renderViewSource() : <div /> }
    </Dialog>
  );
}

export default ViewSource;
