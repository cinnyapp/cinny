/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React, { ReactNode } from 'react';
import {
  Box,
  Scroll,
  Line,
  as,
  TooltipProvider,
  Tooltip,
  Text,
  IconButton,
  Icon,
  IconSrc,
  Icons,
} from 'folds';
import classNames from 'classnames';
import * as css from './styles.css';

export function Sidebar({ children }: { children: ReactNode }) {
  return (
    <Box className={css.Sidebar} shrink="No">
      <Scroll size="0">
        <Box className={css.SidebarContent} direction="Column" alignItems="Center" gap="100">
          {children}
        </Box>
      </Scroll>
    </Box>
  );
}

export const SidebarStack = as<'div'>(({ className, children, ...props }, ref) => (
  <Box
    className={classNames(css.SidebarStack, className)}
    direction="Column"
    alignItems="Center"
    gap="100"
    {...props}
    ref={ref}
  >
    {children}
  </Box>
));
export function SidebarDivider() {
  return <Line className={css.SidebarDivider} size="300" variant="Surface" />;
}

function SidebarBtn<T extends string>({
  active,
  label,
  id,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  id: T;
  onClick: (id: T) => void;
  children: ReactNode;
}) {
  return (
    <TooltipProvider
      delay={500}
      position="Left"
      tooltip={
        <Tooltip id={`SidebarStackItem-${id}-label`}>
          <Text size="T300">{label}</Text>
        </Tooltip>
      }
    >
      {(ref) => (
        <IconButton
          aria-pressed={active}
          aria-labelledby={`SidebarStackItem-${id}-label`}
          ref={ref}
          onClick={() => onClick(id)}
          size="400"
          radii="300"
          variant="Surface"
        >
          {children}
        </IconButton>
      )}
    </TooltipProvider>
  );
}

type GroupIconProps<T extends string> = {
  active: boolean;
  id: T;
  label: string;
  icon: IconSrc;
  onClick: (id: T) => void;
};
export function GroupIcon<T extends string>({
  active,
  id,
  label,
  icon,
  onClick,
}: GroupIconProps<T>) {
  return (
    <SidebarBtn active={active} id={id} label={label} onClick={onClick}>
      <Icon src={icon} filled={active} />
    </SidebarBtn>
  );
}

type ImageGroupIconProps<T extends string> = {
  active: boolean;
  id: T;
  label: string;
  url?: string;
  onClick: (id: T) => void;
};
export function ImageGroupIcon<T extends string>({
  active,
  id,
  label,
  url,
  onClick,
}: ImageGroupIconProps<T>) {
  return (
    <SidebarBtn active={active} id={id} label={label} onClick={onClick}>
      {url ? (
        <img className={css.SidebarBtnImg} src={url} alt={label} />
      ) : (
        <Icon src={Icons.Photo} filled={active} />
      )}
    </SidebarBtn>
  );
}
