import React from 'react';
import { Box, Scroll } from 'folds';
import { useParams } from 'react-router-dom';
import { ContainerColor } from '../../../styles/ContainerColor.css';

export function PublicRooms() {
  const { server } = useParams();

  return (
    <Box grow="Yes" className={ContainerColor({ variant: 'Surface' })}>
      <Scroll hideTrack>
        <div>
          <p>{server}</p>
        </div>
      </Scroll>
    </Box>
  );
}
