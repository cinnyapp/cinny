import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import './ImageUpload.scss';

import initMatrix from '../../../client/initMatrix';

import Text from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';
import Spinner from '../../atoms/spinner/Spinner';
import RawIcon from '../../atoms/system-icons/RawIcon';

import PlusIC from '../../../../public/res/ic/outlined/plus.svg';

function ImageUpload({
  text, bgColor, imageSrc, onUpload, onRequestRemove,
  size,
}) {
  const [uploadPromise, setUploadPromise] = useState(null);
  const uploadImageRef = useRef(null);

  async function uploadImage(e) {
    const file = e.target.files.item(0);
    if (file === null) return;
    try {
      const uPromise = initMatrix.matrixClient.uploadContent(file, { onlyContentUri: false });
      setUploadPromise(uPromise);

      const res = await uPromise;
      if (typeof res?.content_uri === 'string') onUpload(res.content_uri);
      setUploadPromise(null);
    } catch {
      setUploadPromise(null);
    }
    uploadImageRef.current.value = null;
  }

  function cancelUpload() {
    initMatrix.matrixClient.cancelUpload(uploadPromise);
    setUploadPromise(null);
    uploadImageRef.current.value = null;
  }

  return (
    <div className="img-upload__wrapper">
      <button
        type="button"
        className="img-upload"
        onClick={() => {
          if (uploadPromise !== null) return;
          uploadImageRef.current.click();
        }}
      >
        <Avatar
          imageSrc={imageSrc}
          text={text}
          bgColor={bgColor}
          size={size}
        />
        <div className={`img-upload__process ${uploadPromise === null ? ' img-upload__process--stopped' : ''}`}>
          {uploadPromise === null && (
            size === 'large'
              ? <Text variant="b3" weight="bold">Upload</Text>
              : <RawIcon src={PlusIC} color="white" />
          )}
          {uploadPromise !== null && <Spinner size="small" />}
        </div>
      </button>
      { (typeof imageSrc === 'string' || uploadPromise !== null) && (
        <button
          className="img-upload__btn-cancel"
          type="button"
          onClick={uploadPromise === null ? onRequestRemove : cancelUpload}
        >
          <Text variant="b3">{uploadPromise ? 'Cancel' : 'Remove'}</Text>
        </button>
      )}
      <input onChange={uploadImage} style={{ display: 'none' }} ref={uploadImageRef} type="file" />
    </div>
  );
}

ImageUpload.defaultProps = {
  text: null,
  bgColor: 'transparent',
  imageSrc: null,
  size: 'large',
};

ImageUpload.propTypes = {
  text: PropTypes.string,
  bgColor: PropTypes.string,
  imageSrc: PropTypes.string,
  onUpload: PropTypes.func.isRequired,
  onRequestRemove: PropTypes.func.isRequired,
  size: PropTypes.oneOf(['large', 'normal']),
};

export default ImageUpload;
