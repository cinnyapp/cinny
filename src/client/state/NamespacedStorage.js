class NamespacedStorage {
  #namespace;
  #storage;
  #cache;

  constructor(namespace, storage) {
    this.#namespace = namespace;
    this.#storage = storage;

    this.#cache = new Set();
    for (let i = 0; i < this.#storage.length; i++) {
      let key = this.#storage.key(i);
      if (key.startsWith(`${this.#namespace}.`)) {
        this.#cache.add(key.replace(`${this.#namespace}.`, ""));
      }
    }
  }

  key(n) {
    return this.#cache[n];
  }

  getItem(key) {
    return this.#storage.getItem(`${this.#namespace}.${key}`);
  }

  setItem(key, value) {
    this.#storage.setItem(`${this.#namespace}.${key}`, value);
    this.#cache.add(key);
  }

  removeItem(key) {
    this.#storage.removeItem(`${this.#namespace}.${key}`);
    this.#cache.delete(key);
  }

  clear() {
    for (let key of this.#cache) {
      this.removeItem(key);
    }
  }
}

export default NamespacedStorage;
