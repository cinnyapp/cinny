import React from 'react';
import PropTypes from 'prop-types';
import './RawModal.scss';

import Modal from 'react-modal';

import navigation from '../../../client/state/navigation';

Modal.setAppElement('#root');

function RawModal({
  className, overlayClassName,
  isOpen, size, onAfterOpen, onAfterClose,
  onRequestClose, closeFromOutside, children,
}) {
  let modalClass = (className !== null) ? `${className} ` : '';
  switch (size) {
    case 'large':
      modalClass += 'raw-modal__large ';
      break;
    case 'medium':
      modalClass += 'raw-modal__medium ';
      break;
    case 'small':
    default:
      modalClass += 'raw-modal__small ';
  }

  navigation.setIsRawModalVisible(isOpen);

  const modalOverlayClass = (overlayClassName !== null) ? `${overlayClassName} ` : '';
  return (
    <Modal
      className={`${modalClass}raw-modal`}
      overlayClassName={`${modalOverlayClass}raw-modal__overlay`}
      isOpen={isOpen}
      onAfterOpen={onAfterOpen}
      onAfterClose={onAfterClose}
      onRequestClose={onRequestClose}
      shouldCloseOnEsc={closeFromOutside}
      shouldCloseOnOverlayClick={closeFromOutside}
      shouldReturnFocusAfterClose={false}
      closeTimeoutMS={300}
    >
      {children}
    </Modal>
  );
}

RawModal.defaultProps = {
  className: null,
  overlayClassName: null,
  size: 'small',
  onAfterOpen: null,
  onAfterClose: null,
  onRequestClose: null,
  closeFromOutside: true,
};

RawModal.propTypes = {
  className: PropTypes.string,
  overlayClassName: PropTypes.string,
  isOpen: PropTypes.bool.isRequired,
  size: PropTypes.oneOf(['large', 'medium', 'small']),
  onAfterOpen: PropTypes.func,
  onAfterClose: PropTypes.func,
  onRequestClose: PropTypes.func,
  closeFromOutside: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

export default RawModal;
