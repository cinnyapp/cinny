import React from "react";
import { as, MainColor } from "folds";
import classNames from "classnames";
import * as css from "./EventActionButton.css";

export const EventActionButton = as<'button', { variant?: MainColor }>(
  ({ as: AsCutoutCard = 'button', className, variant = 'Primary', ...props }, ref) => (
    <AsCutoutCard
      className={classNames(css.EventActionButton({ variant }), className)}
      {...props}
      ref={ref}
    />
  )
);
