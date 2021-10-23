import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './SegmentedControls.scss';

import { blurOnBubbling } from '../button/script';

import Text from '../text/Text';
import RawIcon from '../system-icons/RawIcon';

function SegmentedControls({
  selected, segments, onSelect,
}) {
  const [select, setSelect] = useState(selected);

  function selectSegment(segmentIndex) {
    setSelect(segmentIndex);
    onSelect(segmentIndex);
  }

  useEffect(() => {
    setSelect(selected);
  }, [selected]);

  return (
    <div className="segmented-controls">
      {
        segments.map((segment, index) => (
          <button
            key={Math.random().toString(20).substr(2, 6)}
            className={`segment-btn${select === index ? ' segment-btn--active' : ''}`}
            type="button"
            onClick={() => selectSegment(index)}
            onMouseUp={(e) => blurOnBubbling(e, '.segment-btn')}
          >
            <div className="segment-btn__base">
              {segment.iconSrc && <RawIcon size="small" src={segment.iconSrc} />}
              {segment.text && <Text variant="b2">{segment.text}</Text>}
            </div>
          </button>
        ))
      }
    </div>
  );
}

SegmentedControls.propTypes = {
  selected: PropTypes.number.isRequired,
  segments: PropTypes.arrayOf(PropTypes.shape({
    iconSrc: PropTypes.string,
    text: PropTypes.string,
  })).isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default SegmentedControls;
