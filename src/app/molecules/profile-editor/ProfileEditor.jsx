import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';

import initMatrix from '../../../client/initMatrix';
import colorMXID from '../../../util/colorMXID';

import Button from '../../atoms/button/Button';
import ImageUpload from '../../atoms/image-upload/ImageUpload';
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
  const [imageSrc, updateImgSrc] = useState(mx.mxcUrlToHttp(mx.getUser(mx.getUserId()).avatarUrl));
  const [disabled, setDisabled] = useState(true);

  let username = mx.getUser(mx.getUserId()).displayName;

  // Sets avatar URL and updates the avatar component in profile editor to reflect new upload
  function handleUpload(e) {
    mx.setAvatarUrl(e.content_uri);
    updateImgSrc(mx.mxcUrlToHttp(e.content_uri));
  }

  function saveDisplayName() {
    if (displayNameRef.current.value !== null && displayNameRef.current.value !== '') {
      mx.setDisplayName(displayNameRef.current.value);
      username = displayNameRef.current.value;
      setDisabled(true);
    }
  }

  // Enables/disables save button depending on whether or not the username is different than the current.
  function onDisplayNameInputChange() {
    setDisabled((username === displayNameRef.current.value) || displayNameRef.current.value === '' || displayNameRef.current.value == null);
  }

  return (
    <form className="profile-editor">
      <ImageUpload text={username} bgColor={bgColor} imageSrc={imageSrc} onUpload={handleUpload} />
      <div className="display-name-input-container">
        <Text variant="b3">
          Display name of&nbsp;
          {mx.getUserId()}
        </Text>
        <Input id="display-name-input" onChange={onDisplayNameInputChange} placeholder={mx.getUser(mx.getUserId()).displayName} forwardRef={displayNameRef} />
      </div>
      <Button variant="primary" onClick={saveDisplayName} disabled={disabled}>Save</Button>
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
