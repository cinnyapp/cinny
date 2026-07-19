export const checkIndexedDBSupport = async (): Promise<boolean> => {
  const dbName = `checkIndexedDBSupport-${Date.now()}`;

  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;

    try {
      request = indexedDB.open(dbName);
    } catch {
      resolve(false);
      return;
    }

    request.onsuccess = () => {
      const db = request.result;

      db.close();

      indexedDB.deleteDatabase(dbName);

      resolve(true);
    };

    request.onerror = () => {
      resolve(false);
    };
  });
};
