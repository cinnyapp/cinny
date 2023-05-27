import classNames from 'classnames';
import { as, Avatar, Box, color, config, Text, Tooltip, TooltipProvider } from 'folds';
import React, { forwardRef, MouseEventHandler, ReactNode } from 'react';
import * as css from './Sidebar.css';

const SidebarAvatarBox = as<'div', css.SidebarAvatarBoxVariants>(
  ({ as: AsSidebarAvatarBox = 'div', className, active, ...props }, ref) => (
    <AsSidebarAvatarBox
      className={classNames(css.SidebarAvatarBox({ active }), className)}
      {...props}
      ref={ref}
    />
  )
);

export const SidebarAvatar = forwardRef<
  HTMLDivElement,
  css.SidebarAvatarBoxVariants &
    css.SidebarBadgeBoxVariants & {
      outlined?: boolean;
      avatarChildren: ReactNode;
      tooltip: ReactNode | string;
      notificationBadge?: (badgeClassName: string) => ReactNode;
      onClick?: MouseEventHandler<HTMLButtonElement>;
      onContextMenu?: MouseEventHandler<HTMLButtonElement>;
    }
>(
  (
    {
      active,
      hasCount,
      outlined,
      avatarChildren,
      tooltip,
      notificationBadge,
      onClick,
      onContextMenu,
    },
    ref
  ) => (
    <SidebarAvatarBox active={active} ref={ref}>
      <TooltipProvider
        delay={0}
        position="Right"
        tooltip={
          <Tooltip>
            <Text size="T300">{tooltip}</Text>
          </Tooltip>
        }
      >
        {(avRef) => (
          <Avatar
            ref={avRef}
            as="button"
            onClick={onClick}
            onContextMenu={onContextMenu}
            style={{
              border: outlined
                ? `${config.borderWidth.B300} solid ${color.Background.ContainerLine}`
                : undefined,
              cursor: 'pointer',
            }}
          >
            {avatarChildren}
          </Avatar>
        )}
      </TooltipProvider>
      {notificationBadge && (
        <Box className={css.SidebarBadgeBox({ hasCount })}>
          {notificationBadge(css.SidebarBadgeOutline)}
        </Box>
      )}
    </SidebarAvatarBox>
  )
);
