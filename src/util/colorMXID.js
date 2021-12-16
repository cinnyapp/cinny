// https://github.com/cloudrac3r/cadencegq/blob/master/pug/mxid.pug

const colors = [
  'var(--mx-uc-1)',
  'var(--mx-uc-2)',
  'var(--mx-uc-3)',
  'var(--mx-uc-4)',
  'var(--mx-uc-5)',
  'var(--mx-uc-6)',
  'var(--mx-uc-7)',
  'var(--mx-uc-8)',
];
function hashCode(str) {
  let hash = 0;
  let i;
  let chr;
  if (str.length === 0) {
    return hash;
  }
  for (i = 0; i < str.length; i += 1) {
    chr = str.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    hash = ((hash << 5) - hash) + chr;
    // eslint-disable-next-line no-bitwise
    hash |= 0;
  }
  return Math.abs(hash);
}
export default function colorMXID(userId) {
  const colorNumber = hashCode(userId) % 8;
  return colors[colorNumber];
}
