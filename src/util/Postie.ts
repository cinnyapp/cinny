class Postie {
  _topics: Map<string, Map<string, Set<Function>>>;

  constructor() {
    this._topics = new Map();
  }

  _getSubscribers(topic: string) {
    const subscribers = this._topics.get(topic);
    if (subscribers === undefined) {
      throw new Error(`Topic:"${topic}" doesn't exist.`);
    }
    return subscribers;
  }

  _getInboxes(topic: string, address: string) {
    const subscribers = this._getSubscribers(topic);
    const inboxes = subscribers.get(address);
    if (inboxes === undefined) {
      throw new Error(`Inbox on topic:"${topic}" at address:"${address}" doesn't exist.`);
    }
    return inboxes;
  }

  hasTopic(topic: string) {
    return this._topics.get(topic) !== undefined;
  }

  hasSubscriber(topic: string, address: string) {
    const subscribers = this._getSubscribers(topic);
    return subscribers.get(address) !== undefined;
  }

  hasTopicAndSubscriber(topic: string, address: string) {
    return this.hasTopic(topic) ? this.hasSubscriber(topic, address) : false;
  }

  /**
   * @param {string} topic - Subscription topic
   * @param {string} address - Address of subscriber
   * @param {function} inbox - The inbox function to receive post data
   */
  subscribe(topic: string, address: string, inbox: Set<Function>) {
    if (typeof inbox !== 'function') {
      throw new TypeError('Inbox  must be a function.');
    }

    if (!this._topics.has(topic)) {
      this._topics.set(topic, new Map());
    }
    const subscribers = this._topics.get(topic);

    const inboxes = subscribers.get(address) ?? new Set();
    inboxes.add(inbox);
    subscribers.set(address, inboxes);

    return () => this.unsubscribe(topic, address, inbox);
  }

  unsubscribe(topic: string, address: string, inbox: Function) {
    const subscribers = this._getSubscribers(topic);
    if (!subscribers) throw new Error(`Unable to unsubscribe. Topic: "${topic}" doesn't exist.`);

    const inboxes = subscribers.get(address);
    if (!inboxes)
      throw new Error(
        `Unable to unsubscribe. Subscriber on topic:"${topic}" at address:"${address}" doesn't exist`
      );

    if (!inboxes.delete(inbox)) throw new Error("Unable to unsubscribe. Inbox doesn't exist");

    if (inboxes.size === 0) subscribers.delete(address);
    if (subscribers.size === 0) this._topics.delete(topic);
  }

  /**
   * @param {string} topic - Subscription topic
   * @param {string|string[]} address - Address of subscriber
   * @param {*} data - Data to deliver to subscriber
   */
  post(topic: string, address: string | string[], data: any) {
      const sendPost = (inboxes: Set<Function>, addr: string) => {
      if (inboxes === undefined) {
        throw new Error(
          `Unable to post on topic:"${topic}" at address:"${addr}". Subscriber doesn't exist.`
        );
      }
      inboxes.forEach((inbox) => inbox(data));
    };

    if (typeof address === 'string') {
      sendPost(this._getInboxes(topic, address), address);
      return;
    }
    const subscribers = this._getSubscribers(topic);
    address.forEach((addr: string) => {
      sendPost(subscribers.get(addr), addr);
    });
  }
}

export default Postie;
