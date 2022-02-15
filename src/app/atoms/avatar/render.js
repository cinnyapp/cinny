import { avatarInitials } from '../../../util/common';

function cssVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name);
}

// renders the avatar and returns it as an URL
export default async function renderAvatar({
  text, bgColor, imageSrc, size, borderRadius, scale,
}) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size * scale;
    canvas.height = size * scale;

    const ctx = canvas.getContext('2d');

    ctx.scale(scale, scale);

    // rounded corners
    ctx.beginPath();
    ctx.moveTo(size, size);
    ctx.arcTo(0, size, 0, 0, borderRadius);
    ctx.arcTo(0, 0, size, 0, borderRadius);
    ctx.arcTo(size, 0, size, size, borderRadius);
    ctx.arcTo(size, size, 0, size, borderRadius);

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

      ctx.drawImage(img, 0, 0, size, size);
    } else {
      // colored background
      ctx.fillStyle = cssVar(bgColor);
      ctx.fill();

      // centered letter
      ctx.fillStyle = '#fff';
      ctx.font = `${cssVar('--fs-s1')} ${cssVar('--font-primary')}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(avatarInitials(text), size / 2, size / 2);
    }

    return canvas.toDataURL();
  } catch (e) {
    console.error(e);
    return imageSrc;
  }
}
