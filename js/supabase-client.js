/**
 * Supabase Client & Cloud Sync Integration for Money Memo
 * Handles Google OAuth, Realtime Cloud Sync, and Local-to-Cloud Migration
 */

const SUPABASE_STORAGE_KEYS = {
  URL: 'money_memo_supabase_url',
  ANON_KEY: 'money_memo_supabase_anon_key'
};

// Default fallback configuration (User can set directly in code or via UI Modal)
const DEFAULT_SUPABASE_CONFIG = {
  url: '',      // e.g. 'https://xyzcompany.supabase.co'
  anonKey: ''  // e.g. 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};

const SupabaseManager = {
  client: null,
  currentUser: null,
  isInitialized: false,

  getConfig() {
    try {
      let storedUrl = localStorage.getItem(SUPABASE_STORAGE_KEYS.URL);
      const storedKey = localStorage.getItem(SUPABASE_STORAGE_KEYS.ANON_KEY);
      
      let cleanUrl = (storedUrl || DEFAULT_SUPABASE_CONFIG.url || '').trim();
      cleanUrl = cleanUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

      return {
        url: cleanUrl,
        anonKey: (storedKey || DEFAULT_SUPABASE_CONFIG.anonKey || '').trim()
      };
    } catch (e) {
      return DEFAULT_SUPABASE_CONFIG;
    }
  },

  saveConfig(url, anonKey) {
    try {
      let cleanUrl = (url || '').trim();
      cleanUrl = cleanUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

      localStorage.setItem(SUPABASE_STORAGE_KEYS.URL, cleanUrl);
      localStorage.setItem(SUPABASE_STORAGE_KEYS.ANON_KEY, (anonKey || '').trim());
      this.init();
      return true;
    } catch (e) {
      console.error('Error saving Supabase config:', e);
      return false;
    }
  },

  isConfigured() {
    const config = this.getConfig();
    return Boolean(config.url && config.anonKey && config.url.startsWith('https://'));
  },

  init() {
    const config = this.getConfig();
    if (!config.url || !config.anonKey) {
      this.client = null;
      this.currentUser = null;
      this.isInitialized = true;
      this.renderAuthUI();
      return;
    }

    try {
      if (typeof supabase !== 'undefined') {
        this.client = supabase.createClient(config.url, config.anonKey);
        this.isInitialized = true;

        // Check active session
        this.client.auth.getSession().then(({ data: { session } }) => {
          this.currentUser = session?.user || null;
          this.renderAuthUI();
          if (this.currentUser) {
            this.syncFromCloud();
          }
        });

        // Listen for auth state changes
        this.client.auth.onAuthStateChange((event, session) => {
          this.currentUser = session?.user || null;
          this.renderAuthUI();

          if (event === 'SIGNED_IN' && this.currentUser) {
            this.handleUserSignedIn();
          } else if (event === 'SIGNED_OUT') {
            App.showToast(I18n.getLanguage() === 'en' ? 'Logged out successfully' : 'ออกจากระบบเรียบร้อยแล้ว');
            App.renderAll();
          }
        });
      }
    } catch (e) {
      console.error('Error initializing Supabase client:', e);
    }
  },

  isLoggedIn() {
    return Boolean(this.currentUser);
  },

  getUser() {
    return this.currentUser;
  },

  async signInWithGoogle() {
    if (!this.isConfigured()) {
      this.openConfigModal();
      return;
    }

    if (!this.client) {
      alert(I18n.getLanguage() === 'en' ? 'Supabase client not initialized' : 'ยังไม่ได้เชื่อมต่อ Supabase Client');
      return;
    }

    try {
      const redirectUrl = window.location.origin + window.location.pathname;
      const { data, error } = await this.client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });

      if (error) throw error;
    } catch (e) {
      console.error('Login error:', e);
      alert((I18n.getLanguage() === 'en' ? 'Google Login Failed: ' : 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ: ') + e.message);
    }
  },

  async signOut() {
    if (!this.client) return;
    try {
      const { error } = await this.client.auth.signOut();
      if (error) throw error;
      this.currentUser = null;
      this.renderAuthUI();
    } catch (e) {
      console.error('Logout error:', e);
    }
  },

  async handleUserSignedIn() {
    App.showToast(I18n.getLanguage() === 'en' ? `Welcome back, ${this.currentUser.user_metadata?.full_name || 'User'}!` : `ยินดีต้อนรับคุณ ${this.currentUser.user_metadata?.full_name || 'ผู้ใช้งาน'}! ✨`);
    
    // Check if cloud has data, if not, ask to upload local data
    const cloudTxs = await this.fetchCloudTransactions();
    const localTxs = StorageManager.getTransactions();

    if (cloudTxs.length === 0 && localTxs.length > 0) {
      const lang = I18n.getLanguage();
      const confirmUpload = confirm(
        lang === 'en' 
          ? `You have ${localTxs.length} records on this device. Do you want to sync them to your Google Cloud Account?`
          : `คุณมีข้อมูลในเครื่องนี้ ${localTxs.length} รายการ ต้องการอัปโหลดขึ้นบัญชี Google Cloud ของคุณด้วยหรือไม่?`
      );

      if (confirmUpload) {
        await this.migrateLocalToCloud();
      }
    } else {
      await this.syncFromCloud();
    }

    App.renderAll();
  },

  // --- Cloud Sync Operations ---
  async fetchCloudTransactions() {
    if (!this.client || !this.currentUser) return [];
    try {
      const { data, error } = await this.client
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Error fetching transactions from cloud:', e);
      return [];
    }
  },

  async fetchCloudCategories() {
    if (!this.client || !this.currentUser) return [];
    try {
      const { data, error } = await this.client
        .from('categories')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Error fetching categories from cloud:', e);
      return [];
    }
  },

  async fetchCloudRecurring() {
    if (!this.client || !this.currentUser) return [];
    try {
      const { data, error } = await this.client
        .from('recurring_items')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Error fetching recurring items from cloud:', e);
      return [];
    }
  },

  async syncFromCloud() {
    if (!this.client || !this.currentUser) return;

    try {
      const [txs, cats, recs] = await Promise.all([
        this.fetchCloudTransactions(),
        this.fetchCloudCategories(),
        this.fetchCloudRecurring()
      ]);

      if (txs.length > 0) {
        // Map snake_case to app structure
        const mappedTxs = txs.map(t => ({
          id: t.id,
          type: t.type,
          amount: parseFloat(t.amount) || 0,
          categoryId: t.category_id,
          date: t.date,
          paymentMethod: t.payment_method || 'เงินสด (Cash)',
          note: t.note || '',
          createdAt: new Date(t.created_at).getTime()
        }));
        StorageManager.saveTransactions(mappedTxs);
      }

      if (cats.length > 0) {
        const mappedCats = cats.map(c => ({
          id: c.id,
          name: c.name,
          nameEn: c.name_en || c.name,
          emoji: c.emoji,
          color: c.color,
          type: c.type,
          isDefault: c.is_default || false
        }));
        StorageManager.saveCategories(mappedCats);
      }

      if (recs.length > 0) {
        const mappedRecs = recs.map(r => ({
          id: r.id,
          type: r.type,
          name: r.name,
          nameEn: r.name_en || r.name,
          amount: parseFloat(r.amount) || 0,
          categoryId: r.category_id,
          paymentMethod: r.payment_method || 'โอนเงิน / บัญชีธนาคาร'
        }));
        StorageManager.saveRecurringItems(mappedRecs);
      }

      App.renderAll();
    } catch (e) {
      console.error('Error in syncFromCloud:', e);
    }
  },

  async migrateLocalToCloud() {
    if (!this.client || !this.currentUser) return;

    const txs = StorageManager.getTransactions();
    const cats = StorageManager.getCategories();
    const recs = StorageManager.getRecurringItems();

    const userId = this.currentUser.id;

    try {
      // 1. Upload Categories
      if (cats.length > 0) {
        const catRows = cats.map(c => ({
          id: c.id,
          user_id: userId,
          name: c.name,
          name_en: c.nameEn || c.name,
          emoji: c.emoji,
          color: c.color,
          type: c.type,
          is_default: Boolean(c.isDefault)
        }));
        await this.client.from('categories').upsert(catRows);
      }

      // 2. Upload Recurring Items
      if (recs.length > 0) {
        const recRows = recs.map(r => ({
          id: r.id,
          user_id: userId,
          type: r.type,
          name: r.name,
          name_en: r.nameEn || r.name,
          amount: r.amount,
          category_id: r.categoryId,
          payment_method: r.paymentMethod
        }));
        await this.client.from('recurring_items').upsert(recRows);
      }

      // 3. Upload Transactions
      if (txs.length > 0) {
        const txRows = txs.map(t => ({
          id: t.id,
          user_id: userId,
          type: t.type,
          amount: t.amount,
          category_id: t.categoryId,
          date: t.date,
          payment_method: t.paymentMethod,
          note: t.note
        }));
        await this.client.from('transactions').upsert(txRows);
      }

      App.showToast(I18n.getLanguage() === 'en' ? 'Cloud sync complete! ☁️' : 'ซิงค์ข้อมูลขึ้น Cloud เรียบร้อยแล้ว ☁️✨');
    } catch (e) {
      console.error('Migration error:', e);
      alert('Error migrating data: ' + e.message);
    }
  },

  // Save/Update/Delete Hooks for Cloud
  async saveCloudTransaction(tx) {
    if (!this.client || !this.currentUser) return;
    try {
      await this.client.from('transactions').upsert({
        id: tx.id,
        user_id: this.currentUser.id,
        type: tx.type,
        amount: tx.amount,
        category_id: tx.categoryId,
        date: tx.date,
        payment_method: tx.paymentMethod,
        note: tx.note
      });
    } catch (e) {
      console.error('Error saving transaction to cloud:', e);
    }
  },

  async deleteCloudTransaction(id) {
    if (!this.client || !this.currentUser) return;
    try {
      await this.client.from('transactions').delete().eq('id', id);
    } catch (e) {
      console.error('Error deleting transaction from cloud:', e);
    }
  },

  async saveCloudCategory(cat) {
    if (!this.client || !this.currentUser) return;
    try {
      await this.client.from('categories').upsert({
        id: cat.id,
        user_id: this.currentUser.id,
        name: cat.name,
        name_en: cat.nameEn || cat.name,
        emoji: cat.emoji,
        color: cat.color,
        type: cat.type,
        is_default: Boolean(cat.isDefault)
      });
    } catch (e) {
      console.error('Error saving category to cloud:', e);
    }
  },

  async deleteCloudCategory(id) {
    if (!this.client || !this.currentUser) return;
    try {
      await this.client.from('categories').delete().eq('id', id);
    } catch (e) {
      console.error('Error deleting category from cloud:', e);
    }
  },

  async saveCloudRecurringItem(item) {
    if (!this.client || !this.currentUser) return;
    try {
      await this.client.from('recurring_items').upsert({
        id: item.id,
        user_id: this.currentUser.id,
        type: item.type,
        name: item.name,
        name_en: item.nameEn || item.name,
        amount: item.amount,
        category_id: item.categoryId,
        payment_method: item.paymentMethod
      });
    } catch (e) {
      console.error('Error saving recurring item to cloud:', e);
    }
  },

  async deleteCloudRecurringItem(id) {
    if (!this.client || !this.currentUser) return;
    try {
      await this.client.from('recurring_items').delete().eq('id', id);
    } catch (e) {
      console.error('Error deleting recurring item from cloud:', e);
    }
  },

  // --- UI Rendering for Auth Header & Settings Modal ---
  renderAuthUI() {
    const authContainer = document.getElementById('auth-header-container');
    if (!authContainer) return;

    const lang = (typeof I18n !== 'undefined') ? I18n.getLanguage() : 'th';

    if (this.currentUser) {
      const userMeta = this.currentUser.user_metadata || {};
      const avatarUrl = userMeta.avatar_url || userMeta.picture;
      const fullName = userMeta.full_name || this.currentUser.email.split('@')[0];
      const initial = fullName.charAt(0).toUpperCase();

      authContainer.innerHTML = `
        <div class="relative group">
          <button type="button" class="flex items-center gap-1.5 p-1 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl shadow-2xs transition-all cursor-pointer">
            ${avatarUrl 
              ? `<img src="${avatarUrl}" alt="${fullName}" class="w-6 h-6 rounded-xl object-cover" />`
              : `<div class="w-6 h-6 rounded-xl bg-indigo-500 text-white font-bold text-xs flex items-center justify-center">${initial}</div>`
            }
            <span class="text-xs font-bold text-slate-700 truncate max-w-[90px] hidden sm:inline">${fullName}</span>
            <span class="w-2 h-2 rounded-full bg-emerald-400 mr-1 shadow-2xs" title="Cloud Sync Active"></span>
          </button>

          <!-- Dropdown Menu -->
          <div class="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 hidden group-hover:block group-focus-within:block z-50 animate-modal">
            <div class="px-2.5 py-1.5 border-b border-slate-100">
              <p class="text-xs font-bold text-slate-900 truncate">${fullName}</p>
              <p class="text-[10px] text-slate-400 truncate">${this.currentUser.email}</p>
              <span class="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ${lang === 'en' ? 'Cloud Sync Active' : 'ซิงค์ข้อมูล Cloud เปิดอยู่'}
              </span>
            </div>

            <div class="py-1 space-y-0.5 text-xs font-medium">
              <button type="button" onclick="SupabaseManager.migrateLocalToCloud()" class="w-full text-left px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2 cursor-pointer">
                <span>☁️</span> ${lang === 'en' ? 'Force Sync to Cloud' : 'ซิงค์ข้อมูลขึ้น Cloud ทันที'}
              </button>
              <button type="button" onclick="SupabaseManager.openConfigModal()" class="w-full text-left px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2 cursor-pointer">
                <span>⚙️</span> ${lang === 'en' ? 'Supabase Settings' : 'ตั้งค่า Supabase'}
              </button>
              <button type="button" onclick="SupabaseManager.signOut()" class="w-full text-left px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-2 cursor-pointer">
                <span>🚪</span> ${lang === 'en' ? 'Sign Out' : 'ออกจากระบบ'}
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      authContainer.innerHTML = `
        <button 
          type="button" 
          onclick="SupabaseManager.signInWithGoogle()" 
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 font-bold text-xs rounded-2xl shadow-2xs transition-all cursor-pointer"
          title="Login with Google for Cloud Sync"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
            <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1s.7 5.4 1.9 7.8l3.7-2.9z"/>
            <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/>
          </svg>
          <span class="hidden sm:inline">${lang === 'en' ? 'Google Login' : 'เข้าสู่ระบบ'}</span>
        </button>
      `;
    }
  },

  openConfigModal() {
    const modal = document.getElementById('supabase-config-modal');
    const urlInput = document.getElementById('supabase-url-input');
    const keyInput = document.getElementById('supabase-key-input');

    const config = this.getConfig();
    if (urlInput) urlInput.value = config.url || '';
    if (keyInput) keyInput.value = config.anonKey || '';

    if (modal) modal.classList.add('show');
  },

  closeConfigModal() {
    const modal = document.getElementById('supabase-config-modal');
    if (modal) modal.classList.remove('show');
  },

  handleSaveConfig() {
    const urlInput = document.getElementById('supabase-url-input');
    const keyInput = document.getElementById('supabase-key-input');

    const url = (urlInput?.value || '').trim();
    const anonKey = (keyInput?.value || '').trim();

    if (url && !url.startsWith('https://')) {
      alert(I18n.getLanguage() === 'en' ? 'Supabase Project URL must start with https://' : 'Project URL ต้องขึ้นต้นด้วย https://');
      return;
    }

    this.saveConfig(url, anonKey);
    this.closeConfigModal();
    App.showToast(I18n.getLanguage() === 'en' ? 'Supabase config saved!' : 'บันทึกการตั้งค่า Supabase เรียบร้อยแล้ว 🎉');
  }
};
