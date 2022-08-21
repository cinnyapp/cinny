import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import Button from '../../atoms/button/Button';
import ImageUpload from '../../molecules/image-upload/ImageUpload';
import Input from '../../atoms/input/Input';

import PencilIC from '../../../../public/res/ic/outlined/pencil.svg';
import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';

import './ProfileEditor.scss';

import '../../i18n';

// TODO Fix bug that prevents 'Save' button from enabling up until second changed.
function ProfileEditor({ userId }) {
  const [isEditing, setIsEditing] = useState(false);
  const mx = initMatrix.matrixClient;
  const user = mx.getUser(mx.getUserId());

  const displayNameRef = useRef(null);
  const [avatarSrc, setAvatarSrc] = useState(user.avatarUrl ? mx.mxcUrlToHttp(user.avatarUrl, 80, 80, 'crop') : null);
  const [username, setUsername] = useState(user.displayName);
  const [disabled, setDisabled] = useState(true);

  const { t } = useTranslation();

  useEffect(() => {
    let isMounted = true;
    mx.getProfileInfo(mx.getUserId()).then((info) => {
      if (!isMounted) return;
      setAvatarSrc(info.avatar_url ? mx.mxcUrlToHttp(info.avatar_url, 80, 80, 'crop') : null);
      setUsername(info.displayname);
    });
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const handleAvatarUpload = async (url) => {
    if (url === null) {
      const isConfirmed = await confirmDialog(
        t('Organisms.ProfileEditor.remove_avatar'),
        t('Organisms.ProfileViewer.remove_avatar_confirmation'),
        t('common.remove'),
        'caution',
      );
      if (isConfirmed) {
        mx.setAvatarUrl('');
        setAvatarSrc(null);
      }
      return;
    }
    mx.setAvatarUrl(url);
    setAvatarSrc(mx.mxcUrlToHttp(url, 80, 80, 'crop'));
  };

  const saveDisplayName = () => {
    const newDisplayName = displayNameRef.current.value;
    if (newDisplayName !== null && newDisplayName !== username) {
      mx.setDisplayName(newDisplayName);
      setUsername(newDisplayName);
      setDisabled(true);
      setIsEditing(false);
    }
  };

  const onDisplayNameInputChange = () => {
    setDisabled(username === displayNameRef.current.value || displayNameRef.current.value == null);
  };
  const cancelDisplayNameChanges = () => {
    displayNameRef.current.value = username;
    onDisplayNameInputChange();
    setIsEditing(false);
  };

  const renderForm = () => (
    <form
      className="profile-editor__form"
      style={{ marginBottom: avatarSrc ? '24px' : '0' }}
      onSubmit={(e) => { e.preventDefault(); saveDisplayName(); }}
    >
      <Input
        label={t('Organisms.ProfileEditor.display_name_message', { user_name: mx.getUserId() })}
        onChange={onDisplayNameInputChange}
        value={mx.getUser(mx.getUserId()).displayName}
        forwardRef={displayNameRef}
      />
      <Button variant="primary" type="submit" disabled={disabled}>{t('common.save')}</Button>
      <Button onClick={cancelDisplayNameChanges}>{t('common.cancel')}</Button>
    </form>
  );

  const renderInfo = () => (
    <div className="profile-editor__info" style={{ marginBottom: avatarSrc ? '24px' : '0' }}>
      <div>
        <Text variant="h2" primary weight="medium">{twemojify(username)}</Text>
        <IconButton
          src={PencilIC}
          size="extra-small"
          tooltip={t('common.edit')}
          onClick={() => setIsEditing(true)}
        />
      </div>
      <Text variant="b2">{mx.getUserId()}</Text>
    </div>
  );

  return (
    <div className="profile-editor">
      <ImageUpload
        text={username}
        bgColor={colorMXID(userId)}
        imageSrc={avatarSrc}
        onUpload={handleAvatarUpload}
        onRequestRemove={() => handleAvatarUpload(null)}
      />
      {
        isEditing ? renderForm() : renderInfo()
      }
    </div>
  );
}

ProfileEditor.defaultProps = {
  userId: null,
};

ProfileEditor.propTypes = {
  userId: PropTypes.string,
};

export default ProfileEditor;
