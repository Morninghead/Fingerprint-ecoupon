// IndexedDB wrapper for offline data storage
// Stores: employees, meal_credits, pending_transactions

const DB_NAME = 'ECouponDB';
const DB_VERSION = 1;
const STORES = {
  EMPLOYEES: 'employees',
  MEAL_CREDITS: 'meal_credits',
  PENDING_TRANSACTIONS: 'pending_transactions'
};

export class OfflineDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains(STORES.EMPLOYEES)) {
          db.createObjectStore(STORES.EMPLOYEES, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.MEAL_CREDITS)) {
          const store = db.createObjectStore(STORES.MEAL_CREDITS, { keyPath: 'id' });
          store.createIndex('employee_id', 'employee_id', { unique: false });
          store.createIndex('date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.PENDING_TRANSACTIONS)) {
          db.createObjectStore(STORES.PENDING_TRANSACTIONS, {
            keyPath: 'id',
            autoIncrement: true
          });
        }
      };
    });
  }

  async addEmployee(employee: any): Promise<void> {
    return this.add(STORES.EMPLOYEES, employee);
  }

  async getEmployees(): Promise<any[]> {
    return this.getAll(STORES.EMPLOYEES);
  }

  async addMealCredit(credit: any): Promise<void> {
    return this.add(STORES.MEAL_CREDITS, credit);
  }

  async getMealCredits(employeeId?: string): Promise<any[]> {
    if (employeeId) {
      return this.getByIndex(STORES.MEAL_CREDITS, 'employee_id', employeeId);
    }
    return this.getAll(STORES.MEAL_CREDITS);
  }

  async addPendingTransaction(transaction: any): Promise<void> {
    return this.add(STORES.PENDING_TRANSACTIONS, {
      ...transaction,
      pending: true,
      timestamp: new Date().toISOString()
    });
  }

  async getPendingTransactions(): Promise<any[]> {
    return this.getAll(STORES.PENDING_TRANSACTIONS);
  }

  async deletePendingTransaction(id: number): Promise<void> {
    return this.delete(STORES.PENDING_TRANSACTIONS, id);
  }

  async clearStore(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private add(storeName: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private getAll(storeName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private getByIndex(storeName: string, indexName: string, value: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private delete(storeName: string, key: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const offlineDB = new OfflineDB();
