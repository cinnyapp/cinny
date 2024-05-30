import { RefObject, TouchEvent, useState } from "react"
import { openNavigation } from "../../client/action/navigation";

export const useTouchMenu = (navWrapperRef: RefObject<HTMLDivElement>, classNameSided: string) => {
	const [lastTouch, setLastTouch] = useState(0);
	const [sideVelocity, setSideVelocity] = useState(0);
  const [sideMoved, setSideMoved] = useState(0);
  const [isTouchingSide, setTouchingSide] = useState(false);

  // Touch handlers for window object. If the touch starts at 10% of the left of the screen, it will trigger the swipe-right-menu.
  const onTouchStart = (event: TouchEvent) => {
    if (!navWrapperRef.current?.classList.contains(classNameSided)) return;
    if (event.touches.length != 1) return setTouchingSide(false);
    if (event.touches[0].clientX < window.innerWidth * 0.1) {
      setTouchingSide(true);
			setLastTouch(Date.now());
    }
  }
  const onTouchEnd = (event: TouchEvent) => {
    if (!navWrapperRef.current?.classList.contains(classNameSided)) return;
    setTouchingSide(isTouchingSide => {
      if (isTouchingSide) {
        setSideMoved(sideMoved => {
          if (sideMoved) {
            event.preventDefault();
            if (sideMoved > window.innerWidth * 0.5 || sideVelocity >= (window.innerWidth * 0.1 / 250)) openNavigation();
          }
					setLastTouch(0);
					setSideVelocity(0);
          return 0;
        });
      }
      return false;
    });
  }
  const onTouchMove = (event: TouchEvent) => {
    if (!navWrapperRef.current?.classList.contains(classNameSided)) return;
    setTouchingSide(isTouchingSide => {
      if (isTouchingSide) {
        event.preventDefault();
        if (event.changedTouches.length != 1) {
					setSideMoved(0);
					return false;
				}
        setSideMoved(sideMoved => {
          const newSideMoved = event.changedTouches[0].clientX;
          setSideVelocity((newSideMoved - sideMoved) / (Date.now() - lastTouch));
					setLastTouch(Date.now());
          return newSideMoved;
        });
      }
      return isTouchingSide;
    });
  }

	return {
		isTouchingSide,
		sideMoved,
		onTouchStart,
		onTouchMove,
		onTouchEnd
	}
}