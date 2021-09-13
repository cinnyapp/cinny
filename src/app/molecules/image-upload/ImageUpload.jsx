import React, { useRef } from 'react';
import PropTypes from 'prop-types';

import initMatrix from '../../../client/initMatrix';

import SettingsIC from '../../../../public/res/ic/outlined/settings.svg';
import Avatar from '../../atoms/avatar/Avatar';

import RawIcon from '../../atoms/system-icons/RawIcon';
import './ImageUpload.scss';

function ImageUpload({
  text, bgColor, imageSrc, onUpload,
}) {
  const uploadImageRef = useRef(null);

  // Uploads image and passes resulting URI to onUpload function provided in component props.
  function uploadImage(e) {
    const file = e.target.files.item(0);
    if (file !== null) { // TODO Add upload progress spinner
      initMatrix.matrixClient.uploadContent(file, { onlyContentUri: false }).then((res) => {
        if (res.content_uri !== null) {
          onUpload({ content_uri: res.content_uri });
        }
      }, (err) => {
        console.log(err); // TODO Replace with alert banner.
      });
    }
  }

  return (
    <button type="button" className="img-upload" onClick={() => { uploadImageRef.current.click(); }}>
      <div className="img-upload__mask">
        <Avatar
          imageSrc={imageSrc}
          text={text.slice(0, 1)}
          bgColor={bgColor}
          size="large"
        />
      </div>
      <div className="img-upload__icon">
        <RawIcon size="small" src={SettingsIC} />
      </div>
      <input onChange={uploadImage} style={{ display: 'none' }} ref={uploadImageRef} type="file" />
    </button>
  );
}

ImageUpload.defaultProps = {
  text: null,
  bgColor: 'transparent',
  imageSrc: null,
  onUpload: null,
};

ImageUpload.propTypes = {
  text: PropTypes.string,
  bgColor: PropTypes.string,
  imageSrc: PropTypes.string,
  onUpload: PropTypes.func,
};

export default ImageUpload;
