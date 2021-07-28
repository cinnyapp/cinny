/**
 * blur [selector] element in bubbling path.
 * @param {Event} e Event
 * @param {string} selector element selector for Element.matches([selector])
 * @return {boolean} if blured return true, else return false with warning in console
 */

function blurOnBubbling(e, selector) {
  const bubblingPath = e.nativeEvent.composedPath();

  for (let elIndex = 0; elIndex < bubblingPath.length; elIndex += 1) {
    if (bubblingPath[elIndex] === document) {
      console.warn(blurOnBubbling, 'blurOnBubbling: not found selector in bubbling path');
      break;
    }
    if (bubblingPath[elIndex].matches(selector)) {
      setTimeout(() => bubblingPath[elIndex].blur(), 50);
      return true;
    }
  }
  return false;
}
export { blurOnBubbling };
