import { getScrollInfo } from '../../../util/common';

class TimelineScroll {
  constructor(target) {
    if (target === null) {
      throw new Error('Can not initialize TimelineScroll, target HTMLElement in null');
    }
    this.scroll = target;

    this.backwards = false;
    this.inTopHalf = false;

    this.isScrollable = false;
    this.top = 0;
    this.bottom = 0;
    this.height = 0;
    this.viewHeight = 0;

    this.topMsg = null;
    this.bottomMsg = null;
    this.diff = 0;
  }

  scrollToBottom() {
    const scrollInfo = getScrollInfo(this.scroll);
    const maxScrollTop = scrollInfo.height - scrollInfo.viewHeight;

    this._scrollTo(scrollInfo, maxScrollTop);
  }

  // use previous calc by this._updateTopBottomMsg() & this._calcDiff.
  tryRestoringScroll() {
    const scrollInfo = getScrollInfo(this.scroll);

    let scrollTop = 0;
    const ot = this.inTopHalf ? this.topMsg?.offsetTop : this.bottomMsg?.offsetTop;
    if (!ot) scrollTop = Math.round(this.height - this.viewHeight);
    else scrollTop = ot - this.diff;

    this._scrollTo(scrollInfo, scrollTop);
  }

  scrollToIndex(index, offset = 0) {
    const scrollInfo = getScrollInfo(this.scroll);
    const msgs = this.scroll.lastElementChild.lastElementChild.children;
    const offsetTop = msgs[index]?.offsetTop;

    if (offsetTop === undefined) return;
    // if msg is already in visible are we don't need to scroll to that
    if (offsetTop > scrollInfo.top && offsetTop < (scrollInfo.top + scrollInfo.viewHeight)) return;
    const to = offsetTop - offset;

    this._scrollTo(scrollInfo, to);
  }

  _scrollTo(scrollInfo, scrollTop) {
    this.scroll.scrollTop = scrollTop;

    // browser emit 'onscroll' event only if the 'element.scrollTop' value changes.
    // so here we flag that the upcoming 'onscroll' event is
    // emitted as side effect of assigning 'this.scroll.scrollTop' above
    // only if it's changes.
    // by doing so we prevent this._updateCalc() from calc again.
    if (scrollTop !== this.top) {
      this.scrolledByCode = true;
    }
    const sInfo = { ...scrollInfo };

    const maxScrollTop = scrollInfo.height - scrollInfo.viewHeight;

    sInfo.top = (scrollTop > maxScrollTop) ? maxScrollTop : scrollTop;
    this._updateCalc(sInfo);
  }

  // we maintain reference of top and bottom messages
  // to restore the scroll position when
  // messages gets removed from either end and added to other.
  _updateTopBottomMsg() {
    const msgs = this.scroll.lastElementChild.lastElementChild.children;
    const lMsgIndex = msgs.length - 1;

    // TODO: classname 'ph-msg' prevent this class from being used
    const PLACEHOLDER_COUNT = 2;
    this.topMsg = msgs[0]?.className === 'ph-msg'
      ? msgs[PLACEHOLDER_COUNT]
      : msgs[0];
    this.bottomMsg = msgs[lMsgIndex]?.className === 'ph-msg'
      ? msgs[lMsgIndex - PLACEHOLDER_COUNT]
      : msgs[lMsgIndex];
  }

  // we calculate the difference between first/last message and current scrollTop.
  // if we are going above we calc diff between first and scrollTop
  // else otherwise.
  // NOTE: This will help to restore the scroll when msgs get's removed
  // from one end and added to other end
  _calcDiff(scrollInfo) {
    if (!this.topMsg || !this.bottomMsg) return 0;
    if (this.inTopHalf) {
      return this.topMsg.offsetTop - scrollInfo.top;
    }
    return this.bottomMsg.offsetTop - scrollInfo.top;
  }

  _updateCalc(scrollInfo) {
    const halfViewHeight = Math.round(scrollInfo.viewHeight / 2);
    const scrollMiddle = scrollInfo.top + halfViewHeight;
    const lastMiddle = this.top + halfViewHeight;

    this.backwards = scrollMiddle < lastMiddle;
    this.inTopHalf = scrollMiddle < scrollInfo.height / 2;

    this.isScrollable = scrollInfo.isScrollable;
    this.top = scrollInfo.top;
    this.bottom = scrollInfo.height - (scrollInfo.top + scrollInfo.viewHeight);
    this.height = scrollInfo.height;
    this.viewHeight = scrollInfo.viewHeight;

    this._updateTopBottomMsg();
    this.diff = this._calcDiff(scrollInfo);
  }

  calcScroll() {
    if (this.scrolledByCode) {
      this.scrolledByCode = false;
      return undefined;
    }

    const scrollInfo = getScrollInfo(this.scroll);
    this._updateCalc(scrollInfo);

    return this.backwards;
  }
}

export default TimelineScroll;
