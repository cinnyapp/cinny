import React, { useRef } from 'react';
import PropTypes from 'prop-types';

import initMatrix from '../../../client/initMatrix';

import GenIC from '../../../../public/res/ic/outlined/settings.svg';
import Avatar from '../avatar/Avatar';

import RawIcon from '../system-icons/RawIcon';
import './ImageUpload.scss';

function ImageUpload({
  text, bgColor, imageSrc, onUpload,
}) {
  const uploadImageRef = useRef(null);

  // Uploads the selected image and passes the resulting URI to the onUpload function provided in component props.
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
    <button type="button" className="img-upload-container" onClick={() => { uploadImageRef.current.click(); }}>
      <div className="img-upload-mask">
        <Avatar
          imageSrc={imageSrc}
          text={text.slice(0, 1)}
          bgColor={bgColor}
          size="large"
        />
      </div>
      <div className="img-upload-icon">
        <RawIcon size="small" src={GenIC} />
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
