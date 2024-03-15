import React, { ComponentProps, ReactNode } from 'react';
import { Box, Scroll, Text, as } from 'folds';
import classNames from 'classnames';
import { ContainerColor } from '../../styles/ContainerColor.css';
import * as css from './style.css';

export const Content = as<'div'>(({ className, children, ...props }, ref) => (
  <Box
    grow="Yes"
    className={classNames(ContainerColor({ variant: 'Surface' }), className)}
    {...props}
    ref={ref}
  >
    <Scroll hideTrack>
      <div className={css.Content}>{children}</div>
    </Scroll>
  </Box>
));

export const ContentHeroSection = as<'div', ComponentProps<typeof Box>>(
  ({ className, ...props }, ref) => (
    <Box
      direction="Column"
      className={classNames(css.ContentHeroSection, className)}
      {...props}
      ref={ref}
    />
  )
);

export function ContentHero({
  icon,
  title,
  subTitle,
}: {
  icon: ReactNode;
  title: ReactNode;
  subTitle: ReactNode;
}) {
  return (
    <Box direction="Column" gap="400">
      <Box direction="Column" alignItems="Center" gap="200">
        {icon}
      </Box>
      <Box as="h2" direction="Column" gap="200" alignItems="Center">
        <Text align="Center" size="H2">
          {title}
        </Text>
        <Text align="Center" priority="400">
          {subTitle}
        </Text>
      </Box>
    </Box>
  );
}

export const ContentBody = as<'div'>(({ className, ...props }, ref) => (
  <div className={classNames(css.ContentBody, className)} {...props} ref={ref} />
));
