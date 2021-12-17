import React from 'react';
import PropTypes from 'prop-types';
import './Text.scss';

function Text({
  className, variant, weight,
  primary, span, children,
}) {
  const classes = [];
  if (className) classes.push(className);

  classes.push(`text text-${variant} text-${weight}`);
  if (primary) classes.push('font-primary');

  const textClass = classes.join(' ');
  if (span) return <span className={classes.join(' ')}>{ children }</span>;
  if (variant === 'h1') return <h1 className={textClass}>{ children }</h1>;
  if (variant === 'h2') return <h2 className={textClass}>{ children }</h2>;
  if (variant === 's1') return <h4 className={textClass}>{ children }</h4>;
  return <p className={textClass}>{ children }</p>;
}

Text.defaultProps = {
  className: null,
  variant: 'b1',
  weight: 'normal',
  primary: false,
  span: false,
};

Text.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(['h1', 'h2', 's1', 'b1', 'b2', 'b3']),
  weight: PropTypes.oneOf(['light', 'normal', 'medium', 'bold']),
  primary: PropTypes.bool,
  span: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

export default Text;
