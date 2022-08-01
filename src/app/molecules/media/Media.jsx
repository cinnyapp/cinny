import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './Media.scss';

import encrypt from 'browser-encrypt-attachment';

import { BlurhashCanvas } from 'react-blurhash';
import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import Spinner from '../../atoms/spinner/Spinner';

import DownloadSVG from '../../../../public/res/ic/outlined/download.svg';
import ExternalSVG from '../../../../public/res/ic/outlined/external.svg';
import PlaySVG from '../../../../public/res/ic/outlined/play.svg';

// https://github.com/matrix-org/matrix-react-sdk/blob/cd15e08fc285da42134817cce50de8011809cd53/src/utils/blobs.ts#L73
const ALLOWED_BLOB_MIMETYPES = [
  'image/jpeg',
  'image/gif',
  'image/png',
  'image/apng',
  'image/webp',
  'image/avif',

  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',

  'audio/mp4',
  'audio/webm',
  'audio/aac',
  'audio/mpeg',
  'audio/ogg',
  'audio/wave',
  'audio/wav',
  'audio/x-wav',
  'audio/x-pn-wav',
  'audio/flac',
  'audio/x-flac',
];
function getBlobSafeMimeType(mimetype) {
  if (!ALLOWED_BLOB_MIMETYPES.includes(mimetype)) {
    return 'application/octet-stream';
  }
  // Required for Chromium browsers
  if (mimetype === 'video/quicktime') {
    return 'video/mp4';
  }
  return mimetype;
}

async function getDecryptedBlob(response, type, decryptData) {
  const arrayBuffer = await response.arrayBuffer();
  const dataArray = await encrypt.decryptAttachment(arrayBuffer, decryptData);
  const blob = new Blob([dataArray], { type: getBlobSafeMimeType(type) });
  return blob;
}

async function getUrl(link, type, decryptData) {
  try {
    const response = await fetch(link, { method: 'GET' });
    if (decryptData !== null) {
      return URL.createObjectURL(await getDecryptedBlob(response, type, decryptData));
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    return link;
  }
}

function getNativeHeight(width, height) {
  const MEDIA_MAX_WIDTH = 296;
  const scale = MEDIA_MAX_WIDTH / width;
  return scale * height;
}

function FileHeader({
  name, link, external,
  file, type,
}) {
  const [url, setUrl] = useState(null);

  async function getFile() {
    const myUrl = await getUrl(link, type, file);
    setUrl(myUrl);
  }

  async function handleDownload(e) {
    if (file !== null && url === null) {
      e.preventDefault();
      await getFile();
      e.target.click();
    }
  }
  return (
    <div className="file-header">
      <Text className="file-name" variant="b3">{name}</Text>
      { link !== null && (
        <>
          {
            external && (
              <IconButton
                size="extra-small"
                tooltip="Open in new tab"
                src={ExternalSVG}
                onClick={() => window.open(url || link)}
              />
            )
          }
          <a href={url || link} download={name} target="_blank" rel="noreferrer">
            <IconButton
              size="extra-small"
              tooltip="Download"
              src={DownloadSVG}
              onClick={handleDownload}
            />
          </a>
        </>
      )}
    </div>
  );
}
FileHeader.defaultProps = {
  external: false,
  file: null,
  link: null,
};
FileHeader.propTypes = {
  name: PropTypes.string.isRequired,
  link: PropTypes.string,
  external: PropTypes.bool,
  file: PropTypes.shape({}),
  type: PropTypes.string.isRequired,
};

function File({
  name, link, file, type,
}) {
  return (
    <div className="file-container">
      <FileHeader name={name} link={link} file={file} type={type} />
    </div>
  );
}
File.defaultProps = {
  file: null,
  type: '',
};
File.propTypes = {
  name: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
  type: PropTypes.string,
  file: PropTypes.shape({}),
};

function Image({
  name, width, height, link, file, type, blurhash,
}) {
  const [url, setUrl] = useState(null);
  const [loaded, setLoaded] = useState();

  useEffect(() => {
    let unmounted = false;
    async function fetchUrl() {
      const myUrl = await getUrl(link, type, file);
      if (unmounted) return;
      setUrl(myUrl);
    }
    fetchUrl();
    return () => {
      unmounted = true;
    };
  }, []);

  return (
    <div className="file-container">
      <FileHeader name={name} link={url || link} type={type} external />
      <div style={{ height: width !== null ? getNativeHeight(width, height) : 'unset' }} className="image-container">
        {blurhash && <BlurhashCanvas hash={blurhash} punch={1} style={{ display: loaded && 'none' }} />}
        {url !== null && <img src={url || link} alt={name} onLoad={() => setLoaded(true)} style={{ display: !loaded && 'none' }} />}
      </div>
    </div>
  );
}
Image.defaultProps = {
  file: null,
  width: null,
  height: null,
  type: '',
  blurhash: '',
};
Image.propTypes = {
  name: PropTypes.string.isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
  link: PropTypes.string.isRequired,
  file: PropTypes.shape({}),
  type: PropTypes.string,
  blurhash: PropTypes.string,
};

function Audio({
  name, link, type, file,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [url, setUrl] = useState(null);

  async function loadAudio() {
    const myUrl = await getUrl(link, type, file);
    setUrl(myUrl);
    setIsLoading(false);
  }
  function handlePlayAudio() {
    setIsLoading(true);
    loadAudio();
  }

  return (
    <div className="file-container">
      <FileHeader name={name} link={file !== null ? url : url || link} type={type} external />
      <div className="audio-container">
        { url === null && isLoading && <Spinner size="small" /> }
        { url === null && !isLoading && <IconButton onClick={handlePlayAudio} tooltip="Play audio" src={PlaySVG} />}
        { url !== null && (
          /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <audio autoPlay controls>
            <source src={url} type={getBlobSafeMimeType(type)} />
          </audio>
        )}
      </div>
    </div>
  );
}
Audio.defaultProps = {
  file: null,
  type: '',
};
Audio.propTypes = {
  name: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
  type: PropTypes.string,
  file: PropTypes.shape({}),
};

function Video({
  name, link, thumbnail,
  width, height, file, type, thumbnailFile, thumbnailType,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [url, setUrl] = useState(null);
  const [thumbUrl, setThumbUrl] = useState(null);

  useEffect(() => {
    let unmounted = false;
    async function fetchUrl() {
      const myThumbUrl = await getUrl(thumbnail, thumbnailType, thumbnailFile);
      if (unmounted) return;
      setThumbUrl(myThumbUrl);
    }
    if (thumbnail !== null) fetchUrl();
    return () => {
      unmounted = true;
    };
  }, []);

  async function loadVideo() {
    const myUrl = await getUrl(link, type, file);
    setUrl(myUrl);
    setIsLoading(false);
  }

  function handlePlayVideo() {
    setIsLoading(true);
    loadVideo();
  }

  return (
    <div className="file-container">
      <FileHeader name={name} link={file !== null ? url : url || link} type={type} external />
      <div
        style={{
          height: width !== null ? getNativeHeight(width, height) : 'unset',
          backgroundImage: thumbUrl === null ? 'none' : `url(${thumbUrl}`,
        }}
        className="video-container"
      >
        { url === null && isLoading && <Spinner size="small" /> }
        { url === null && !isLoading && <IconButton onClick={handlePlayVideo} tooltip="Play video" src={PlaySVG} />}
        { url !== null && (
        /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <video autoPlay controls poster={thumbUrl}>
            <source src={url} type={getBlobSafeMimeType(type)} />
          </video>
        )}
      </div>
    </div>
  );
}
Video.defaultProps = {
  width: null,
  height: null,
  file: null,
  thumbnail: null,
  type: '',
  thumbnailType: null,
  thumbnailFile: null,
};
Video.propTypes = {
  name: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
  thumbnail: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  file: PropTypes.shape({}),
  type: PropTypes.string,
  thumbnailFile: PropTypes.shape({}),
  thumbnailType: PropTypes.string,
};

export {
  File, Image, Audio, Video,
};
