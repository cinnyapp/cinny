import React from 'react';
import classNames from 'classnames';
import { Box, Chip, Header, Icon, IconButton, Icons, Text, as } from 'folds';
import { useTranslation } from 'react-i18next';
import * as css from './ImageEditor.css';

export type ImageEditorProps = {
  name: string;
  url: string;
  requestClose: () => void;
};

export const ImageEditor = as<'div', ImageEditorProps>(
  ({ className, name, url, requestClose, ...props }, ref) => {
    const { t } = useTranslation('common');
    const handleApply = () => {
      //
    };

    return (
      <Box
        className={classNames(css.ImageEditor, className)}
        direction="Column"
        {...props}
        ref={ref}
      >
        <Header className={css.ImageEditorHeader} size="400">
          <Box grow="Yes" alignItems="Center" gap="200">
            <IconButton size="300" radii="300" onClick={requestClose}>
              <Icon size="50" src={Icons.ArrowLeft} />
            </IconButton>
            <Text size="T300" truncate>
              {t('imageEditor', { defaultValue: 'Image Editor' })}
            </Text>
          </Box>
          <Box shrink="No" alignItems="Center" gap="200">
            <Chip variant="Primary" radii="300" onClick={handleApply}>
              <Text size="B300">{t('save', { defaultValue: 'Save' })}</Text>
            </Chip>
          </Box>
        </Header>
        <Box
          grow="Yes"
          className={css.ImageEditorContent}
          justifyContent="Center"
          alignItems="Center"
        >
          <img className={css.Image} src={url} alt={name} />
        </Box>
      </Box>
    );
  }
);
