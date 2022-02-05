import { avatarInitials } from '../../../util/common';

function cssVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name);
}

// renders the avatar and returns it as an URL
export default async function renderAvatar({
  text, bgColor, imageSrc, size, borderRadius, multiplier,
}) {
  try {
    const mSize = size * multiplier;
    const mBorderRadius = borderRadius * multiplier;

    const canvas = document.createElement('canvas');
    canvas.width = mSize;
    canvas.height = mSize;

    const ctx = canvas.getContext('2d');

    // rounded corners
    ctx.beginPath();
    ctx.moveTo(mSize, mSize);
    ctx.arcTo(0, mSize, 0, 0, mBorderRadius);
    ctx.arcTo(0, 0, mSize, 0, mBorderRadius);
    ctx.arcTo(mSize, 0, mSize, mSize, mBorderRadius);
    ctx.arcTo(mSize, mSize, 0, mSize, mBorderRadius);

    if (imageSrc) {
      // clip corners of image
      ctx.closePath();
      ctx.clip();

      const img = new Image();
      img.crossOrigin = 'anonymous';
      const promise = new Promise((resolve, reject) => {
        img.onerror = reject;
        img.onload = resolve;
      });
      img.src = imageSrc;
      await promise;

      ctx.drawImage(img, 0, 0, mSize, mSize);
    } else {
      // draw initials centered on the canvas
      ctx.fillStyle = cssVar(bgColor);
      ctx.fill();

      ctx.fillStyle = 'white';
      ctx.font = `calc(${multiplier} * ${cssVar('--fs-s1')}) ${cssVar('--font-primary')}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(avatarInitials(text), mSize / 2, mSize / 2);
    }

    return canvas.toDataURL();
  } catch (e) {
    console.error(e);
    return imageSrc;
  }
}
