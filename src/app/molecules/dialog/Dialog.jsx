import React from 'react';
import PropTypes from 'prop-types';
import './Dialog.scss';

import { twemojify } from '../../../util/twemojify';

import Text from '../../atoms/text/Text';
import Header, { TitleWrapper } from '../../atoms/header/Header';
import ScrollView from '../../atoms/scroll/ScrollView';
import RawModal from '../../atoms/modal/RawModal';

function Dialog({
  className, isOpen, title, onAfterOpen, onAfterClose,
  contentOptions, onRequestClose, closeFromOutside, children,
  invisibleScroll,
}) {
  return (
    <RawModal
      className={`${className === null ? '' : `${className} `}dialog-model`}
      isOpen={isOpen}
      onAfterOpen={onAfterOpen}
      onAfterClose={onAfterClose}
      onRequestClose={onRequestClose}
      closeFromOutside={closeFromOutside}
      size="small"
    >
      <div className="dialog">
        <div className="dialog__content">
          <Header>
            <TitleWrapper>
              {
                typeof title === 'string'
                  ? <Text variant="h2" weight="medium" primary>{twemojify(title)}</Text>
                  : title
              }
            </TitleWrapper>
            {contentOptions}
          </Header>
          <div className="dialog__content__wrapper">
            <ScrollView autoHide invisible={invisibleScroll}>
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
  onAfterOpen: null,
  onAfterClose: null,
  onRequestClose: null,
  closeFromOutside: true,
  invisibleScroll: false,
};

Dialog.propTypes = {
  className: PropTypes.string,
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.node.isRequired,
  contentOptions: PropTypes.node,
  onAfterOpen: PropTypes.func,
  onAfterClose: PropTypes.func,
  onRequestClose: PropTypes.func,
  closeFromOutside: PropTypes.bool,
  children: PropTypes.node.isRequired,
  invisibleScroll: PropTypes.bool,
};

export default Dialog;
