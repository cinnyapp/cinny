import React from 'react';
import PropTypes from 'prop-types';
import RawIcon from '../../../atoms/system-icons/RawIcon';
import VLCIC from '../../../../../public/res/ic/outlined/vlc.svg';
import VolumeFullIC from '../../../../../public/res/ic/outlined/volume-full.svg';
import FileIC from '../../../../../public/res/ic/outlined/file.svg';
import Text from '../../../atoms/text/Text';
import { bytesToSize } from '../../../../util/common';

function FileAttachedIndicator({
  attachmentOrUi,
  uploadProgressRef,
}) {
  if (typeof attachmentOrUi !== 'object') return null;

  const fileType = attachmentOrUi.type.slice(0, attachmentOrUi.type.indexOf('/'));
  return (
    <div className="room-attachment">
      <div className={`room-attachment__preview${fileType !== 'image' ? ' room-attachment__icon' : ''}`}>
        {fileType === 'image' && <img alt={attachmentOrUi.name} src={URL.createObjectURL(attachmentOrUi)} />}
        {fileType === 'video' && <RawIcon src={VLCIC} />}
        {fileType === 'audio' && <RawIcon src={VolumeFullIC} />}
        {fileType !== 'image' && fileType !== 'video' && fileType !== 'audio' && <RawIcon src={FileIC} />}
      </div>
      <div className="room-attachment__info">
        <Text variant="b1">{attachmentOrUi.name}</Text>
        <Text variant="b3"><span ref={uploadProgressRef}>{`size: ${bytesToSize(attachmentOrUi.size)}`}</span></Text>
      </div>
    </div>
  );
}

FileAttachedIndicator.propTypes = {
  attachmentOrUi: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  uploadProgressRef: PropTypes.shape().isRequired,
};

export default FileAttachedIndicator;
