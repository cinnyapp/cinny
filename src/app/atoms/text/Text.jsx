import React from 'react';
import PropTypes from 'prop-types';
import './Text.scss';

function Text({
  id, className, variant, children,
}) {
  const cName = className !== '' ? `${className} ` : '';
  if (variant === 'h1') return <h1 id={id === '' ? undefined : id} className={`${cName}text text-h1`}>{ children }</h1>;
  if (variant === 'h2') return <h2 id={id === '' ? undefined : id} className={`${cName}text text-h2`}>{ children }</h2>;
  if (variant === 'h2') return <h3 id={id === '' ? undefined : id} className={`${cName}text text-h3`}>{ children }</h3>;
  if (variant === 's1') return <h4 id={id === '' ? undefined : id} className={`${cName}text text-s1`}>{ children }</h4>;
  return <p id={id === '' ? undefined : id} className={`${cName}text text-${variant}`}>{ children }</p>;
}

Text.defaultProps = {
  id: '',
  className: '',
  variant: 'b1',
};

Text.propTypes = {
  id: PropTypes.string,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['h1', 'h2', 's1', 'b1', 'b2', 'b3']),
  children: PropTypes.node.isRequired,
};

export default Text;
