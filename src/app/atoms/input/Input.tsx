import React, { FunctionComponent } from "react";
import PropTypes from "prop-types";
import "./Input.scss";

import TextareaAutosize from "react-autosize-textarea";

type InputProps = {
  id?: string;
  label?: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  state?: "normal" | "success" | "error";
};

type ResizableInputProps = InputProps & {
  onChange?: React.FormEventHandler<HTMLTextAreaElement>;
  minHeight?: number;
  onResize?: (e: Event) => void;
};

/**
 * A non-resizable input field.
 */
export const Input: FunctionComponent<InputProps> = ({
  id = null,
  label = "",
  value = "",
  placeholder = "",
  type = "text",
  required = false,
  onChange = null,
  state = "normal",
}) => {
  return (
    <div className="input-container">
      {label !== "" && (
        <label className="input__label text-b2" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={`input ${state !== "normal" ? ` input--${state}` : ""}`}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={value}
        autoComplete="off"
        onChange={onChange}
      />
    </div>
  );
};

/**
 * A resizable input field.
 */
export const ResizableInput: FunctionComponent<ResizableInputProps> = ({
  id = null,
  label = "",
  value = "",
  placeholder = "",
  type = "text",
  required = false,
  onChange = null,
  state = "normal",
  minHeight = 46,
  onResize = null,
}) => {
  return (
    <div className="input-container">
      {label !== "" && (
        <label className="input__label text-b2" htmlFor={id}>
          {label}
        </label>
      )}
      <TextareaAutosize
        style={{ minHeight: `${minHeight}px` }}
        id={id}
        className={`input input--resizable${
          state !== "normal" ? ` input--${state}` : ""
        }`}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={value}
        autoComplete="off"
        onChange={onChange}
        onResize={onResize}
      />
    </div>
  );
};

export default Input;
