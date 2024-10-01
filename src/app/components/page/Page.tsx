import React, { ComponentProps, MutableRefObject, ReactNode } from 'react';
import { Box, Header, Line, Scroll, Text, as } from 'folds';
import classNames from 'classnames';
import { ContainerColor } from '../../styles/ContainerColor.css';
import * as css from './style.css';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';

type PageRootProps = {
  nav: ReactNode;
  children: ReactNode;
};

export function PageRoot({ nav, children }: PageRootProps) {
  const screenSize = useScreenSizeContext();

  return (
    <Box grow="Yes" className={ContainerColor({ variant: 'Background' })}>
      {nav}
      {screenSize !== ScreenSize.Mobile && (
        <Line variant="Background" size="300" direction="Vertical" />
      )}
      {children}
    </Box>
  );
}

type ClientDrawerLayoutProps = {
  children: ReactNode;
};
export function PageNav({ size, children }: ClientDrawerLayoutProps & css.PageNavVariants) {
  const screenSize = useScreenSizeContext();
  const isMobile = screenSize === ScreenSize.Mobile;

  return (
    <Box
      grow={isMobile ? 'Yes' : undefined}
      className={css.PageNav({ size })}
      shrink={isMobile ? 'Yes' : 'No'}
    >
      <Box grow="Yes" direction="Column">
        {children}
      </Box>
    </Box>
  );
}

export const PageNavHeader = as<'header', css.PageNavHeaderVariants>(
  ({ className, outlined, ...props }, ref) => (
    <Header
      className={classNames(css.PageNavHeader({ outlined }), className)}
      variant="Background"
      size="600"
      {...props}
      ref={ref}
    />
  )
);

export function PageNavContent({
  scrollRef,
  children,
}: {
  children: ReactNode;
  scrollRef?: MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <Box grow="Yes" direction="Column">
      <Scroll
        ref={scrollRef}
        variant="Background"
        direction="Vertical"
        size="300"
        hideTrack
        visibility="Hover"
      >
        <div className={css.PageNavContent}>{children}</div>
      </Scroll>
    </Box>
  );
}

export const Page = as<'div'>(({ className, ...props }, ref) => (
  <Box
    grow="Yes"
    direction="Column"
    className={classNames(ContainerColor({ variant: 'Surface' }), className)}
    {...props}
    ref={ref}
  />
));

export const PageHeader = as<'div', css.PageHeaderVariants>(
  ({ className, outlined, balance, ...props }, ref) => (
    <Header
      as="header"
      size="600"
      className={classNames(css.PageHeader({ balance, outlined }), className)}
      {...props}
      ref={ref}
    />
  )
);

export const PageContent = as<'div'>(({ className, ...props }, ref) => (
  <div className={classNames(css.PageContent, className)} {...props} ref={ref} />
));

export const PageHeroSection = as<'div', ComponentProps<typeof Box>>(
  ({ className, ...props }, ref) => (
    <Box
      direction="Column"
      className={classNames(css.PageHeroSection, className)}
      {...props}
      ref={ref}
    />
  )
);

export function PageHero({
  icon,
  title,
  subTitle,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  subTitle: ReactNode;
  children?: ReactNode;
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
      {children}
    </Box>
  );
}

export const PageContentCenter = as<'div'>(({ className, ...props }, ref) => (
  <div className={classNames(css.PageContentCenter, className)} {...props} ref={ref} />
));
