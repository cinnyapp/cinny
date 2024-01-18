import { Box, Text } from 'folds';
import React from 'react';
import { Link } from 'react-router-dom';
import { getLoginPath } from '../../pathUtils';
import { useAuthServer } from '../../../hooks/useAuthServer';

export function ResetPassword() {
  const server = useAuthServer();

  return (
    <Box direction="Column" gap="500">
      <Text size="H2" priority="400">
        Reset Password
      </Text>
      <Text align="Center">
        Know you password? <Link to={getLoginPath(server)}>Login</Link>
      </Text>
    </Box>
  );
}
