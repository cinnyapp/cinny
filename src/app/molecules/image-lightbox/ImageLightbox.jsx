import React from 'react';
import PropTypes from 'prop-types';
import './ImageLightbox.scss';
import FileSaver from 'file-saver';

import Text from '../../atoms/text/Text';
import RawModal from '../../atoms/modal/RawModal';
import IconButton from '../../atoms/button/IconButton';

import DownloadSVG from '../../../../public/res/ic/outlined/download.svg';
import ExternalSVG from '../../../../public/res/ic/outlined/external.svg';

function ImageLightbox({
  url, alt, isOpen, onRequestClose,
}) {
  const handleDownload = () => {
    FileSaver.saveAs(url, alt);
  };

  return (
    <RawModal
      className="image-lightbox__modal"
      overlayClassName="image-lightbox__overlay"
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      size="large"
    >
      <div className="image-lightbox__header">
        <Text variant="b2" weight="medium">{alt}</Text>
        <IconButton onClick={() => window.open(url)} size="small" src={ExternalSVG} />
        <IconButton onClick={handleDownload} size="small" src={DownloadSVG} />
      </div>
      <div className="image-lightbox__content">
        <img src={url} alt={alt} />
      </div>
    </RawModal>
  );
}

ImageLightbox.propTypes = {
  url: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onRequestClose: PropTypes.func.isRequired,
};

export default ImageLightbox;
