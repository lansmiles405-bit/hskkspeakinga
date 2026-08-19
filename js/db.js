/**
 * Module Quản lý Storage bằng IndexedDB
 */
class LocalDB {
    constructor() {
        this.dbName = 'HSKKCoachDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings');
                }
                if (!db.objectStoreNames.contains('user_profile')) {
                    db.createObjectStore('user_profile');
                }
                if (!db.objectStoreNames.contains('evaluations')) {
                    db.createObjectStore('evaluations', { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this);
            };

            request.onerror = (e) => reject('Lỗi khởi tạo IndexedDB: ' + e.target.error);
        });
    }

    async setSetting(key, val) {
        const tx = this.db.transaction('settings', 'readwrite');
        tx.objectStore('settings').put(val, key);
        return tx.complete;
    }

    async getSetting(key) {
        return new Promise((resolve) => {
            const tx = this.db.transaction('settings', 'readonly');
            const req = tx.objectStore('settings').get(key);
            req.onsuccess = () => resolve(req.result);
        });
    }

    async saveEvaluation(evalData) {
        const tx = this.db.transaction('evaluations', 'readwrite');
        tx.objectStore('evaluations').add(evalData);
        return tx.complete;
    }

    async getAllEvaluations() {
        return new Promise((resolve) => {
            const tx = this.db.transaction('evaluations', 'readonly');
            const req = tx.objectStore('evaluations').getAll();
            req.onsuccess = () => resolve(req.result || []);
        });
    }
}

const db = new LocalDB();