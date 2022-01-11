import React from 'react';
import PropTypes from 'prop-types';
import './SettingTile.scss';

import Text from '../../atoms/text/Text';

function SettingTile({ title, options, content }) {
  return (
    <div className="setting-tile">
      <div className="setting-tile__content">
        <div className="setting-tile__title">
          <Text variant="b1">{title}</Text>
        </div>
        {content}
      </div>
      {options !== null && <div className="setting-tile__options">{options}</div>}
    </div>
  );
}

SettingTile.defaultProps = {
  options: null,
  content: null,
};

SettingTile.propTypes = {
  title: PropTypes.string.isRequired,
  options: PropTypes.node,
  content: PropTypes.node,
};

export default SettingTile;
