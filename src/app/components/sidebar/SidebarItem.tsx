import classNames from 'classnames';
import { as, Avatar, Text, Tooltip, TooltipProvider, toRem } from 'folds';
import React, { ComponentProps, ReactNode, RefCallback } from 'react';
import * as css from './Sidebar.css';

export const SidebarItem = as<'div', css.SidebarItemVariants>(
  ({ as: AsSidebarAvatarBox = 'div', className, active, ...props }, ref) => (
    <AsSidebarAvatarBox
      className={classNames(css.SidebarItem({ active }), className)}
      {...props}
      ref={ref}
    />
  )
);

export const SidebarItemBadge = as<'div', css.SidebarItemBadgeVariants>(
  ({ as: AsSidebarBadgeBox = 'div', className, hasCount, ...props }, ref) => (
    <AsSidebarBadgeBox
      className={classNames(css.SidebarItemBadge({ hasCount }), className)}
      {...props}
      ref={ref}
    />
  )
);

export function SidebarItemTooltip({
  tooltip,
  children,
}: {
  tooltip?: ReactNode | string;
  children: (triggerRef: RefCallback<HTMLElement | SVGElement>) => ReactNode;
}) {
  if (!tooltip) {
    return children(() => undefined);
  }

  return (
    <TooltipProvider
      delay={400}
      position="Right"
      tooltip={
        <Tooltip style={{ maxWidth: toRem(280) }}>
          <Text size="H5">{tooltip}</Text>
        </Tooltip>
      }
    >
      {children}
    </TooltipProvider>
  );
}

export const SidebarAvatar = as<'div', css.SidebarAvatarVariants & ComponentProps<typeof Avatar>>(
  ({ className, size, outlined, radii, ...props }, ref) => (
    <Avatar
      className={classNames(css.SidebarAvatar({ size, outlined }), className)}
      radii={radii}
      {...props}
      ref={ref}
    />
  )
);

export const SidebarFolder = as<'div', css.SidebarFolderVariants>(
  ({ as: AsSidebarFolder = 'div', className, state, ...props }, ref) => (
    <AsSidebarFolder
      className={classNames(css.SidebarFolder({ state }), className)}
      {...props}
      ref={ref}
    />
  )
);

export const SidebarFolderDropTarget = as<'div', css.SidebarFolderDropTargetVariants>(
  ({ as: AsSidebarFolderDropTarget = 'div', className, position, ...props }, ref) => (
    <AsSidebarFolderDropTarget
      className={classNames(css.SidebarFolderDropTarget({ position }), className)}
      {...props}
      ref={ref}
    />
  )
);
