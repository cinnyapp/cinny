import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './KeyVerification.scss';

import { twemojify } from '../../../util/twemojify';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import Spinner from '../../atoms/spinner/Spinner';

function KeyVerification({ request, onRequestClose }) {
  const [sas, setSas] = useState(null);
  const [sasClicked, setSasClicked] = useState(false);

  function handleChange() {
    if (request.done || request.cancelled) onRequestClose();
  }

  useEffect(() => {
    if (request === null) return null;
    const req = request;
    req.on('change', handleChange);
    return () => req.off('change', handleChange);
  }, [request]);

  async function acceptRequest() {
    await request.accept();

    const verifier = request.beginKeyVerification('m.sas.v1');
    verifier.on('show_sas', (data) => {
      setSas(data);
    });
    await verifier.verify();
  }

  function sasMismatch() {
    sas.mismatch();
    setSasClicked(true);
  }

  function sasConfirm() {
    sas.confirm();
    setSasClicked(true);
  }

  if (sas !== null) {
    return (
      <div className="key-verification">
        <div className="key-verification__emojis">
          {sas.sas.emoji.map((emoji, i) => (
            <div className="key-verification__emoji-block" key={i}>
              <Text variant="h1">{twemojify(emoji[0])}</Text>
              <Text>{emoji[1]}</Text>
            </div>
          ))}
        </div>
        <div className="key-verification__buttons">
          {sasClicked ? <Spinner /> : (
            <>
              <Button onClick={sasMismatch}>They don't match</Button>
              <Button variant="primary" onClick={sasConfirm}>They match</Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="key-verification">
      <Text>Click accept to start the verification process</Text>
      <div className="key-verification__buttons">
        <Button variant="primary" onClick={acceptRequest}>Accept</Button>
      </div>
    </div>
  );
}
KeyVerification.defaultProps = {
  request: null,
};
KeyVerification.propTypes = {
  request: PropTypes.shape({}),
  onRequestClose: PropTypes.func.isRequired,
};

export default KeyVerification;
