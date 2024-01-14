import React, { ComponentProps, forwardRef } from 'react';
import { Icon, IconButton, Input, config, Icons } from 'folds';
import { UseStateProvider } from '../UseStateProvider';

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'size'> & {
  size: '400' | '500';
};
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ variant, size, style, after, ...props }, ref) => {
    const btnSize: ComponentProps<typeof IconButton>['size'] = size === '500' ? '400' : '300';

    return (
      <UseStateProvider initial={false}>
        {(visible, setVisible) => (
          <Input
            {...props}
            ref={ref}
            style={{ paddingRight: config.space.S200, ...style }}
            type={visible ? 'text' : 'password'}
            size={size}
            variant={visible ? 'Warning' : variant}
            after={
              <>
                {after}
                <IconButton
                  onClick={() => setVisible(!visible)}
                  type="button"
                  variant={visible ? 'Warning' : variant}
                  size={btnSize}
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
