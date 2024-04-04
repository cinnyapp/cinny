import React from 'react';
import { Box, Text } from 'folds';
import * as css from './styles.css';

export function AuthFooter() {
  return (
    <Box className={css.AuthFooter} justifyContent="Center" gap="400" wrap="Wrap">
      <Text as="a" size="T300" href="https://twype.com" target="_blank" rel="noreferrer">
        About
      </Text>
      <Text
        as="a"
        size="T300"
        href="https://github.com/twype-com"
        target="_blank"
        rel="noreferrer"
      >
        GitHub
      </Text>
      <Text as="a" size="T300" href="https://twitter.com/0xTwype" target="_blank" rel="noreferrer">
        Twitter
      </Text>
      <Text as="a" size="T300" href="https://matrix.org" target="_blank" rel="noreferrer">
        Powered by Matrix
      </Text>
    </Box>
  );
}
