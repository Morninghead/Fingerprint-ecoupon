// Background sync worker for pending transactions
// Syncs offline transactions when connection is restored

import { offlineDB } from './offline-db';

let syncInterval: NodeJS.Timeout | null = null;

export function startSyncWorker(): void {
  // Check connectivity every 30 seconds
  if (syncInterval) return;

  syncInterval = setInterval(async () => {
    if (navigator.onLine) {
      await syncPendingTransactions();
    }
  }, 30000);

  // Also sync when connection is restored
  window.addEventListener('online', syncPendingTransactions);
}

export function stopSyncWorker(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  window.removeEventListener('online', syncPendingTransactions);
}

async function syncPendingTransactions(): Promise<void> {
  try {
    await offlineDB.init();
    const pending = await offlineDB.getPendingTransactions();

    for (const tx of pending) {
      try {
        // Try to sync with server
        const response = await fetch('/api/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: tx.employee_id,
            meal_type: tx.meal_type,
            is_override: false
          })
        });

        if (response.ok) {
          // Remove from pending queue on success
          await offlineDB.deletePendingTransaction(tx.id);
          console.log('Synced transaction:', tx.id);
        }
      } catch (error) {
        console.error('Failed to sync transaction:', tx.id, error);
        // Keep in pending queue for retry
      }
    }
  } catch (error) {
    console.error('Sync worker error:', error);
  }
}

// Auto-start when imported
if (typeof window !== 'undefined') {
  startSyncWorker();
}
