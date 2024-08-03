import React from 'react';
import { as, Box, Header, Icon, IconButton, Icons, Modal, Scroll, Text } from 'folds';
import classNames from 'classnames';
import Linkify from 'linkify-react';
import * as css from './style.css';
import { LINKIFY_OPTS, scaleSystemEmoji } from '../../plugins/react-custom-html-parser';

export const RoomTopicViewer = as<
  'div',
  {
    name: string;
    topic: string;
    requestClose: () => void;
  }
>(({ name, topic, requestClose, className, ...props }, ref) => (
  <Modal
    size="300"
    flexHeight
    className={classNames(css.ModalFlex, className)}
    {...props}
    ref={ref}
  >
    <Header className={css.ModalHeader} variant="Surface" size="500">
      <Box grow="Yes">
        <Text size="H4" truncate>
          {name}
        </Text>
      </Box>
      <IconButton size="300" onClick={requestClose} radii="300">
        <Icon src={Icons.Cross} />
      </IconButton>
    </Header>
    <Scroll className={css.ModalScroll} size="300" hideTrack>
      <Box className={css.ModalContent} direction="Column" gap="100">
        <Text size="T300" className={css.ModalTopic} priority="400">
          <Linkify options={LINKIFY_OPTS}>{scaleSystemEmoji(topic)}</Linkify>
        </Text>
      </Box>
    </Scroll>
  </Modal>
));
