import { Box, Text } from 'folds';
import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getLoginPath } from '../../pathUtils';
import { useAuthServer } from '../../../hooks/useAuthServer';
import { PasswordResetForm } from './PasswordResetForm';
import { ResetPasswordPathSearchParams } from '../../paths';

const getResetPasswordSearchParams = (
  searchParams: URLSearchParams
): ResetPasswordPathSearchParams => ({
  email: searchParams.get('email') ?? undefined,
});

export function ResetPassword() {
  const server = useAuthServer();
  const [searchParams] = useSearchParams();
  const resetPasswordSearchParams = getResetPasswordSearchParams(searchParams);

  return (
    <Box direction="Column" gap="500">
      <Text size="H2" priority="400">
        Reset Password
      </Text>
      <PasswordResetForm defaultEmail={resetPasswordSearchParams.email} />
      <span data-spacing-node />

      <Text align="Center">
        Remember your password? <Link to={getLoginPath(server)}>Login</Link>
      </Text>
    </Box>
  );
}
