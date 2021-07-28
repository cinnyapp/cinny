import React from 'react';
import PropTypes from 'prop-types';
import './Input.scss';

import TextareaAutosize from 'react-autosize-textarea';

function Input({
  id, label, value, placeholder,
  required, type, onChange, forwardRef,
  resizable, minHeight, onResize, state,
}) {
  return (
    <div className="input-container">
      { label !== '' && <label className="input__label text-b2" htmlFor={id}>{label}</label> }
      { resizable
        ? (
          <TextareaAutosize
            style={{ minHeight: `${minHeight}px` }}
            id={id}
            className={`input input--resizable${state !== 'normal' ? ` input--${state}` : ''}`}
            ref={forwardRef}
            type={type}
            placeholder={placeholder}
            required={required}
            defaultValue={value}
            autoComplete="off"
            onChange={onChange}
            onResize={onResize}
          />
        ) : (
          <input
            ref={forwardRef}
            id={id}
            className={`input ${state !== 'normal' ? ` input--${state}` : ''}`}
            type={type}
            placeholder={placeholder}
            required={required}
            defaultValue={value}
            autoComplete="off"
            onChange={onChange}
          />
        )}
    </div>
  );
}

Input.defaultProps = {
  id: null,
  label: '',
  value: '',
  placeholder: '',
  type: 'text',
  required: false,
  onChange: null,
  forwardRef: null,
  resizable: false,
  minHeight: 46,
  onResize: null,
  state: 'normal',
};

Input.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.string,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  type: PropTypes.string,
  onChange: PropTypes.func,
  forwardRef: PropTypes.shape({}),
  resizable: PropTypes.bool,
  minHeight: PropTypes.number,
  onResize: PropTypes.func,
  state: PropTypes.oneOf(['normal', 'success', 'error']),
};

export default Input;
