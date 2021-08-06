// eslint-disable-next-line no-use-before-define
import React, { FunctionComponent } from 'react';
import './Input.scss';

import TextareaAutosize from 'react-autosize-textarea';

type InputProps = {
  id?: string;
  label?: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  state?: 'normal' | 'success' | 'error';
  name?: string;
};

type ResizableInputProps = InputProps & {
  onChange?: React.FormEventHandler<HTMLTextAreaElement>;
  onBlur?: React.FormEventHandler<HTMLTextAreaElement>;
  minHeight?: number;
  onResize?: (e: Event) => void;
};

/**
 * A non-resizable input field.
 */
export const Input: FunctionComponent<InputProps> = ({
  id = null,
  label = '',
  value = '',
  placeholder = '',
  type = 'text',
  required = false,
  onChange = null,
  onBlur = null,
  state = 'normal',
  name = '',
}: InputProps) => (
  <div className="input-container">
    {label !== '' && (
      <label className="input__label text-b2" htmlFor={id}>
        {label}
      </label>
    )}
    <input
      id={id}
      className={`input ${state !== 'normal' ? ` input--${state}` : ''}`}
      type={type}
      placeholder={placeholder}
      required={required}
      defaultValue={value}
      autoComplete="off"
      name={name}
      onChange={onChange}
      onBlur={onBlur}
    />
  </div>
);

/**
 * A resizable input field.
 */
export const ResizableInput: FunctionComponent<ResizableInputProps> = ({
  id = null,
  label = '',
  value = '',
  placeholder = '',
  type = 'text',
  required = false,
  onChange = null,
  onBlur = null,
  state = 'normal',
  name = '',
  minHeight = 46,
  onResize = null,
}: ResizableInputProps) => (
  <div className="input-container">
    {label !== '' && (
      <label className="input__label text-b2" htmlFor={id}>
        {label}
      </label>
    )}
    <TextareaAutosize
      style={{ minHeight: `${minHeight}px` }}
      id={id}
      className={`input input--resizable${
        state !== 'normal' ? ` input--${state}` : ''
      }`}
      type={type}
      placeholder={placeholder}
      required={required}
      defaultValue={value}
      autoComplete="off"
      name={name}
      onChange={onChange}
      onBlur={onBlur}
      onResize={onResize}
    />
  </div>
);

export default Input;
