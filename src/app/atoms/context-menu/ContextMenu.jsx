import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './ContextMenu.scss';

import Tippy from '@tippyjs/react';
import 'tippy.js/animations/scale-extreme.css';

import Text from '../text/Text';
import Button from '../button/Button';
import ScrollView from '../scroll/ScrollView';

function ContextMenu({
  content, placement, maxWidth, render, afterToggle,
}) {
  const [isVisible, setVisibility] = useState(false);
  const showMenu = () => setVisibility(true);
  const hideMenu = () => setVisibility(false);

  useEffect(() => {
    if (afterToggle !== null) afterToggle(isVisible);
  }, [isVisible]);

  return (
    <Tippy
      animation="scale-extreme"
      className="context-menu"
      visible={isVisible}
      onClickOutside={hideMenu}
      content={<ScrollView invisible>{typeof content === 'function' ? content(hideMenu) : content}</ScrollView>}
      placement={placement}
      interactive
      arrow={false}
      maxWidth={maxWidth}
      duration={200}
    >
      {render(isVisible ? hideMenu : showMenu)}
    </Tippy>
  );
}

ContextMenu.defaultProps = {
  maxWidth: 'unset',
  placement: 'right',
  afterToggle: null,
};

ContextMenu.propTypes = {
  content: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.func,
  ]).isRequired,
  placement: PropTypes.oneOf(['top', 'right', 'bottom', 'left']),
  maxWidth: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  render: PropTypes.func.isRequired,
  afterToggle: PropTypes.func,
};

function MenuHeader({ children }) {
  return (
    <div className="context-menu__header">
      <Text variant="b3">{ children }</Text>
    </div>
  );
}

MenuHeader.propTypes = {
  children: PropTypes.node.isRequired,
};

function MenuItem({
  variant, iconSrc, type,
  onClick, children, disabled,
}) {
  return (
    <div className="context-menu__item">
      <Button
        variant={variant}
        iconSrc={iconSrc}
        type={type}
        onClick={onClick}
        disabled={disabled}
      >
        { children }
      </Button>
    </div>
  );
}

MenuItem.defaultProps = {
  variant: 'surface',
  iconSrc: null,
  type: 'button',
  disabled: false,
  onClick: null,
};

MenuItem.propTypes = {
  variant: PropTypes.oneOf(['surface', 'positive', 'caution', 'danger']),
  iconSrc: PropTypes.string,
  type: PropTypes.oneOf(['button', 'submit']),
  onClick: PropTypes.func,
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
};

function MenuBorder() {
  return <div style={{ borderBottom: '1px solid var(--bg-surface-border)' }}> </div>;
}

export {
  ContextMenu as default, MenuHeader, MenuItem, MenuBorder,
};
