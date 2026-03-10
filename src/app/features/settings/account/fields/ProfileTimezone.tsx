import FocusTrap from 'focus-trap-react';
import { Text, Overlay, OverlayBackdrop, OverlayCenter, Dialog, Header, config, Box, IconButton, Icon, Icons, Input, toRem, MenuItem, Button } from 'folds';
import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { CutoutCard } from '../../../../components/cutout-card';
import { SettingTile } from '../../../../components/setting-tile';
import { FieldContext } from '../Profile';
import { ProfileFieldElementProps } from './ProfileFieldContext';

export function ProfileTimezone({
  value, setValue, busy,
}: ProfileFieldElementProps<'us.cloke.msc4175.tz', FieldContext>) {
  const disabled = busy;

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [query, setQuery] = useState('');

  // @ts-expect-error Intl.supportedValuesOf isn't in the types yet
  const timezones = useMemo(() => Intl.supportedValuesOf('timeZone') as string[], []);
  const filteredTimezones = timezones.filter(
    (timezone) => query.length === 0 || timezone.toLowerCase().replace('_', ' ').includes(query.toLowerCase())
  );

  const handleSelect = useCallback(
    (timezone: string) => {
      setOverlayOpen(false);
      setValue(timezone);
    },
    [setOverlayOpen, setValue]
  );

  useEffect(() => {
    if (overlayOpen) {
      const scrollView = scrollRef.current;
      const focusedItem = scrollView?.querySelector(`[data-tz="${value}"]`);

      if (value && focusedItem && scrollView) {
        focusedItem.scrollIntoView({
          block: 'center',
        });
      }
    }
  }, [scrollRef, value, overlayOpen]);

  return (
    <SettingTile
      title={<Text as="span" size="L400">
        Timezone
      </Text>}
    >
      <Overlay open={overlayOpen} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: () => inputRef.current,
              allowOutsideClick: true,
              clickOutsideDeactivates: true,
              onDeactivate: () => setOverlayOpen(false),
              escapeDeactivates: (evt) => {
                evt.stopPropagation();
                return true;
              },
            }}
          >
            <Dialog variant="Surface">
              <Header
                style={{
                  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                  borderBottomWidth: config.borderWidth.B300,
                }}
                variant="Surface"
                size="500"
              >
                <Box grow="Yes">
                  <Text size="H4">Choose a Timezone</Text>
                </Box>
                <IconButton size="300" onClick={() => setOverlayOpen(false)} radii="300">
                  <Icon src={Icons.Cross} />
                </IconButton>
              </Header>
              <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
                <Input
                  ref={inputRef}
                  size="500"
                  variant="Background"
                  radii="400"
                  outlined
                  placeholder="Search"
                  before={<Icon size="200" src={Icons.Search} />}
                  value={query}
                  onChange={(evt) => setQuery(evt.currentTarget.value)} />
                <CutoutCard ref={scrollRef} style={{ overflowY: 'scroll', height: toRem(300) }}>
                  {filteredTimezones.length === 0 && (
                    <Box
                      style={{ paddingTop: config.space.S700 }}
                      grow="Yes"
                      alignItems="Center"
                      justifyContent="Center"
                      direction="Column"
                      gap="100"
                    >
                      <Text size="H6" align="Center">
                        No Results
                      </Text>
                    </Box>
                  )}
                  {filteredTimezones.map((timezone) => (
                    <MenuItem
                      key={timezone}
                      data-tz={timezone}
                      variant={timezone === value ? 'Success' : 'Surface'}
                      fill={timezone === value ? 'Soft' : 'None'}
                      size="300"
                      radii="0"
                      after={<Icon size="50" src={Icons.ChevronRight} />}
                      onClick={() => handleSelect(timezone)}
                    >
                      <Box grow="Yes">
                        <Text size="T200" truncate>
                          {timezone}
                        </Text>
                      </Box>
                    </MenuItem>
                  ))}
                </CutoutCard>
              </Box>
            </Dialog>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <Box gap="200">
        <Button
          variant="Secondary"
          fill="Soft"
          size="300"
          radii="300"
          outlined
          disabled={disabled}
          onClick={() => setOverlayOpen(true)}
          after={<Icon size="100" src={Icons.ChevronRight} />}
        >
          <Text size="B300">{value ?? 'Set Timezone'}</Text>
        </Button>
        {value && (
          <Button
            size="300"
            variant="Critical"
            fill="None"
            radii="300"
            disabled={disabled}
            onClick={() => setValue(undefined)}
          >
            <Text size="B300">Remove Timezone</Text>
          </Button>
        )}
      </Box>
    </SettingTile>
  );
}
