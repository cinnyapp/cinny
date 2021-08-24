import useMediaQuery from 'react-responsive';

const isMobile = () => useMediaQuery({ query: '(max-width: 1224px)' });

export {
  isMobile
};
