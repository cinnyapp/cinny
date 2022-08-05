/* eslint-disable import/prefer-default-export */

const mathExtensionHtml = {
  enter: {
    mathFlow() {
      this.lineEndingIfNeeded();
    },
    mathFlowFenceMeta() {
      this.buffer();
    },
  },
  exit: {
    mathFlow() {
      const value = this.encode(this.resume().replace(/(?:\r?\n|\r)$/, ''));
      this.tag('<div data-mx-maths="');
      this.tag(value);
      this.tag('"><code>');
      this.raw(value);
      this.tag('</code></div>');
      this.setData('mathFlowOpen');
      this.setData('slurpOneLineEnding');
    },
    mathFlowFence() {
      // After the first fence.
      if (!this.getData('mathFlowOpen')) {
        this.setData('mathFlowOpen', true);
        this.setData('slurpOneLineEnding', true);
        this.buffer();
      }
    },
    mathFlowFenceMeta() {
      this.resume();
    },
    mathFlowValue(token) {
      this.raw(this.sliceSerialize(token));
    },
  },
};

export {
  mathExtensionHtml,
};
