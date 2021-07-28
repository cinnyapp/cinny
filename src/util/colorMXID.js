// https://github.com/cloudrac3r/cadencegq/blob/master/pug/mxid.pug

const colors = ['#368bd6', '#ac3ba8', '#03b381', '#e64f7a', '#ff812d', '#2dc2c5', '#5c56f5', '#74d12c'];
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
