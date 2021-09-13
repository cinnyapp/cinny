import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';

import initMatrix from '../../../client/initMatrix';
import colorMXID from '../../../util/colorMXID';

import Button from '../../atoms/button/Button';
import ImageUpload from '../../molecules/image-upload/ImageUpload';
import Input from '../../atoms/input/Input';
import Text from '../../atoms/text/Text';

import './ProfileEditor.scss';

// TODO Fix bug that prevents 'Save' button from enabling up until second changed.
function ProfileEditor({
  userId,
}) {
  const mx = initMatrix.matrixClient;
  const displayNameRef = useRef(null);
  const bgColor = colorMXID(userId);
  const [avatarSrc, setAvatarSrc] = useState(mx.mxcUrlToHttp(mx.getUser(mx.getUserId()).avatarUrl, 80, 80, 'crop') || null);
  const [disabled, setDisabled] = useState(true);

  let username = mx.getUser(mx.getUserId()).displayName;

  // Sets avatar URL and updates the avatar component in profile editor to reflect new upload
  function handleAvatarUpload(url) {
    if (url === null) {
      if (confirm('Are you sure you want to remove avatar?')) {
        mx.setAvatarUrl('');
        setAvatarSrc(null);
      }
      return;
    }
    mx.setAvatarUrl(url);
    setAvatarSrc(mx.mxcUrlToHttp(url, 80, 80, 'crop'));
  }

  function saveDisplayName() {
    const newDisplayName = displayNameRef.current.value;
    if (newDisplayName !== null && newDisplayName !== username) {
      mx.setDisplayName(newDisplayName);
      username = newDisplayName;
      setDisabled(true);
    }
  }

  function onDisplayNameInputChange() {
    setDisabled(username === displayNameRef.current.value || displayNameRef.current.value == null);
  }
  function cancelDisplayNameChanges() {
    displayNameRef.current.value = username;
    onDisplayNameInputChange();
  }

  return (
    <form
      className="profile-editor"
      onSubmit={(e) => { e.preventDefault(); saveDisplayName(); }}
    >
      <ImageUpload
        text={username}
        bgColor={bgColor}
        imageSrc={avatarSrc}
        onUpload={handleAvatarUpload}
        onRequestRemove={() => handleAvatarUpload(null)}
      />
      <div className="profile-editor__input-wrapper">
        <Input
          label={`Display name of ${mx.getUserId()}`}
          onChange={onDisplayNameInputChange}
          value={mx.getUser(mx.getUserId()).displayName}
          forwardRef={displayNameRef}
        />
        <Button variant="primary" type="submit" disabled={disabled}>Save</Button>
        <Button onClick={cancelDisplayNameChanges}>Cancel</Button>
      </div>
    </form>
  );
}

ProfileEditor.defaultProps = {
  userId: null,
};

ProfileEditor.propTypes = {
  userId: PropTypes.string,
};

export default ProfileEditor;
