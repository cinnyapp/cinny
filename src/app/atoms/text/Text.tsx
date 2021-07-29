import React, { FunctionComponent } from "react";
import "./Text.scss";

type TextProps = {
  id: string;
  className: "";
  variant: "h1" | "h2" | "s1" | "b1" | "b2" | "b3";
  hidden: boolean;
};

export const Text: FunctionComponent<TextProps> = ({
  id = "",
  className = "",
  variant = "b1",
  children,
  hidden = false,
}) => {
  const cName = className !== "" ? `${className} ` : "";
  if (variant === "h1")
    return (
      <h1
        id={id === "" ? undefined : id}
        className={`${cName}text text-h1`}
        hidden={hidden}
      >
        {children}
      </h1>
    );
  if (variant === "h2")
    return (
      <h2
        id={id === "" ? undefined : id}
        className={`${cName}text text-h2`}
        hidden={hidden}
      >
        {children}
      </h2>
    );
  if (variant === "s1")
    return (
      <h4
        id={id === "" ? undefined : id}
        className={`${cName}text text-s1`}
        hidden={hidden}
      >
        {children}
      </h4>
    );
  return (
    <p
      id={id === "" ? undefined : id}
      className={`${cName}text text-${variant}`}
      hidden={hidden}
    >
      {children}
    </p>
  );
};
