import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import './ViewSource.scss';

import { useTranslation } from 'react-i18next';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';

import IconButton from '../../atoms/button/IconButton';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import ScrollView from '../../atoms/scroll/ScrollView';
import PopupWindow from '../../molecules/popup-window/PopupWindow';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

import '../../i18n';

function ViewSourceBlock({ title, json }) {
  return (
    <div className="view-source__card">
      <MenuHeader>{title}</MenuHeader>
      <ScrollView horizontal vertical={false} autoHide>
        <pre className="text text-b1">
          <code className="language-json">
            {JSON.stringify(json, null, 2)}
          </code>
        </pre>
      </ScrollView>
    </div>
  );
}
ViewSourceBlock.propTypes = {
  title: PropTypes.string.isRequired,
  json: PropTypes.shape({}).isRequired,
};

function ViewSource() {
  const [isOpen, setIsOpen] = useState(false);
  const [event, setEvent] = useState(null);
  const { t } = useTranslation();

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
    <div className="view-source">
      {event.isEncrypted() && <ViewSourceBlock title={t('Organisms.ViewSource.decrypted_source')} json={event.getEffectiveEvent()} />}
      <ViewSourceBlock title={t('Organisms.ViewSource.original_source')} json={event.event} />
    </div>
  );

  return (
    <PopupWindow
      isOpen={isOpen}
      title={t('Organisms.ViewSource.title')}
      onAfterClose={handleAfterClose}
      onRequestClose={() => setIsOpen(false)}
      contentOptions={<IconButton src={CrossIC} onClick={() => setIsOpen(false)} tooltip={t('common.close')} />}
    >
      {event ? renderViewSource() : <div />}
    </PopupWindow>
  );
}

export default ViewSource;
