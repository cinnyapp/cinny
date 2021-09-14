class Postie {
  constructor() {
    this._topics = new Map();
  }

  _getSubscribers(topic) {
    const subscribers = this._topics.get(topic);
    if (typeof subscribers === 'undefined') {
      throw new Error(`Topic:"${topic}" doesn't exist.`);
    }
    return subscribers;
  }

  _getSubscriber(topic, address) {
    const subscribers = this._getSubscribers(topic);
    const subscriber = subscribers.get(address);
    if (typeof subscriber === 'undefined') {
      throw new Error(`Subscriber on topic:"${topic}" at address:"${address}" doesn't exist.`);
    }
    return subscriber;
  }

  hasTopic(topic) {
    return typeof this._topics.get(topic) !== 'undefined';
  }

  hasSubscriber(topic, address) {
    const subscribers = this._getSubscribers(topic);
    return typeof subscribers.get(address) !== 'undefined';
  }

  hasTopicAndSubscriber(topic, address) {
    return (this.hasTopic(topic))
      ? this.hasSubscriber(topic, address)
      : false;
  }

  /**
   * @param {string} topic - Subscription topic
   * @param {string} address - Address of subscriber
   * @param {function} inbox - The inbox function to receive post data
   */
  subscribe(topic, address, inbox) {
    if (typeof inbox !== 'function') {
      throw new TypeError('Inbox  must be a function.');
    }

    if (typeof this._topics.get(topic) === 'undefined') {
      this._topics.set(topic, new Map());
    }
    const subscribers = this._topics.get(topic);
    if (subscribers.get(address)) {
      throw new Error(`Subscription on topic:"${topic}" at address:"${address}" already exist.`);
    }
    subscribers.set(address, inbox);
  }

  unsubscribe(topic, address) {
    const subscribers = this._getSubscribers(topic);
    if (subscribers.has(address)) {
      subscribers.delete(address);
    } else throw new Error(`Unable to unsubscribe. Subscriber on topic:"${topic}" at address:"${address}" doesn't exist`);
    if (subscribers.size === 0) {
      this._topics.delete(topic);
    }
  }

  /**
   * @param {string} topic - Subscription topic
   * @param {string|string[]} address - Address of subscriber
   * @param {*} data - Data to deliver to subscriber
   */
  post(topic, address, data) {
    const sendPost = (subscriber, addr) => {
      if (typeof subscriber === 'undefined') {
        throw new Error(`Unable to post on topic:"${topic}" at address:"${addr}". Subscriber doesn't exist.`);
      }
      subscriber(data);
    };
    if (Array.isArray(address)) {
      const subscribers = this._getSubscribers(topic);
      address.forEach((addr) => {
        sendPost(subscribers.get(addr), addr);
      });
      return;
    }
    sendPost(this._getSubscriber(topic, address), address);
  }
}

export default Postie;
