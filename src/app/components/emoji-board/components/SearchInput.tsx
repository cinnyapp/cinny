import React, { ChangeEventHandler, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Chip, Icon, Icons, Text } from 'folds';
import { mobileOrTablet } from '../../../utils/user-agent';

type SearchInputProps = {
  query?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  allowTextCustomEmoji?: boolean;
  onTextCustomEmojiSelect?: (text: string) => void;
};
export function SearchInput({
  query,
  onChange,
  allowTextCustomEmoji,
  onTextCustomEmojiSelect,
}: SearchInputProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleReact = () => {
    const textEmoji = inputRef.current?.value.trim();
    if (!textEmoji) return;
    onTextCustomEmojiSelect?.(textEmoji);
  };

  return (
    <Input
      ref={inputRef}
      variant="SurfaceVariant"
      size="400"
      placeholder={allowTextCustomEmoji ? t('emoji.searchOrTextReaction') : t('common.search')}
      maxLength={50}
      after={
        allowTextCustomEmoji && query ? (
          <Chip
            variant="Primary"
            radii="Pill"
            after={<Icon src={Icons.ArrowRight} size="50" />}
            outlined
            onClick={handleReact}
          >
            <Text size="L400">{t('emoji.react')}</Text>
          </Chip>
        ) : (
          <Icon src={Icons.Search} size="50" />
        )
      }
      onChange={onChange}
      autoFocus={!mobileOrTablet()}
    />
  );
}
