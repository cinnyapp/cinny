// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import FocusTrap from 'focus-trap-react';
import { Box, Button, config, Menu, PopOut, RectCords, Text } from 'folds';
import React, { MouseEventHandler, ReactNode, useState } from 'react';
import { stopPropagation } from '../utils/keyboard';

type HexColorPickerPopOutProps = {
  children: (onOpen: MouseEventHandler<HTMLElement>, opened: boolean) => ReactNode;
  picker: ReactNode;
  onRemove?: () => void;
};
export function HexColorPickerPopOut({ picker, onRemove, children }: HexColorPickerPopOutProps) {
  const [cords, setCords] = useState<RectCords>();

  const handleOpen: MouseEventHandler<HTMLElement> = (evt) => {
    setCords(evt.currentTarget.getBoundingClientRect());
  };

  return (
    <PopOut
      anchor={cords}
      position="Bottom"
      align="Center"
      content={
        <FocusTrap
          focusTrapOptions={{
            onDeactivate: () => setCords(undefined),
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Menu
            style={{
              padding: config.space.S100,
              borderRadius: config.radii.R500,
              overflow: 'initial',
            }}
          >
            <Box direction="Column" gap="200">
              {picker}
              {onRemove && (
                <Button
                  size="300"
                  variant="Secondary"
                  fill="Soft"
                  radii="400"
                  onClick={() => onRemove()}
                >
                  <Text size="B300">Remove</Text>
                </Button>
              )}
            </Box>
          </Menu>
        </FocusTrap>
      }
    >
      {children(handleOpen, !!cords)}
    </PopOut>
  );
}
