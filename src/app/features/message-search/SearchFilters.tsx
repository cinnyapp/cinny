import React, {
  ChangeEventHandler,
  MouseEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Box,
  Chip,
  Text,
  Icon,
  Icons,
  Line,
  config,
  PopOut,
  Menu,
  MenuItem,
  Header,
  toRem,
  Scroll,
  Button,
  Input,
  Badge,
} from 'folds';
import { SearchOrderBy } from 'matrix-js-sdk';
import FocusTrap from 'focus-trap-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { joinRuleToIconSrc } from '../../utils/room';
import { factoryRoomIdByAtoZ } from '../../utils/sort';
import {
  SearchItemStrGetter,
  UseAsyncSearchOptions,
  useAsyncSearch,
} from '../../hooks/useAsyncSearch';
import { DebounceOptions, useDebounce } from '../../hooks/useDebounce';

type OrderButtonProps = {
  order?: string;
  onChange: (order?: string) => void;
};
function OrderButton({ order, onChange }: OrderButtonProps) {
  const [menu, setMenu] = useState(false);
  const rankOrder = order === SearchOrderBy.Rank;

  const setOrder = (o?: string) => {
    setMenu(false);
    onChange(o);
  };

  return (
    <PopOut
      open={menu}
      align="End"
      position="Bottom"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => setMenu(false),
            clickOutsideDeactivates: true,
          }}
        >
          <Menu variant="Surface">
            <Header size="300" variant="Surface" style={{ padding: `0 ${config.space.S300}` }}>
              <Text size="L400">Sort by</Text>
            </Header>
            <Line variant="Surface" size="300" />
            <div style={{ padding: config.space.S100 }}>
              <MenuItem
                onClick={() => setOrder()}
                variant="Surface"
                size="300"
                radii="300"
                aria-pressed={!rankOrder}
              >
                <Text size="T300">Recent</Text>
              </MenuItem>
              <MenuItem
                onClick={() => setOrder(SearchOrderBy.Rank)}
                variant="Surface"
                size="300"
                radii="300"
                aria-pressed={rankOrder}
              >
                <Text size="T300">Relevance</Text>
              </MenuItem>
            </div>
          </Menu>
        </FocusTrap>
      }
    >
      {(anchorRef) => (
        <Chip
          ref={anchorRef}
          variant="SurfaceVariant"
          radii="Pill"
          after={<Icon size="50" src={Icons.Sort} />}
          onClick={() => setMenu(true)}
        >
          {rankOrder ? <Text size="T200">Relevance</Text> : <Text size="T200">Recent</Text>}
        </Chip>
      )}
    </PopOut>
  );
}

const SEARCH_OPTS: UseAsyncSearchOptions = {
  limit: 20,
  matchOptions: {
    contain: true,
  },
};
const SEARCH_DEBOUNCE_OPTS: DebounceOptions = {
  wait: 200,
};

type SelectRoomButtonProps = {
  roomList: string[];
  selectedRooms?: string[];
  onChange: (rooms?: string[]) => void;
};
function SelectRoomButton({ roomList, selectedRooms, onChange }: SelectRoomButtonProps) {
  const mx = useMatrixClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [localSelected, setLocalSelected] = useState(selectedRooms);

  const getRoomNameStr: SearchItemStrGetter<string> = useCallback(
    (rId) => mx.getRoom(rId)?.name ?? rId,
    [mx]
  );

  const [searchResult, _searchRoom, resetSearch] = useAsyncSearch(
    roomList,
    getRoomNameStr,
    SEARCH_OPTS
  );
  const rooms = Array.from(searchResult?.items ?? roomList).sort(factoryRoomIdByAtoZ(mx));

  const virtualizer = useVirtualizer({
    count: rooms.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 5,
  });
  const vItems = virtualizer.getVirtualItems();

  const searchRoom = useDebounce(_searchRoom, SEARCH_DEBOUNCE_OPTS);
  const handleSearchChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    const value = evt.currentTarget.value.trim();
    if (!value) {
      resetSearch();
      return;
    }
    searchRoom(value);
  };

  const handleRoomClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const roomId = evt.currentTarget.getAttribute('data-room-id');
    if (!roomId) return;
    if (localSelected?.includes(roomId)) {
      setLocalSelected(localSelected?.filter((rId) => rId !== roomId));
      return;
    }
    const addedRooms = [...(localSelected ?? [])];
    addedRooms.push(roomId);
    setLocalSelected(addedRooms);
  };

  const handleSave = () => {
    setMenu(false);
    onChange(localSelected);
  };

  const handleDeselectAll = () => {
    setMenu(false);
    onChange(undefined);
  };

  useEffect(() => {
    setLocalSelected(selectedRooms);
    resetSearch();
  }, [menu, selectedRooms, resetSearch]);

  return (
    <PopOut
      open={menu}
      align="Center"
      position="Bottom"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => setMenu(false),
            clickOutsideDeactivates: true,
          }}
        >
          <Menu variant="Surface" style={{ width: toRem(250) }}>
            <Box direction="Column" style={{ maxHeight: toRem(450), maxWidth: toRem(300) }}>
              <Box
                shrink="No"
                direction="Column"
                gap="100"
                style={{ padding: config.space.S200, paddingBottom: 0 }}
              >
                <Text size="L400">Search</Text>
                <Input
                  onChange={handleSearchChange}
                  size="300"
                  radii="300"
                  after={
                    searchResult && searchResult.items.length > 0 ? (
                      <Badge variant="Secondary" size="400" radii="Pill">
                        <Text size="L400">{searchResult.items.length}</Text>
                      </Badge>
                    ) : null
                  }
                />
              </Box>
              <Scroll ref={scrollRef} size="300" hideTrack>
                <Box
                  direction="Column"
                  gap="100"
                  style={{
                    padding: config.space.S200,
                    paddingRight: 0,
                  }}
                >
                  {!searchResult && <Text size="L400">Rooms</Text>}
                  {searchResult && <Text size="L400">{`Rooms for "${searchResult.query}"`}</Text>}
                  {searchResult && searchResult.items.length === 0 && (
                    <Text style={{ padding: config.space.S400 }} size="T300" align="Center">
                      No match found!
                    </Text>
                  )}
                  <div
                    style={{
                      position: 'relative',
                      height: virtualizer.getTotalSize(),
                    }}
                  >
                    {vItems.map((vItem) => {
                      const roomId = rooms[vItem.index];
                      const room = mx.getRoom(roomId);
                      if (!room) return null;
                      const selected = localSelected?.includes(roomId);

                      return (
                        <div
                          style={{
                            position: 'absolute',
                            top: vItem.start,
                            left: 0,
                            width: '100%',
                            paddingBottom: config.space.S100,
                          }}
                          data-index={vItem.index}
                          ref={virtualizer.measureElement}
                          key={vItem.index}
                        >
                          <MenuItem
                            data-room-id={roomId}
                            onClick={handleRoomClick}
                            variant={selected ? 'Success' : 'Surface'}
                            size="300"
                            radii="300"
                            aria-pressed={selected}
                            before={
                              <Icon
                                size="50"
                                src={
                                  joinRuleToIconSrc(Icons, room.getJoinRule(), false) ?? Icons.Hash
                                }
                              />
                            }
                          >
                            <Text truncate size="T300">
                              {room.name}
                            </Text>
                          </MenuItem>
                        </div>
                      );
                    })}
                  </div>
                </Box>
              </Scroll>
              <Line variant="Surface" size="300" />
              <Box shrink="No" direction="Column" gap="100" style={{ padding: config.space.S200 }}>
                <Button size="300" variant="Secondary" radii="300" onClick={handleSave}>
                  {localSelected && localSelected.length > 0 ? (
                    <Text size="B300">Save ({localSelected.length})</Text>
                  ) : (
                    <Text size="B300">Save</Text>
                  )}
                </Button>
                <Button
                  size="300"
                  radii="300"
                  variant="Secondary"
                  fill="Soft"
                  onClick={handleDeselectAll}
                  disabled={!localSelected || localSelected.length === 0}
                >
                  <Text size="B300">Deselect All</Text>
                </Button>
              </Box>
            </Box>
          </Menu>
        </FocusTrap>
      }
    >
      {(anchorRef) => (
        <Chip
          onClick={() => setMenu(true)}
          ref={anchorRef}
          variant="SurfaceVariant"
          radii="Pill"
          before={<Icon size="100" src={Icons.PlusCircle} />}
        >
          <Text size="T200">Select Rooms</Text>
        </Chip>
      )}
    </PopOut>
  );
}

type SearchFiltersProps = {
  defaultRoomsFilterName: string;
  allowGlobal?: boolean;
  roomList: string[];
  selectedRooms?: string[];
  onSelectedRoomsChange: (selectedRooms?: string[]) => void;
  global?: boolean;
  onGlobalChange: (global?: boolean) => void;
  order?: string;
  onOrderChange: (order?: string) => void;
};
export function SearchFilters({
  defaultRoomsFilterName,
  allowGlobal,
  roomList,
  selectedRooms,
  onSelectedRoomsChange,
  global,
  order,
  onGlobalChange,
  onOrderChange,
}: SearchFiltersProps) {
  const mx = useMatrixClient();

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Filter</Text>
      <Box gap="200" wrap="Wrap">
        <Chip
          variant={!global ? 'Success' : 'Surface'}
          aria-pressed={!global}
          before={!global && <Icon size="100" src={Icons.Check} />}
          outlined
          onClick={() => onGlobalChange()}
        >
          <Text size="T200">{defaultRoomsFilterName}</Text>
        </Chip>
        {allowGlobal && (
          <Chip
            variant={global ? 'Success' : 'Surface'}
            aria-pressed={global}
            before={global && <Icon size="100" src={Icons.Check} />}
            outlined
            onClick={() => onGlobalChange(true)}
          >
            <Text size="T200">Global</Text>
          </Chip>
        )}
        <Line
          style={{ margin: `${config.space.S100} 0` }}
          direction="Vertical"
          variant="Surface"
          size="300"
        />
        {selectedRooms?.map((roomId) => {
          const room = mx.getRoom(roomId);
          if (!room) return null;

          return (
            <Chip
              key={roomId}
              variant="Success"
              onClick={() => onSelectedRoomsChange(selectedRooms.filter((rId) => rId !== roomId))}
              radii="Pill"
              before={
                <Icon
                  size="50"
                  src={joinRuleToIconSrc(Icons, room.getJoinRule(), false) ?? Icons.Hash}
                />
              }
              after={<Icon size="50" src={Icons.Cross} />}
            >
              <Text size="T200">{room.name}</Text>
            </Chip>
          );
        })}
        <SelectRoomButton
          roomList={roomList}
          selectedRooms={selectedRooms}
          onChange={onSelectedRoomsChange}
        />
        <Box grow="Yes" data-spacing-node />
        <OrderButton order={order} onChange={onOrderChange} />
      </Box>
    </Box>
  );
}
