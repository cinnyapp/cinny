// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import React, { ComponentProps, forwardRef } from 'react';
import { Icon, IconButton, Input, config, Icons } from 'folds';
import { UseStateProvider } from '../UseStateProvider';

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'size'> & {
  size: '400' | '500';
};
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ variant = 'Background', size, style, after, ...props }, ref) => {
    const paddingRight: string = size === '500' ? config.space.S300 : config.space.S200;

    return (
      <UseStateProvider initial={false}>
        {(visible, setVisible) => (
          <Input
            {...props}
            ref={ref}
            style={{ paddingRight, ...style }}
            type={visible ? 'text' : 'password'}
            size={size}
            variant={variant}
            after={
              <>
                {after}
                <IconButton
                  onClick={() => setVisible(!visible)}
                  type="button"
                  variant={visible ? 'Warning' : variant}
                  size="300"
                  radii="300"
                >
                  <Icon
                    style={{ opacity: config.opacity.P300 }}
                    size="100"
                    src={visible ? Icons.Eye : Icons.EyeBlind}
                  />
                </IconButton>
              </>
            }
          />
        )}
      </UseStateProvider>
    );
  }
);
