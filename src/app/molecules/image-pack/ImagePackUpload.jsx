import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import './ImagePackUpload.scss';

import { useTranslation } from 'react-i18next';
import initMatrix from '../../../client/initMatrix';
import { scaleDownImage } from '../../../util/common';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import IconButton from '../../atoms/button/IconButton';
import CirclePlusIC from '../../../../public/res/ic/outlined/circle-plus.svg';
import '../../i18n';

function ImagePackUpload({ onUpload }) {
  const mx = initMatrix.matrixClient;
  const inputRef = useRef(null);
  const shortcodeRef = useRef(null);
  const [imgFile, setImgFile] = useState(null);
  const [progress, setProgress] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    if (!imgFile) return;
    const { shortcodeInput } = evt.target;
    const shortcode = shortcodeInput.value.trim();
    if (shortcode === '') return;

    setProgress(true);
    const image = await scaleDownImage(imgFile, 512, 512);
    const url = await mx.uploadContent(image, {
      onlyContentUri: true,
    });

    onUpload(shortcode, url);
    setProgress(false);
    setImgFile(null);
    shortcodeRef.current.value = '';
  };

  const handleFileChange = (evt) => {
    const img = evt.target.files[0];
    if (!img) return;
    setImgFile(img);
    shortcodeRef.current.value = img.name.slice(0, img.name.indexOf('.'));
    shortcodeRef.current.focus();
  };
  const handleRemove = () => {
    setImgFile(null);
    inputRef.current.value = null;
    shortcodeRef.current.value = '';
  };

  return (
    <form onSubmit={handleSubmit} className="image-pack-upload">
      <input ref={inputRef} onChange={handleFileChange} style={{ display: 'none' }} type="file" accept=".png, .gif, .webp" required />
      {
        imgFile
          ? (
            <div className="image-pack-upload__file">
              <IconButton onClick={handleRemove} src={CirclePlusIC} tooltip={t('Molecules.ImagePackUpload.remove_file_tooltip')} />
              <Text>{imgFile.name}</Text>
            </div>
          )
          : <Button onClick={() => inputRef.current.click()}>{t('Molecules.ImagePackUpload.import_image_button')}</Button>
      }
      <Input forwardRef={shortcodeRef} name="shortcodeInput" placeholder={t('Molecules.ImagePackUpload.shortcode_placeholder')} required />
      <Button disabled={progress} variant="primary" type="submit">{progress ? t('Molecules.ImagePackUpload.upload_button_progress') : t('Molecules.ImagePackUpload.upload_button')}</Button>
    </form>
  );
}
ImagePackUpload.propTypes = {
  onUpload: PropTypes.func.isRequired,
};

export default ImagePackUpload;
