import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import katex from 'katex';
import 'katex/dist/katex.min.css';

function KaTeX({ tex, options }) {
  const ref = useRef(null);

  useEffect(() => {
    katex.render(tex, ref.current, options);
  }, [tex, options]);

  return <div ref={ref} />;
}
KaTeX.defaultProps = {
  options: undefined,
};
KaTeX.propTypes = {
  tex: PropTypes.string.isRequired,
  options: PropTypes.shape({}),
};

export default KaTeX;
