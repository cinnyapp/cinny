import { Box, ContainerColor, Text } from 'folds';
import React, { ReactNode } from 'react';
import classNames from 'classnames';
import { BreakWord } from '../../styles/Text.css';
import { ContainerColor as ContainerClr } from '../../styles/ContainerColor.css';
import * as css from './styles.css';

type InfoCardProps = {
  variant?: ContainerColor;
  title?: ReactNode;
  description?: ReactNode;
  before?: ReactNode;
  beforeAlign?: 'Start' | 'Center';
  after?: ReactNode;
  children?: ReactNode;
};
export function InfoCard({
  variant = 'Primary',
  title,
  description,
  before,
  beforeAlign = 'Start',
  after,
  children,
}: InfoCardProps) {
  return (
    <Box
      direction="Column"
      className={classNames(css.InfoCard, ContainerClr({ variant }))}
      gap="300"
    >
      <Box gap="200" alignItems="Center">
        {before && (
          <Box shrink="No" alignSelf={beforeAlign}>
            {before}
          </Box>
        )}
        <Box grow="Yes" direction="Column" gap="100">
          {title && (
            <Text size="L400" className={BreakWord}>
              {title}
            </Text>
          )}
          {description && (
            <Text size="T200" className={BreakWord}>
              {description}
            </Text>
          )}
        </Box>
        {after && <Box shrink="No">{after}</Box>}
      </Box>
      {children}
    </Box>
  );
}
