import React from 'react';
import PropTypes from 'prop-types';
import './Dialog.scss';

import Text from '../../atoms/text/Text';
import Header, { TitleWrapper } from '../../atoms/header/Header';
import ScrollView from '../../atoms/scroll/ScrollView';
import RawModal from '../../atoms/modal/RawModal';

function Dialog({
  className, isOpen, title,
  contentOptions, onRequestClose, children,
}) {
  return (
    <RawModal
      className={`${className === null ? '' : `${className} `}dialog-model`}
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      size="small"
    >
      <div className="dialog">
        <div className="dialog__content">
          <Header>
            <TitleWrapper>
              <Text variant="h2">{title}</Text>
            </TitleWrapper>
            {contentOptions}
          </Header>
          <div className="dialog__content__wrapper">
            <ScrollView autoHide>
              <div className="dialog__content-container">
                {children}
              </div>
            </ScrollView>
          </div>
        </div>
      </div>
    </RawModal>
  );
}

Dialog.defaultProps = {
  className: null,
  contentOptions: null,
  onRequestClose: null,
};

Dialog.propTypes = {
  className: PropTypes.string,
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  contentOptions: PropTypes.node,
  onRequestClose: PropTypes.func,
  children: PropTypes.node.isRequired,
};

export default Dialog;
