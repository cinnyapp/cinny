import React from 'react';
import { Box, Button, Icon, IconButton, Icons, Input, Text, config } from 'folds';
import { Link, generatePath } from 'react-router-dom';
import { LOGIN_PATH } from '../paths';
import { useAuthServer } from '../../hooks/useAuthServer';

export function Register() {
  const server = useAuthServer();

  return (
    <Box direction="Column" gap="500">
      <Text size="H2" priority="400">
        Register
      </Text>
      <Box direction="Inherit" gap="400">
        <Box direction="Column" gap="100">
          <Text as="label" size="L400" priority="300">
            Username
          </Text>
          <Input variant="Background" size="500" outlined />
        </Box>
        <Box direction="Column" gap="100">
          <Text as="label" size="L400" priority="300">
            Password
          </Text>
          <Input
            style={{ paddingRight: config.space.S200 }}
            type="password"
            variant="Background"
            size="500"
            outlined
            after={
              <IconButton variant="Background" size="400" radii="300">
                <Icon size="100" src={Icons.EyeBlind} />
              </IconButton>
            }
          />
        </Box>
        <Box direction="Column" gap="100">
          <Text as="label" size="L400" priority="300">
            Confirm Password
          </Text>
          <Input
            style={{ paddingRight: config.space.S200 }}
            type="password"
            variant="Background"
            size="500"
            outlined
            after={
              <IconButton variant="Background" size="400" radii="300">
                <Icon size="100" src={Icons.EyeBlind} />
              </IconButton>
            }
          />
        </Box>
        <Box direction="Column" gap="100">
          <Text as="label" size="L400" priority="300">
            Email
          </Text>
          <Input variant="Background" type="email" size="500" outlined />
        </Box>
        <span />
        <Button variant="Primary" size="500">
          <Text as="span" size="B500">
            Register
          </Text>
        </Button>
      </Box>
      <span />
      <Text align="Center">
        Already have an account? <Link to={generatePath(LOGIN_PATH, { server })}>Login</Link>
      </Text>
    </Box>
  );
}
