import React from 'react';
import { Box, Button, Icon, IconButton, Icons, Input, Text, config } from 'folds';
import { Link, generatePath } from 'react-router-dom';
import { REGISTER_PATH } from '../paths';
import { useAuthFlows } from '../../hooks/useAuthFlows';
import { useAuthServer } from '../../hooks/useAuthServer';

export function Login() {
  const server = useAuthServer();
  const { loginFlows } = useAuthFlows();
  console.log(server, loginFlows);

  return (
    <Box direction="Column" gap="500">
      <Text size="H2" priority="400">
        Login
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
        <span />
        <Button variant="Primary" size="500">
          <Text as="span" size="B500">
            Login
          </Text>
        </Button>
      </Box>
      <span />
      <Text align="Center">
        Do not have an account? <Link to={generatePath(REGISTER_PATH, { server })}>Register</Link>
      </Text>
    </Box>
  );
}
