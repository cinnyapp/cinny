import EventEmitter from 'events';

class AsyncSearch extends EventEmitter {
  constructor() {
    super();

    this._reset();

    this.RESULT_SENT = 'RESULT_SENT';
  }

  _reset() {
    this.dataList = null;
    this.term = null;
    this.searchKeys = null;
    this.isContain = false;
    this.isCaseSensitive = false;
    this.ignoreWhitespace = true;
    this.limit = null;
    this.findingList = [];

    this.searchUptoIndex = 0;
    this.sessionStartTimestamp = 0;
  }

  _softReset() {
    this.term = null;
    this.findingList = [];
    this.searchUptoIndex = 0;
    this.sessionStartTimestamp = 0;
  }

  /**
   * Setup the search.
   * opts.keys are required when dataList items are object.
   *
   * @param {[string | object]} dataList - A list to search in
   * @param {object} opts - Options
   * @param {string | [string]} [opts.keys=null]
   * @param {boolean} [opts.isContain=false] - Add finding to result if it contain search term
   * @param {boolean} [opts.isCaseSensitive=false]
   * @param {boolean} [opts.ignoreWhitespace=true]
   * @param {number} [opts.limit=null] - Stop search after limit
   */
  setup(dataList, opts) {
    this._reset();
    this.dataList = dataList;
    this.searchKeys = opts?.keys || null;
    this.isContain = opts?.isContain || false;
    this.isCaseSensitive = opts?.isCaseSensitive || false;
    this.ignoreWhitespace = opts?.ignoreWhitespace || true;
    this.limit = opts?.limit || null;
  }

  search(term) {
    this._softReset();

    this.term = (this.isCaseSensitive) ? term : term.toLocaleLowerCase();
    if (this.ignoreWhitespace) this.term = this.term.replaceAll(' ', '');
    if (this.term === '') {
      this._sendFindings();
      return;
    }

    this._find(this.sessionStartTimestamp, 0);
  }

  _find(sessionTimestamp, lastFindingCount) {
    if (sessionTimestamp !== this.sessionStartTimestamp) return;
    this.sessionStartTimestamp = window.performance.now();

    for (
      let searchIndex = this.searchUptoIndex;
      searchIndex < this.dataList.length;
      searchIndex += 1
    ) {
      if (this._match(this.dataList[searchIndex])) {
        this.findingList.push(this.dataList[searchIndex]);
        if (typeof this.limit === 'number' && this.findingList.length >= this.limit) break;
      }

      const calcFinishTime = window.performance.now();
      if (calcFinishTime - this.sessionStartTimestamp > 8) {
        const thisFindingCount = this.findingList.length;
        const thisSessionTimestamp = this.sessionStartTimestamp;
        if (lastFindingCount !== thisFindingCount) this._sendFindings();

        this.searchUptoIndex = searchIndex + 1;
        setTimeout(() => this._find(thisSessionTimestamp, thisFindingCount));
        return;
      }
    }

    if (lastFindingCount !== this.findingList.length
      || lastFindingCount === 0) this._sendFindings();
    this._softReset();
  }

  _match(item) {
    if (typeof item === 'string') {
      return this._compare(item);
    }
    if (typeof item === 'object') {
      if (Array.isArray(this.searchKeys)) {
        return !!this.searchKeys.find((key) => this._compare(item[key]));
      }
      if (typeof this.searchKeys === 'string') {
        return this._compare(item[this.searchKeys]);
      }
    }
    return false;
  }

  _compare(item) {
    if (typeof item !== 'string') return false;
    let myItem = (this.isCaseSensitive) ? item : item.toLocaleLowerCase();
    if (this.ignoreWhitespace) myItem = myItem.replaceAll(' ', '');

    if (this.isContain) return myItem.indexOf(this.term) !== -1;
    return myItem.startsWith(this.term);
  }

  _sendFindings() {
    this.emit(this.RESULT_SENT, this.findingList, this.term);
  }
}

export default AsyncSearch;
