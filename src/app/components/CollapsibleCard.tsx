import React, { ReactNode } from 'react';
import { Button, Icon, Icons, Text } from 'folds';
import { SequenceCard } from './sequence-card';
import { SequenceCardStyle } from '../features/settings/styles.css';
import { SettingTile } from './setting-tile';

type CollapsibleCardProps = {
  expand: boolean;
  setExpand: (expand: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  before?: ReactNode;
  children?: ReactNode;
};

export function CollapsibleCard({
  expand,
  setExpand,
  title,
  description,
  before,
  children,
}: CollapsibleCardProps) {
  return (
    <SequenceCard
      className={SequenceCardStyle}
      variant="SurfaceVariant"
      direction="Column"
      gap="400"
    >
      <SettingTile
        title={title}
        description={description}
        before={before}
        after={
          <Button
            onClick={() => setExpand(!expand)}
            variant="Secondary"
            fill="Soft"
            size="300"
            radii="300"
            outlined
            before={
              <Icon src={expand ? Icons.ChevronTop : Icons.ChevronBottom} size="100" filled />
            }
          >
            <Text size="B300">{expand ? 'Collapse' : 'Expand'}</Text>
          </Button>
        }
      />
      {expand && children}
    </SequenceCard>
  );
}
