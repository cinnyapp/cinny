import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import katex from 'katex';
import 'katex/dist/katex.min.css';

function Math({ tex, options }) {
  const ref = useRef(null);

  useEffect(() => {
    katex.render(tex, ref.current, options);
  }, [tex, options]);

  return <div ref={ref} />;
}
Math.defaultProps = {
  options: undefined,
};
Math.propTypes = {
  tex: PropTypes.string.isRequired,
  options: PropTypes.shape({}),
};

export default Math;
