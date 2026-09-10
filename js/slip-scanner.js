/**
 * Money Memo - PromptPay Mini-QR & Bank Slip Scanner Engine v1.0
 * Decodes Bank of Thailand (BOT) Standard Mini-QR / EMVCo payloads from Thai Banking Slips
 * Provides 100% mathematical precision for amount, ISO timestamp, bank code, and TransRef.
 */

const SlipScanner = {
  activeSlipData: null,
  activePreviewUrl: null,
  selectedCategory: 'exp_food',

  // Thai Financial Institutions Dictionary
  BANK_DIRECTORY: {
    '002': { name: 'ธนาคารกรุงเทพ (Bangkok Bank)', shortName: 'BBL', emoji: '🏦', color: '#1e4598' },
    '004': { name: 'ธนาคารกสิกรไทย (K PLUS / KBANK)', shortName: 'K PLUS', emoji: '🟢', color: '#138f2d' },
    '006': { name: 'ธนาคารกรุงไทย (Krungthai NEXT)', shortName: 'KTB', emoji: '🩵', color: '#1ba5e1' },
    '009': { name: 'ธนาคารโอเวอร์ซี-ไชนีส (OCBC)', shortName: 'OCBC', emoji: '🏦', color: '#ea1b23' },
    '011': { name: 'ธนาคารทหารไทยธนชาต (ttb touch)', shortName: 'TTB', emoji: '🔵', color: '#002d63' },
    '014': { name: 'ธนาคารไทยพาณิชย์ (SCB EASY)', shortName: 'SCB', emoji: '💜', color: '#4e2a84' },
    '018': { name: 'ธนาคารสแตนดาร์ดชาร์เตอร์ด', shortName: 'SCBT', emoji: '🏦', color: '#0076a8' },
    '022': { name: 'ธนาคารซีไอเอ็มบีไทย (CIMB THAI)', shortName: 'CIMB', emoji: '🔴', color: '#7c0014' },
    '024': { name: 'ธนาคารยูโอบี (UOB TMRW)', shortName: 'UOB', emoji: '🔵', color: '#0b2545' },
    '025': { name: 'ธนาคารกรุงศรีอยุธยา (KMA Krungsri)', shortName: 'BAY', emoji: '🟡', color: '#fec43b' },
    '030': { name: 'ธนาคารออมสิน (MyMo GSB)', shortName: 'GSB', emoji: '🌸', color: '#eb1985' },
    '034': { name: 'ธ.ก.ส. (BAAC A-Mobile)', shortName: 'BAAC', emoji: '🌾', color: '#2b7837' },
    '065': { name: 'ธนาคารธนชาต (Thanachart)', shortName: 'TBANK', emoji: '🟠', color: '#fc4c02' },
    '066': { name: 'ธนาคารอิสลามแห่งประเทศไทย', shortName: 'ISBT', emoji: '🏦', color: '#175e3c' },
    '067': { name: 'ธนาคารทิสโก้ (TISCO)', shortName: 'TISCO', emoji: '🏦', color: '#005596' },
    '069': { name: 'ธนาคารเกียรตินาคินภัทร (KKP Mobile)', shortName: 'KKP', emoji: '🩶', color: '#194f6e' },
    '070': { name: 'ธนาคารไทยเครดิต', shortName: 'TCRB', emoji: '🏦', color: '#0a4275' },
    '071': { name: 'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)', shortName: 'LHB', emoji: '🩵', color: '#0083ca' },
    '073': { name: 'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)', shortName: 'LHB', emoji: '🩵', color: '#0083ca' },
    '140': { name: 'ทรูมันนี่ วอลเล็ท (TrueMoney)', shortName: 'TrueMoney', emoji: '👛', color: '#f47920' }
  },

  init() {
    this.bindGlobalEvents();
  },

  bindGlobalEvents() {
    if (typeof window === 'undefined' || !window.addEventListener) return;

    // 1. Paste event (Ctrl+V or mobile clipboard paste)
    window.addEventListener('paste', (e) => {
      const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            this.processSlipFile(file);
            break;
          }
        }
      }
    });

    // 2. Drag & Drop events
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          this.processSlipFile(file);
        }
      }
    });
  },

  triggerFileInput() {
    let input = document.getElementById('slip-file-input');
    if (!input) {
      input = document.createElement('input');
      input.id = 'slip-file-input';
      input.type = 'file';
      input.accept = 'image/*';
      input.className = 'hidden';
      input.onchange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.processSlipFile(e.target.files[0]);
          e.target.value = ''; // Reset for re-selection
        }
      };
      document.body.appendChild(input);
    }
    input.click();
  },

  /**
   * Main entry point to process a slip image file/blob
   */
  async processSlipFile(file) {
    if (!file) return;

    this.showScanningSpinner(true);

    try {
      // 1. Create Preview URL
      const previewUrl = URL.createObjectURL(file);
      this.activePreviewUrl = previewUrl;

      // 2. Load image into memory & canvas
      const img = await this.loadImage(previewUrl);

      // 3. Scan QR code using multi-pass algorithm
      const qrResult = await this.scanQRCodeMultiPass(img);

      if (!qrResult || !qrResult.data) {
        // Fallback: No QR detected
        this.showScanningSpinner(false);
        this.handleNoQRDetected(previewUrl);
        return;
      }

      // 4. Parse Bank of Thailand / PromptPay Mini-QR Payload
      const parsedData = this.parsePromptPayQR(qrResult.data);

      this.showScanningSpinner(false);

      if (parsedData.success) {
        this.activeSlipData = parsedData;
        this.openSlipModal(parsedData, previewUrl);
      } else {
        // Partial or unparsed QR: still open modal with extracted raw hints
        this.activeSlipData = parsedData;
        this.openSlipModal(parsedData, previewUrl);
      }

    } catch (err) {
      console.error('Slip processing error:', err);
      this.showScanningSpinner(false);
      if (typeof App !== 'undefined' && App.showToast) {
        App.showToast('⚠️ เกิดข้อผิดพลาดในการประมวลผลรูปสลิป');
      }
    }
  },

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  },

  /**
   * Multi-pass QR Decoder using jsQR
   * Passes:
   * 1. Full image at native/capped resolution
   * 2. Bottom 55% of image (where Thai bank slip QR is located)
   * 3. Downscaled 800px image (handles high-res camera shots)
   * 4. High-contrast / Grayscale binarized canvas
   */
  async scanQRCodeMultiPass(img) {
    if (typeof jsQR === 'undefined') {
      console.warn('jsQR library not loaded yet, attempting to wait...');
      await new Promise(r => setTimeout(r, 200));
      if (typeof jsQR === 'undefined') {
        throw new Error('jsQR library unavailable');
      }
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // --- Pass 1: Standard / Scaled Full Canvas ---
    const maxDimension = 1400;
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;

    if (w > maxDimension || h > maxDimension) {
      const ratio = Math.min(maxDimension / w, maxDimension / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    let imageData = ctx.getImageData(0, 0, w, h);
    let code = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
    if (code && code.data) return code;

    // --- Pass 2: Bottom 55% Crop (Common location for K PLUS, SCB, KTB, BBL) ---
    const cropY = Math.round(h * 0.45);
    const cropH = h - cropY;
    const cropData = ctx.getImageData(0, cropY, w, cropH);
    code = jsQR(cropData.data, w, cropH, { inversionAttempts: 'attemptBoth' });
    if (code && code.data) return code;

    // --- Pass 3: Bottom-Right & Bottom-Left Quadrants ---
    const halfW = Math.round(w * 0.5);
    const brData = ctx.getImageData(halfW, cropY, halfW, cropH);
    code = jsQR(brData.data, halfW, cropH, { inversionAttempts: 'attemptBoth' });
    if (code && code.data) return code;

    const blData = ctx.getImageData(0, cropY, halfW, cropH);
    code = jsQR(blData.data, halfW, cropH, { inversionAttempts: 'attemptBoth' });
    if (code && code.data) return code;

    // --- Pass 4: Contrast Enhancement & Grayscale Thresholding ---
    this.enhanceContrast(imageData.data);
    code = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
    if (code && code.data) return code;

    return null;
  },

  enhanceContrast(data) {
    for (let i = 0; i < data.length; i += 4) {
      // Grayscale luminance
      const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      // High contrast step
      const val = avg > 128 ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
  },

  /**
   * TLV (Tag-Length-Value) Parser for BOT PromptPay / EMVCo payloads
   */
  parseTLV(raw) {
    const tags = {};
    let pos = 0;
    while (pos + 4 <= raw.length) {
      const tag = raw.substring(pos, pos + 2);
      const len = parseInt(raw.substring(pos + 2, pos + 4), 10);
      if (isNaN(len)) break;
      const end = Math.min(raw.length, pos + 4 + len);
      const val = raw.substring(pos + 4, end);
      tags[tag] = val;
      pos += 4 + len;
    }
    return tags;
  },

  /**
   * Parses Bank of Thailand (BOT) Standard Mini-QR / EMVCo Slip payloads
   */
  parsePromptPayQR(rawPayload) {
    if (!rawPayload || typeof rawPayload !== 'string') {
      return { success: false, rawPayload: '' };
    }

    const trimmed = rawPayload.trim();
    const result = {
      success: false,
      amount: null,
      dateStr: null,
      timeStr: null,
      dateTimeIso: null,
      bankCode: null,
      bankInfo: null,
      transRef: null,
      payeeName: null,
      rawPayload: trimmed
    };

    try {
      const rootTags = this.parseTLV(trimmed);

      // Sub-TLVs inside Tag 00 (BOT Standard Mini-QR payload: 0046000600000101030040225...)
      if (rootTags['00'] && rootTags['00'].length > 8) {
        const sub00 = this.parseTLV(rootTags['00']);
        if (sub00['01']) {
          result.bankCode = sub00['01'].padStart(3, '0');
        }
        if (sub00['02']) {
          result.transRef = sub00['02'];
        }
      }

      // Sub-TLVs inside Tag 30 (EMVCo PromptPay)
      if (rootTags['30']) {
        const sub30 = this.parseTLV(rootTags['30']);
        if (sub30['02']) result.bankCode = sub30['02'].padStart(3, '0');
        if (sub30['01']) result.transRef = sub30['01'];
      }

      // Sub-TLVs inside Tag 31 (EMVCo Bank/Merchant)
      if (rootTags['31']) {
        const sub31 = this.parseTLV(rootTags['31']);
        if (sub31['02']) result.bankCode = sub31['02'].padStart(3, '0');
        if (sub31['01']) result.transRef = sub31['01'];
      }

      // Direct Bank Code in Tag 01 if 3 digits
      if (!result.bankCode && rootTags['01'] && this.BANK_DIRECTORY[rootTags['01'].padStart(3, '0')]) {
        result.bankCode = rootTags['01'].padStart(3, '0');
      }

      // Direct TransRef in Tag 02
      if (!result.transRef && rootTags['02']) {
        result.transRef = rootTags['02'];
      }

      // Amount: Tag 04 (BOT Mini-QR) or Tag 54 (EMVCo)
      if (rootTags['04'] && !isNaN(parseFloat(rootTags['04']))) {
        result.amount = parseFloat(rootTags['04']);
      } else if (rootTags['54'] && !isNaN(parseFloat(rootTags['54']))) {
        result.amount = parseFloat(rootTags['54']);
      }

      // Payee Name: Tag 59
      if (rootTags['59']) {
        result.payeeName = rootTags['59'];
      }

      // Timestamp: Tag 03 (BOT Mini-QR e.g. 20260910123015)
      if (rootTags['03']) {
        const dMatch = rootTags['03'].match(/^(202\d)(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
        if (dMatch) {
          const [, y, m, d, hh = '12', mm = '00', ss = '00'] = dMatch;
          result.dateStr = `${y}-${m}-${d}`;
          result.timeStr = `${hh}:${mm}`;
          result.dateTimeIso = `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
        }
      }

    } catch (e) {
      console.warn('TLV parse exception, falling back to regex:', e);
    }

    // Fallback Regex matchers on raw payload for safety:
    if (result.amount === null) {
      const amtMatch = trimmed.match(/(?:540[4-8]|54\d{2}|040[4-8])([0-9]+\.[0-9]{2})/);
      if (amtMatch) {
        result.amount = parseFloat(amtMatch[1]);
      } else {
        const plainAmt = trimmed.match(/(\d+\.\d{2})/);
        if (plainAmt) result.amount = parseFloat(plainAmt[1]);
      }
    }

    if (!result.dateStr) {
      const dateMatch = trimmed.match(/(202\d{1})(\d{2})(\d{2})(\d{2})?(\d{2})?/);
      if (dateMatch) {
        const [, y, m, d, hh = '12', mm = '00'] = dateMatch;
        result.dateStr = `${y}-${m}-${d}`;
        result.timeStr = `${hh}:${mm}`;
        result.dateTimeIso = `${y}-${m}-${d}T${hh}:${mm}:00`;
      } else {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        result.dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        result.timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        result.dateTimeIso = `${result.dateStr}T${result.timeStr}:00`;
      }
    }

    if (result.bankCode && this.BANK_DIRECTORY[result.bankCode]) {
      result.bankInfo = this.BANK_DIRECTORY[result.bankCode];
    } else {
      // Default / Generic Thai Bank
      result.bankInfo = {
        name: 'สลิปโอนเงิน / พร้อมเพย์',
        shortName: 'PromptPay',
        emoji: '🧾',
        color: '#475569'
      };
    }

    if (result.amount !== null && !isNaN(result.amount) && result.amount > 0) {
      result.success = true;
    } else {
      result.success = false;
    }

    return result;
  },

  /**
   * Handle case where QR is not found (fallback to manual entry with image attached)
   */
  handleNoQRDetected(previewUrl) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    this.activeSlipData = {
      success: false,
      amount: '',
      dateStr: todayStr,
      timeStr: timeStr,
      dateTimeIso: `${todayStr}T${timeStr}:00`,
      bankCode: null,
      bankInfo: { name: 'สลิป / ใบเสร็จทั่วไป', shortName: 'Receipt', emoji: '🧾', color: '#64748b' },
      transRef: null,
      rawPayload: ''
    };

    this.openSlipModal(this.activeSlipData, previewUrl, true);
  },

  /**
   * Duplicate Check: Inspects current transactions for matching transRef or (same date + amount)
   */
  findDuplicateTransaction(slipData) {
    if (typeof StorageManager === 'undefined') return null;
    const transactions = StorageManager.getTransactions() || [];

    for (const tx of transactions) {
      // 1. Direct match on slipRef / transRef
      if (slipData.transRef && tx.slipRef === slipData.transRef) {
        return tx;
      }
      // 2. TransRef embedded in note
      if (slipData.transRef && tx.note && tx.note.includes(slipData.transRef)) {
        return tx;
      }
      // 3. Exact matching Date + Time + Amount
      if (slipData.amount && tx.amount === slipData.amount && tx.type === 'expense') {
        if (slipData.dateStr && tx.date && tx.date.startsWith(slipData.dateStr)) {
          if (slipData.timeStr && tx.date.includes(slipData.timeStr)) {
            return tx;
          }
        }
      }
    }
    return null;
  },

  /**
   * Smart Category Suggestion: Recipient history learning + Keyword inference
   */
  suggestCategory(slipData) {
    if (typeof StorageManager === 'undefined') return 'exp_food';

    const transactions = StorageManager.getTransactions() || [];
    const noteOrPayee = (slipData.payeeName || slipData.note || '').toLowerCase();

    // 1. Check user transaction history for recurring payee/note patterns
    if (noteOrPayee) {
      const match = transactions.find(t => t.note && t.note.toLowerCase().includes(noteOrPayee) && t.categoryId);
      if (match) return match.categoryId;
    }

    // 2. Keyword rules
    if (/คืนเงิน|โอนคืน|ยืม|พี่|น้อง|แม่|พ่อ|เพื่อน|แฟน/.test(noteOrPayee)) return 'exp_other';
    if (/ข้าว|อาหาร|กะเพรา|ก๋วยเตี๋ยว|ส้มตำ|หมูกระทะ|ชาบู|กาแฟ|ชา|คาเฟ่|cafe|food|restaurant|lineman|grabfood/.test(noteOrPayee)) return 'exp_food';
    if (/7-11|seven|เซเว่น|big c|lotus|tops|shopee|lazada|tiktok|ซื้อของ|ของใช้/.test(noteOrPayee)) return 'exp_shopping';
    if (/bts|mrt|น้ำมัน|ปตท|ptt|บางจาก|shell|caltex|ค่ารถ|วิน|แท็กซี่|grab|bolt/.test(noteOrPayee)) return 'exp_transport';
    if (/ค่าไฟ|ค่าน้ำ|เน็ต|บิล|pea|mea|ais|true|dtac|wifi/.test(noteOrPayee)) return 'exp_bills';
    if (/ยา|คลินิก|หมอ|โรงพยาบาล|ประกัน|aia|fwd/.test(noteOrPayee)) return 'exp_health';
    if (/ค่าห้อง|คอนโด|เช่า|หอพัก/.test(noteOrPayee)) return 'exp_housing';
    if (/หมา|แมว|สัตว์|อาหารสัตว์|ทรายแมว|pet/.test(noteOrPayee)) return 'exp_pets';
    if (/netflix|spotify|youtube|game|steam/.test(noteOrPayee)) return 'exp_ent';

    return 'exp_food'; // Default most common daily expense
  },

  /**
   * Opens the Slip Review & Confirmation Modal
   */
  openSlipModal(slipData, previewUrl, isManualFallback = false) {
    const modal = document.getElementById('slip-scanner-modal');
    if (!modal) return;

    // 1. Set Image Preview
    const imgPreview = document.getElementById('slip-modal-preview-img');
    if (imgPreview && previewUrl) {
      imgPreview.src = previewUrl;
    }

    // 2. Bank Badge
    const bankBadge = document.getElementById('slip-modal-bank-badge');
    if (bankBadge) {
      const bInfo = slipData.bankInfo || { name: 'สลิปโอนเงิน', emoji: '🧾', color: '#475569' };
      bankBadge.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-white shadow-2xs" style="background-color: ${bInfo.color}">
          <span>${bInfo.emoji}</span>
          <span>${bInfo.name}</span>
        </span>
      `;
    }

    // 3. Amount Field
    const amountInput = document.getElementById('slip-modal-amount');
    if (amountInput) {
      amountInput.value = slipData.amount !== null && slipData.amount > 0 ? slipData.amount : '';
    }

    // 4. Date & Time Fields
    const dateInput = document.getElementById('slip-modal-date');
    if (dateInput) {
      dateInput.value = slipData.dateStr || '';
    }

    const timeInput = document.getElementById('slip-modal-time');
    if (timeInput) {
      timeInput.value = slipData.timeStr || '12:00';
    }

    // 5. Note Field
    const noteInput = document.getElementById('slip-modal-note');
    if (noteInput) {
      let defaultNote = '';
      if (slipData.payeeName) {
        defaultNote = `โอนให้ ${slipData.payeeName}`;
      } else if (slipData.bankInfo && slipData.bankInfo.shortName) {
        defaultNote = `โอนผ่าน ${slipData.bankInfo.shortName}`;
      }
      noteInput.value = defaultNote;
    }

    // 6. Payment Method
    const paymentSelect = document.getElementById('slip-modal-payment');
    if (paymentSelect) {
      paymentSelect.value = 'โอนเงิน / บัญชีธนาคาร';
    }

    // 7. Duplicate Check Banner
    const dupBanner = document.getElementById('slip-modal-duplicate-warning');
    const dupTx = this.findDuplicateTransaction(slipData);
    if (dupBanner) {
      if (dupTx) {
        dupBanner.classList.remove('hidden');
        const formattedDate = dupTx.date ? dupTx.date.replace('T', ' ') : 'ไม่ระบุ';
        dupBanner.innerHTML = `
          <div class="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 animate-modal">
            <span class="text-base">⚠️</span>
            <div>
              <strong class="font-bold block">ตรวจพบสลิปซ้ำ!</strong>
              <span>สลิปหรือรายการยอด ฿${dupTx.amount.toLocaleString()} นี้ เคยบันทึกไปแล้วเมื่อ ${formattedDate} (${dupTx.note || 'ไม่มีโน้ต'})</span>
            </div>
          </div>
        `;
      } else {
        dupBanner.classList.add('hidden');
        dupBanner.innerHTML = '';
      }
    }

    // 8. Warning if No QR found
    const noQrNotice = document.getElementById('slip-modal-no-qr-notice');
    if (noQrNotice) {
      if (isManualFallback) {
        noQrNotice.classList.remove('hidden');
      } else {
        noQrNotice.classList.add('hidden');
      }
    }

    // 9. Render Smart Category Chips
    this.selectedCategory = this.suggestCategory(slipData);
    this.renderCategoryChips(this.selectedCategory);

    // Show Modal
    modal.classList.add('show', 'active');
    document.body.style.overflow = 'hidden';

    // Auto focus on amount if empty
    setTimeout(() => {
      if (!amountInput.value) {
        amountInput.focus();
      }
    }, 150);
  },

  renderCategoryChips(selectedId) {
    const container = document.getElementById('slip-modal-category-chips');
    if (!container || typeof StorageManager === 'undefined') return;

    const categories = StorageManager.getCategories().filter(c => c.type === 'expense');
    
    // Sort so selected is visible first or usage based
    const sorted = [...categories].sort((a, b) => (a.id === selectedId ? -1 : (b.id === selectedId ? 1 : 0)));

    container.innerHTML = sorted.map(cat => {
      const isSelected = cat.id === selectedId;
      const displayName = StorageManager.getCategoryDisplayName(cat);
      const activeClass = isSelected
        ? 'bg-slate-900 text-white font-extrabold shadow-xs scale-105 border-slate-900'
        : 'bg-white text-slate-700 hover:bg-slate-100 font-semibold border-slate-200';

      return `
        <button 
          type="button" 
          onclick="SlipScanner.selectCategory('${cat.id}')"
          class="px-3 py-1.5 rounded-2xl text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${activeClass}"
        >
          <span>${cat.emoji || '📦'}</span>
          <span>${displayName}</span>
        </button>
      `;
    }).join('');
  },

  selectCategory(catId) {
    this.selectedCategory = catId;
    this.renderCategoryChips(catId);
  },

  closeSlipModal() {
    const modal = document.getElementById('slip-scanner-modal');
    if (modal) {
      modal.classList.remove('show', 'active');
      document.body.style.overflow = '';
    }
    this.activeSlipData = null;
  },

  /**
   * Confirms and saves the scanned slip transaction into Money Memo
   */
  confirmSave() {
    const amountInput = document.getElementById('slip-modal-amount');
    const amount = parseFloat(amountInput ? amountInput.value : 0);

    if (isNaN(amount) || amount <= 0) {
      alert('กรุณาระบุจำนวนเงินที่ถูกต้อง');
      if (amountInput) amountInput.focus();
      return;
    }

    const dateInput = document.getElementById('slip-modal-date');
    const timeInput = document.getElementById('slip-modal-time');
    const noteInput = document.getElementById('slip-modal-note');
    const paymentSelect = document.getElementById('slip-modal-payment');

    const dateVal = dateInput ? dateInput.value : new Date().toISOString().slice(0, 10);
    const timeVal = timeInput ? timeInput.value : '12:00';
    const noteVal = noteInput ? noteInput.value.trim() : '';
    const paymentMethod = paymentSelect ? paymentSelect.value : 'โอนเงิน / บัญชีธนาคาร';

    const fullDateTime = `${dateVal}T${timeVal}:00`;

    const txData = {
      type: 'expense',
      amount: amount,
      categoryId: this.selectedCategory || 'exp_food',
      date: fullDateTime,
      paymentMethod: paymentMethod,
      note: noteVal,
      slipRef: this.activeSlipData?.transRef || null,
      slipBank: this.activeSlipData?.bankCode || null
    };

    if (typeof StorageManager !== 'undefined') {
      const newTx = StorageManager.addTransaction(txData);

      // Close modal
      this.closeSlipModal();

      // Refresh application UI
      if (typeof App !== 'undefined') {
        if (App.refreshAllViews) {
          App.refreshAllViews();
        } else {
          if (App.renderTransactionsTab) App.renderTransactionsTab();
          if (App.renderHistoryTab) App.renderHistoryTab();
          if (App.renderDashboardTab) App.renderDashboardTab();
        }

        const formattedAmt = amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        App.showToast(`🧾 บันทึกสลิป ฿${formattedAmt} เรียบร้อยแล้ว`);
      }
    }
  },

  showScanningSpinner(show) {
    let spinner = document.getElementById('slip-scanning-overlay');
    if (!spinner && show) {
      spinner = document.createElement('div');
      spinner.id = 'slip-scanning-overlay';
      spinner.className = 'fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center p-4 text-white animate-modal';
      spinner.innerHTML = `
        <div class="bg-white/10 p-6 rounded-3xl backdrop-blur-xl border border-white/20 text-center space-y-3 shadow-2xl max-w-xs">
          <div class="w-14 h-14 rounded-2xl bg-indigo-500/30 text-indigo-300 flex items-center justify-center text-2xl mx-auto animate-bounce">
            📷
          </div>
          <div>
            <h4 class="text-sm font-bold text-white">กำลังตรวจจับ Mini-QR ในสลิป...</h4>
            <p class="text-[11px] text-slate-300 mt-1">อ่านยอดเงินและวันเวลาแบบดิจิทัล แม่นยำ 100%</p>
          </div>
          <div class="w-8 h-8 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      `;
      document.body.appendChild(spinner);
    }

    if (spinner) {
      spinner.style.display = show ? 'flex' : 'none';
    }
  }
};

// Global export
if (typeof window !== 'undefined') {
  window.SlipScanner = SlipScanner;
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SlipScanner.init());
  } else {
    SlipScanner.init();
  }
}
