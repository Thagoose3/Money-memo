/**
 * Firebase Client & Cloud Sync Integration for Money Memo v2.9
 * Powered by Google Cloud Firestore & Firebase Google Authentication
 * Features Pre-aggregated Monthly & Yearly Summaries to minimize Firestore Read Quota
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD2KrOSytkU1pOiH35GYTFoeP8u8SekwzQ",
  authDomain: "moneymemo-55b7c.firebaseapp.com",
  projectId: "moneymemo-55b7c",
  storageBucket: "moneymemo-55b7c.firebasestorage.app",
  messagingSenderId: "849429195784",
  appId: "1:849429195784:web:e8e28dc593bd6fddf975bd",
  measurementId: "G-YJQBW0ENC9"
};

const FirebaseManager = {
  app: null,
  auth: null,
  db: null,
  currentUser: null,
  isInitialized: false,
  _txUnsubscribe: null,
  _aggTimeout: null,

  init() {
    try {
      if (typeof firebase !== 'undefined' && !this.isInitialized) {
        if (!firebase.apps.length) {
          this.app = firebase.initializeApp(FIREBASE_CONFIG);
        } else {
          this.app = firebase.app();
        }

        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.isInitialized = true;

        // Catch Google Redirect Result on mobile browsers
        this.auth.getRedirectResult().then((result) => {
          if (result && result.user) {
            this.currentUser = result.user;
            this.renderAuthUI();
            this.performTwoWaySync();
          }
        }).catch((err) => {
          console.error('Redirect sign-in error:', err);
        });

        // Listen for Auth changes
        this.auth.onAuthStateChanged(async (user) => {
          const wasLoggedIn = Boolean(this.currentUser);
          this.currentUser = user || null;
          this.renderAuthUI();

          if (user) {
            this.startRealtimeSync();
            await this.performTwoWaySync(false);
          } else {
            this.stopRealtimeSync();
            if (wasLoggedIn) {
              App.showToast(I18n.getLanguage() === 'en' ? 'Logged out' : 'ออกจากระบบเรียบร้อยแล้ว');
              App.renderAll();
            }
          }
        });
      }
    } catch (e) {
      console.error('Error initializing Firebase:', e);
    }
  },

  isLoggedIn() {
    return Boolean(this.currentUser);
  },

  getUser() {
    return this.currentUser;
  },

  async signInWithGoogle() {
    if (!this.auth) {
      this.init();
    }

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await this.auth.signInWithPopup(provider);
    } catch (e) {
      console.error('Google Sign-in error:', e);
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
        try {
          const provider = new firebase.auth.GoogleAuthProvider();
          await this.auth.signInWithRedirect(provider);
        } catch (redirectError) {
          alert('Google Login Failed: ' + redirectError.message);
        }
      } else {
        alert('Google Login Failed: ' + e.message);
      }
    }
  },

  async signOut() {
    if (!this.auth) return;
    try {
      this.stopRealtimeSync();
      await this.auth.signOut();
      this.currentUser = null;
      this.renderAuthUI();
    } catch (e) {
      console.error('Logout error:', e);
    }
  },

  getUserRef() {
    if (!this.db || !this.currentUser) return null;
    return this.db.collection('users').doc(this.currentUser.uid);
  },

  // --- Automatic Two-Way Cloud Sync (Zero Prompts, 100% Reliable) ---
  async performTwoWaySync(isSilent = false) {
    if (!this.currentUser) return;
    const userRef = this.getUserRef();
    if (!userRef) return;

    try {
      if (!isSilent) {
        App.showToast(I18n.getLanguage() === 'en' ? 'Syncing data with Google Cloud... ☁️' : 'กำลังเชื่อมต่อและซิงค์ข้อมูลกับ Cloud... ☁️');
      }

      // 1. Fetch Cloud Data
      const [cloudTxs, cloudCats, cloudRecs] = await Promise.all([
        this.fetchCloudTransactions(),
        this.fetchCloudCategories(),
        this.fetchCloudRecurring()
      ]);

      const localTxs = StorageManager.getTransactions();
      const localCats = StorageManager.getCategories();
      const localRecs = StorageManager.getRecurringItems();

      const batch = this.db.batch();
      let hasUploads = false;

      // --- Merge Transactions (Union by ID) ---
      const txMap = new Map();
      cloudTxs.forEach(t => txMap.set(t.id, t));

      const txsToUpload = [];
      localTxs.forEach(t => {
        if (!txMap.has(t.id)) {
          txMap.set(t.id, t);
          txsToUpload.push(t);
        }
      });

      if (txsToUpload.length > 0) {
        hasUploads = true;
        txsToUpload.forEach(t => {
          const docRef = userRef.collection('transactions').doc(t.id);
          batch.set(docRef, {
            id: t.id,
            type: t.type,
            amount: t.amount,
            categoryId: t.categoryId,
            date: t.date,
            paymentMethod: t.paymentMethod,
            note: t.note || '',
            createdAt: t.createdAt || Date.now()
          }, { merge: true });
        });
      }

      const mergedTxs = Array.from(txMap.values());
      mergedTxs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      StorageManager.saveTransactions(mergedTxs);

      // --- Merge Categories ---
      const catMap = new Map();
      cloudCats.forEach(c => catMap.set(c.id, c));

      localCats.forEach(c => {
        if (!catMap.has(c.id)) {
          catMap.set(c.id, c);
          if (!c.isDefault) {
            hasUploads = true;
            const docRef = userRef.collection('categories').doc(c.id);
            batch.set(docRef, c, { merge: true });
          }
        }
      });

      StorageManager.saveCategories(Array.from(catMap.values()));

      // --- Merge Recurring Items ---
      const recMap = new Map();
      cloudRecs.forEach(r => recMap.set(r.id, r));

      localRecs.forEach(r => {
        if (!recMap.has(r.id)) {
          recMap.set(r.id, r);
          hasUploads = true;
          const docRef = userRef.collection('recurring_items').doc(r.id);
          batch.set(docRef, r, { merge: true });
        }
      });

      StorageManager.saveRecurringItems(Array.from(recMap.values()));

      // Commit any new local items to Cloud
      if (hasUploads) {
        await batch.commit();
      }

      this.debouncedUpdateAggregations();
      App.renderAll();

      if (!isSilent) {
        const lang = I18n.getLanguage();
        App.showToast(lang === 'en' ? `Synced ${mergedTxs.length} records! ☁️✨` : `ซิงค์ข้อมูลสำเร็จ! ทั้งหมด ${mergedTxs.length} รายการ ☁️✨`);
      }
    } catch (e) {
      console.error('Error during two-way sync:', e);
      if (!isSilent) {
        App.showToast(I18n.getLanguage() === 'en' ? 'Sync error: ' + e.message : 'เกิดข้อผิดพลาดในการซิงค์: ' + e.message);
      }
    }
  },

  // --- Real-Time Live Sync Listener ---
  startRealtimeSync() {
    this.stopRealtimeSync();
    const userRef = this.getUserRef();
    if (!userRef) return;

    try {
      this._txUnsubscribe = userRef.collection('transactions').onSnapshot((snapshot) => {
        if (snapshot.empty && StorageManager.getTransactions().length === 0) return;

        const list = [];
        snapshot.forEach(doc => list.push(doc.data()));
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        const currentLocal = StorageManager.getTransactions();
        if (list.length > 0 && (list.length !== currentLocal.length || JSON.stringify(list) !== JSON.stringify(currentLocal))) {
          const map = new Map();
          list.forEach(t => map.set(t.id, t));
          currentLocal.forEach(t => {
            if (!map.has(t.id)) map.set(t.id, t);
          });
          const merged = Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          StorageManager.saveTransactions(merged);
          App.renderAll();
        }
      }, (error) => {
        console.error('Realtime sync listener error:', error);
      });
    } catch (e) {
      console.error('Failed to attach realtime sync listener:', e);
    }
  },

  stopRealtimeSync() {
    if (this._txUnsubscribe) {
      this._txUnsubscribe();
      this._txUnsubscribe = null;
    }
  },

  async migrateLocalToCloud() {
    const userRef = this.getUserRef();
    if (!userRef) return;

    const txs = StorageManager.getTransactions();
    const cats = StorageManager.getCategories();
    const recs = StorageManager.getRecurringItems();

    try {
      const batch = this.db.batch();

      // 1. Upload Categories
      cats.forEach(c => {
        const docRef = userRef.collection('categories').doc(c.id);
        batch.set(docRef, {
          id: c.id,
          name: c.name,
          nameEn: c.nameEn || c.name,
          emoji: c.emoji,
          color: c.color,
          type: c.type,
          isDefault: Boolean(c.isDefault)
        }, { merge: true });
      });

      // 2. Upload Recurring Items
      recs.forEach(r => {
        const docRef = userRef.collection('recurring_items').doc(r.id);
        batch.set(docRef, {
          id: r.id,
          type: r.type,
          name: r.name,
          nameEn: r.nameEn || r.name,
          amount: r.amount,
          categoryId: r.categoryId,
          paymentMethod: r.paymentMethod
        }, { merge: true });
      });

      // 3. Upload Transactions
      txs.forEach(t => {
        const docRef = userRef.collection('transactions').doc(t.id);
        batch.set(docRef, {
          id: t.id,
          type: t.type,
          amount: t.amount,
          categoryId: t.categoryId,
          date: t.date,
          paymentMethod: t.paymentMethod,
          note: t.note || '',
          createdAt: t.createdAt || Date.now()
        }, { merge: true });
      });

      await batch.commit();

      // Update aggregation summary docs
      await this.rebuildAllSummaries();

      App.showToast(I18n.getLanguage() === 'en' ? 'Firebase Cloud Sync Complete! 🔥' : 'ซิงค์ข้อมูลขึ้น Firebase Cloud เรียบร้อยแล้ว 🔥✨');
    } catch (e) {
      console.error('Migration error to Firestore:', e);
      alert('Error syncing to Firebase: ' + e.message);
    }
  },

  // Save/Update/Delete Hooks for Cloud
  async saveCloudTransaction(tx) {
    const userRef = this.getUserRef();
    if (!userRef) return;
    try {
      await userRef.collection('transactions').doc(tx.id).set(tx, { merge: true });
      this.debouncedUpdateAggregations(tx.date ? tx.date.slice(0, 7) : null);
    } catch (e) {
      console.error('Error saving transaction to Firestore:', e);
    }
  },

  async deleteCloudTransaction(id) {
    const userRef = this.getUserRef();
    if (!userRef) return;
    try {
      await userRef.collection('transactions').doc(id).delete();
      this.debouncedUpdateAggregations();
    } catch (e) {
      console.error('Error deleting transaction from Firestore:', e);
    }
  },

  async saveCloudCategory(cat) {
    const userRef = this.getUserRef();
    if (!userRef) return;
    try {
      await userRef.collection('categories').doc(cat.id).set(cat, { merge: true });
    } catch (e) {
      console.error('Error saving category to Firestore:', e);
    }
  },

  async deleteCloudCategory(id) {
    const userRef = this.getUserRef();
    if (!userRef) return;
    try {
      await userRef.collection('categories').doc(id).delete();
    } catch (e) {
      console.error('Error deleting category from Firestore:', e);
    }
  },

  async saveCloudRecurringItem(item) {
    const userRef = this.getUserRef();
    if (!userRef) return;
    try {
      await userRef.collection('recurring_items').doc(item.id).set(item, { merge: true });
    } catch (e) {
      console.error('Error saving recurring item to Firestore:', e);
    }
  },

  async deleteCloudRecurringItem(id) {
    const userRef = this.getUserRef();
    if (!userRef) return;
    try {
      await userRef.collection('recurring_items').doc(id).delete();
    } catch (e) {
      console.error('Error deleting recurring item from Firestore:', e);
    }
  },

  // --- Monthly & Yearly Pre-Aggregated Summary Documents ---
  debouncedUpdateAggregations(yearMonthStr) {
    if (this._aggTimeout) clearTimeout(this._aggTimeout);
    this._aggTimeout = setTimeout(() => {
      this.updateAggregations(yearMonthStr);
    }, 1500);
  },

  async updateAggregations(yearMonthStr) {
    const userRef = this.getUserRef();
    if (!userRef) return;

    try {
      const allTxs = StorageManager.getTransactions();
      const targetYearMonth = yearMonthStr || new Date().toISOString().slice(0, 7);
      const targetYear = targetYearMonth.slice(0, 4);

      // 1. Monthly calculation (users/{uid}/summaries_monthly/{YYYY-MM})
      const monthlyTxs = allTxs.filter(t => (t.date || '').startsWith(targetYearMonth));
      let mIncome = 0;
      let mExpense = 0;
      const mCatMap = {};

      monthlyTxs.forEach(t => {
        if (t.type === 'income') {
          mIncome += t.amount;
        } else {
          mExpense += t.amount;
          mCatMap[t.categoryId] = (mCatMap[t.categoryId] || 0) + t.amount;
        }
      });

      // 2. Yearly calculation (users/{uid}/summaries_yearly/{YYYY})
      const yearlyTxs = allTxs.filter(t => (t.date || '').startsWith(targetYear));
      let yIncome = 0;
      let yExpense = 0;
      const yCatMap = {};
      const yMonthlyBreakdown = {};

      for (let m = 1; m <= 12; m++) {
        const mKey = String(m).padStart(2, '0');
        yMonthlyBreakdown[mKey] = { income: 0, expense: 0, net: 0, count: 0 };
      }

      yearlyTxs.forEach(t => {
        const mKey = (t.date || '').slice(5, 7);
        if (t.type === 'income') {
          yIncome += t.amount;
          if (yMonthlyBreakdown[mKey]) yMonthlyBreakdown[mKey].income += t.amount;
        } else {
          yExpense += t.amount;
          yCatMap[t.categoryId] = (yCatMap[t.categoryId] || 0) + t.amount;
          if (yMonthlyBreakdown[mKey]) yMonthlyBreakdown[mKey].expense += t.amount;
        }
        if (yMonthlyBreakdown[mKey]) yMonthlyBreakdown[mKey].count++;
      });

      Object.keys(yMonthlyBreakdown).forEach(k => {
        yMonthlyBreakdown[k].net = yMonthlyBreakdown[k].income - yMonthlyBreakdown[k].expense;
      });

      const batch = this.db.batch();

      // Monthly Doc
      const mDocRef = userRef.collection('summaries_monthly').doc(targetYearMonth);
      batch.set(mDocRef, {
        yearMonth: targetYearMonth,
        totalIncome: mIncome,
        totalExpense: mExpense,
        netBalance: mIncome - mExpense,
        categoryTotals: mCatMap,
        txCount: monthlyTxs.length,
        updatedAt: Date.now()
      }, { merge: true });

      // Yearly Doc
      const yDocRef = userRef.collection('summaries_yearly').doc(targetYear);
      batch.set(yDocRef, {
        year: targetYear,
        totalIncome: yIncome,
        totalExpense: yExpense,
        netSavings: yIncome - yExpense,
        savingsRate: yIncome > 0 ? ((yIncome - yExpense) / yIncome) * 100 : 0,
        monthlyBreakdown: yMonthlyBreakdown,
        categoryTotals: yCatMap,
        txCount: yearlyTxs.length,
        updatedAt: Date.now()
      }, { merge: true });

      await batch.commit();
    } catch (e) {
      console.error('Error updating aggregations in Firestore:', e);
    }
  },

  async rebuildAllSummaries() {
    const userRef = this.getUserRef();
    if (!userRef) return;

    try {
      const allTxs = StorageManager.getTransactions();
      const months = new Set();
      allTxs.forEach(t => {
        if (t.date && t.date.length >= 7) {
          months.add(t.date.slice(0, 7));
        }
      });

      for (const m of months) {
        await this.updateAggregations(m);
      }
    } catch (e) {
      console.error('Error rebuilding all summaries:', e);
    }
  },

  // --- UI Rendering for Auth Header ---
  renderAuthUI() {
    const authContainer = document.getElementById('auth-header-container');
    const syncBanner = document.getElementById('cloud-sync-status-banner');
    const lang = (typeof I18n !== 'undefined') ? I18n.getLanguage() : 'th';

    if (this.currentUser) {
      const avatarUrl = this.currentUser.photoURL;
      const fullName = this.currentUser.displayName || this.currentUser.email.split('@')[0];
      const initial = fullName.charAt(0).toUpperCase();

      if (authContainer) {
        authContainer.innerHTML = `
          <div class="relative group">
            <button type="button" class="flex items-center gap-1.5 p-1 sm:px-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl shadow-2xs transition-all cursor-pointer">
              ${avatarUrl 
                ? `<img src="${avatarUrl}" alt="${fullName}" class="w-6 h-6 rounded-xl object-cover" />`
                : `<div class="w-6 h-6 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center justify-center">${initial}</div>`
              }
              <span class="text-xs font-bold text-slate-800 truncate max-w-[85px] hidden sm:inline">${fullName}</span>
              <span class="w-2 h-2 rounded-full bg-emerald-400 mr-0.5 shadow-2xs" title="Firebase Cloud Live Sync Active"></span>
            </button>

            <!-- Dropdown Menu -->
            <div class="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-3xl shadow-xl border border-slate-100 p-2 hidden group-hover:block group-focus-within:block z-50 animate-modal">
              <div class="px-3 py-2 border-b border-slate-100">
                <p class="text-xs font-bold text-slate-900 truncate">${fullName}</p>
                <p class="text-[10px] text-slate-400 truncate">${this.currentUser.email}</p>
                <span class="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> ${lang === 'en' ? 'Live Cloud Sync' : 'ซิงค์ข้อมูล Cloud อัตโนมัติ 🔥'}
                </span>
              </div>

              <div class="py-1.5 space-y-1 text-xs font-semibold">
                <button type="button" onclick="FirebaseManager.performTwoWaySync()" class="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-2xl transition-colors flex items-center gap-2 cursor-pointer">
                  <span>🔄</span> ${lang === 'en' ? 'Sync Now' : 'ซิงค์ข้อมูลเดี๋ยวนี้'}
                </button>
                <button type="button" onclick="FirebaseManager.signOut()" class="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-2xl transition-colors flex items-center gap-2 cursor-pointer">
                  <span>🚪</span> ${lang === 'en' ? 'Sign Out' : 'ออกจากระบบ'}
                </button>
              </div>
            </div>
          </div>
        `;
      }

      if (syncBanner) {
        syncBanner.classList.add('hidden');
      }
    } else {
      if (authContainer) {
        authContainer.innerHTML = `
          <button 
            type="button" 
            onclick="FirebaseManager.signInWithGoogle()" 
            class="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 font-bold text-xs rounded-2xl shadow-2xs transition-all cursor-pointer"
            title="เข้าสู่ระบบด้วย Google เพื่อซิงค์ข้อมูลข้ามอุปกรณ์"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1s.7 5.4 1.9 7.8l3.7-2.9z"/>
              <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/>
            </svg>
            <span class="inline text-[11px] sm:text-xs">${lang === 'en' ? 'Login' : 'เข้าสู่ระบบ'}</span>
          </button>
        `;
      }

      if (syncBanner) {
        syncBanner.classList.remove('hidden');
      }
    }
  }
};
