import { avatarInitials } from '../../../util/common';

function cssVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name);
}

// renders the avatar and returns it as an URL
export default async function renderAvatar({
  text, bgColor, imageSrc, size, borderRadius,
}) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');

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
      // draw initials centered on the canvas
      ctx.fillStyle = cssVar(bgColor);
      ctx.fill();

      ctx.fillStyle = 'white';
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
