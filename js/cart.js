/**
 * Cart.js
 * Sepet yönetimi modülü - v4.0
 * İndirim, müşteri notu ve gelişmiş özellikler
 */

let cart = [];
let discountPercent = 0;
let discountAmount = 0;
let customerNote = '';

// Sepete ürün ekleme
function addToCart(productId) {
    const product = getProductById(productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            productId: product.id,
            productName: product.name,
            productIcon: product.icon,
            unitPrice: product.salePrice,
            costPrice: product.costPrice,
            quantity: 1
        });
    }
    
    renderCart();
    showToast(`${product.name} sepete eklendi`, 'success');
}

// Sepetten ürün çıkarma (index-based - boy/badem sütü desteği)
function removeCartItem(index) {
    if (index >= 0 && index < cart.length) {
        cart.splice(index, 1);
        renderCart();
    }
}

// Sepetten ürün çıkarma (eski - geri uyumluluk)
function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    renderCart();
}

// Ürün miktarını artırma (index-based)
function increaseCartItem(index) {
    if (index >= 0 && index < cart.length) {
        cart[index].quantity++;
        renderCart();
    }
}

// Ürün miktarını artırma (eski - geri uyumluluk)
function increaseQuantity(productId) {
    const item = cart.find(item => item.productId === productId);
    if (item) {
        item.quantity++;
        renderCart();
    }
}

// Ürün miktarını azaltma (index-based)
function decreaseCartItem(index) {
    if (index >= 0 && index < cart.length) {
        if (cart[index].quantity > 1) {
            cart[index].quantity--;
        } else {
            cart.splice(index, 1);
        }
        renderCart();
    }
}

// Ürün miktarını azaltma (eski - geri uyumluluk)
function decreaseQuantity(productId) {
    const item = cart.find(item => item.productId === productId);
    if (item) {
        if (item.quantity > 1) {
            item.quantity--;
            renderCart();
        } else {
            removeFromCart(productId);
        }
    }
}

// Sepeti temizle
function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('Sepeti temizlemek istediğinize emin misiniz?')) {
        cart = [];
        discountPercent = 0;
        discountAmount = 0;
        customerNote = '';
        
        // Not alanını temizle
        const noteInput = document.getElementById('cart-note-input');
        if (noteInput) noteInput.value = '';
        
        // İndirim alanını temizle
        const discountInput = document.getElementById('discount-input');
        if (discountInput) discountInput.value = '0';
        
        renderCart();
        showToast('Sepet temizlendi', 'warning');
    }
}

// Sepet alt toplamını hesapla
function calculateSubtotal() {
    return cart.reduce((total, item) => {
        return total + (item.unitPrice * item.quantity);
    }, 0);
}

// Sepet toplamını hesapla (indirimli)
function calculateCartTotal() {
    const subtotal = calculateSubtotal();
    return subtotal - discountAmount;
}

// Sepet maliyetini hesapla
function calculateCartCost() {
    return cart.reduce((total, item) => {
        return total + (item.costPrice * item.quantity);
    }, 0);
}

// Toplam ürün sayısı
function getCartItemCount() {
    return cart.reduce((total, item) => total + item.quantity, 0);
}

// ===== İNDİRİM YÖNETİMİ =====

// İndirim bölümünü aç/kapat
function toggleDiscount() {
    const section = document.getElementById('cart-discount-section');
    if (section) {
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
    }
}

// İndirim uygula
function applyDiscount() {
    const input = document.getElementById('discount-input');
    if (!input) return;
    
    const percent = parseFloat(input.value) || 0;
    
    if (percent < 0 || percent > 100) {
        showToast('İndirim 0-100 arasında olmalıdır', 'warning');
        return;
    }
    
    discountPercent = percent;
    const subtotal = calculateSubtotal();
    discountAmount = subtotal * (percent / 100);
    
    // İndirim bilgisini göster
    const discountInfo = document.getElementById('discount-info');
    const discountAmountEl = document.getElementById('discount-amount');
    const discountRow = document.getElementById('discount-row');
    
    if (discountPercent > 0) {
        if (discountInfo) discountInfo.style.display = 'flex';
        if (discountAmountEl) discountAmountEl.textContent = discountAmount.toFixed(2) + ' ₺';
        if (discountRow) discountRow.style.display = 'flex';
        showToast(`%${percent} indirim uygulandı`, 'success');
    } else {
        if (discountInfo) discountInfo.style.display = 'none';
        if (discountRow) discountRow.style.display = 'none';
    }
    
    renderCart();
}

// İndirimi kaldır
function removeDiscount() {
    discountPercent = 0;
    discountAmount = 0;
    
    const input = document.getElementById('discount-input');
    if (input) input.value = '0';
    
    const discountInfo = document.getElementById('discount-info');
    if (discountInfo) discountInfo.style.display = 'none';
    
    const discountRow = document.getElementById('discount-row');
    if (discountRow) discountRow.style.display = 'none';
    
    renderCart();
    showToast('İndirim kaldırıldı', 'info');
}

// ===== MÜŞTERİ NOTU =====

// Not bölümünü aç/kapat
function toggleCartNote() {
    const section = document.getElementById('cart-note-section');
    if (section) {
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
        if (section.style.display === 'block') {
            const input = document.getElementById('cart-note-input');
            if (input) input.focus();
        }
    }
}

// ===== SEPET GÖRÜNTÜLEME =====

// Sepeti görüntüle
function renderCart() {
    const cartContainer = document.getElementById('cart-items');
    const cartSummary = document.getElementById('cart-summary');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    // Boş sepet kontrolü
    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">🛒</div>
                <p>Sepet boş</p>
                <p style="font-size: 0.85rem;">Ürünlere tıklayarak ekleyin</p>
            </div>
        `;
        cartSummary.style.display = 'none';
        checkoutBtn.disabled = true;
        
        // İndirim ve not bölümlerini gizle
        const discountSection = document.getElementById('cart-discount-section');
        const noteSection = document.getElementById('cart-note-section');
        if (discountSection) discountSection.style.display = 'none';
        if (noteSection) noteSection.style.display = 'none';
        
        return;
    }
    
    // Sepet dolu
    checkoutBtn.disabled = false;
    cartSummary.style.display = 'block';
    
    // Sepet öğelerini oluştur
    cartContainer.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">
                    ${item.productIcon} ${item.productName}
                </div>
                ${item.sizeName ? `<div class="cart-item-size">${item.sizeName}</div>` : ''}
                <div class="cart-item-price">
                    ${item.unitPrice.toFixed(2)} ₺ × ${item.quantity} = ${(item.unitPrice * item.quantity).toFixed(2)} ₺
                </div>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="decreaseCartItem(${index})">−</button>
                <span class="qty-display">${item.quantity}</span>
                <button class="qty-btn" onclick="increaseCartItem(${index})">+</button>
                <button class="cart-item-remove" onclick="removeCartItem(${index})">✕</button>
            </div>
        </div>
    `).join('');
    
    // Özeti güncelle
    const subtotal = calculateSubtotal();
    const total = calculateCartTotal();
    const count = getCartItemCount();
    
    document.getElementById('cart-count').textContent = count;
    document.getElementById('cart-subtotal').textContent = subtotal.toFixed(2) + ' ₺';
    document.getElementById('cart-total').textContent = total.toFixed(2) + ' ₺';
    
    // İndirim varsa güncelle
    if (discountPercent > 0) {
        discountAmount = subtotal * (discountPercent / 100);
        const discountEl = document.getElementById('cart-discount');
        if (discountEl) {
            discountEl.textContent = '-' + discountAmount.toFixed(2) + ' ₺';
        }
        const discountRow = document.getElementById('discount-row');
        if (discountRow) discountRow.style.display = 'flex';
    }
}

// ===== SİPARİŞ TAMAMLAMA =====

// Ödeme modalını aç (yeni checkout)
function openPaymentModal() {
    if (cart.length === 0) {
        showToast('Sepet boş!', 'error');
        return;
    }
    
    const modal = document.getElementById('payment-modal');
    if (!modal) return;
    
    // Sepet özetini doldur
    renderPaymentCartSummary();
    
    // Ödeme durumunu sıfırla
    if (typeof Payment !== 'undefined') {
        Payment.clearPayments();
        Payment.updatePaymentSummary();
    }
    
    // Modal'ı aç
    modal.classList.add('active');
}

// Ödeme modalını kapat
function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    // Ödemeleri temizle
    if (typeof Payment !== 'undefined') {
        Payment.clearPayments();
    }
}

// Sepet özetini ödeme modalında göster
function renderPaymentCartSummary() {
    const container = document.getElementById('payment-cart-items');
    if (!container) return;
    
    const subtotal = calculateSubtotal();
    const total = calculateCartTotal();
    
    // Sepet ürünleri
    container.innerHTML = cart.map(item => `
        <div class="payment-cart-item">
            <div class="payment-cart-item-info">
                <div class="payment-cart-item-name">
                    ${item.productIcon} ${item.productName}
                </div>
                ${item.sizeName ? `<div class="cart-item-size">${item.sizeName}</div>` : ''}
                <div class="payment-cart-item-qty">
                    ${item.quantity} x ${item.unitPrice.toFixed(2)} ₺
                </div>
            </div>
            <div class="payment-cart-item-total">
                ${(item.quantity * item.unitPrice).toFixed(2)} ₺
            </div>
        </div>
    `).join('');
    
    // Toplamlar
    document.getElementById('payment-subtotal').textContent = subtotal.toFixed(2) + ' ₺';
    document.getElementById('payment-total').textContent = total.toFixed(2) + ' ₺';
    
    // İndirim
    if (discountAmount > 0) {
        document.getElementById('payment-discount-row').style.display = 'flex';
        document.getElementById('payment-discount').textContent = '-' + discountAmount.toFixed(2) + ' ₺';
    }
}

// Hızlı ödeme (tek tıklama ile)
function quickPayment(methodId) {
    const total = calculateCartTotal();
    
    if (typeof Payment !== 'undefined') {
        Payment.quickPay(methodId, total);
        
        // Nakit ise para üstü panelini göster
        if (methodId === 'cash') {
            document.getElementById('cash-change-section').style.display = 'block';
        } else {
            document.getElementById('cash-change-section').style.display = 'none';
        }
        
        // Ödemeyi tamamla
        completePaymentAndCheckout();
    }
}

// Çoklu ödeme bölme panelini aç/kapat
function toggleSplitPayment() {
    const panel = document.getElementById('split-payment-panel');
    const icon = document.getElementById('split-toggle-icon');
    
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        icon.classList.add('open');
    } else {
        panel.style.display = 'none';
        icon.classList.remove('open');
    }
}

// Bahşiş panelini aç/kapat
function toggleTipSection() {
    const panel = document.getElementById('tip-panel');
    const icon = document.getElementById('tip-toggle-icon');
    
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        icon.classList.add('open');
    } else {
        panel.style.display = 'none';
        icon.classList.remove('open');
    }
}

// Çoklu ödeme ekle
function addSplitPayment() {
    const methodSelect = document.getElementById('split-method-select');
    const amountInput = document.getElementById('split-amount-input');
    
    const method = methodSelect.value;
    const amount = parseFloat(amountInput.value);
    
    if (!amount || amount <= 0) {
        showToast('Lütfen geçerli bir tutar girin', 'warning');
        return;
    }
    
    if (typeof Payment !== 'undefined') {
        Payment.addPayment(method, amount);
        
        // Input'u temizle
        amountInput.value = '';
        
        // Tamamlandı mı kontrol et
        if (Payment.isPaymentComplete(calculateCartTotal())) {
            document.getElementById('payment-complete-btn').disabled = false;
        }
    }
}

// Bahşiş yüzdesi uygula
function setTipPercent(percent) {
    const total = calculateCartTotal();
    const tipAmount = total * (percent / 100);
    
    if (typeof Payment !== 'undefined') {
        Payment.setTipAmount(tipAmount);
        document.getElementById('tip-value').textContent = tipAmount.toFixed(2) + ' ₺';
        document.getElementById('tip-display').style.display = 'block';
    }
}

// Özel bahşiş tutarı
function setTipAmount(amount) {
    const tip = parseFloat(amount) || 0;
    
    if (typeof Payment !== 'undefined') {
        Payment.setTipAmount(tip);
        document.getElementById('tip-value').textContent = tip.toFixed(2) + ' ₺';
        document.getElementById('tip-display').style.display = tip > 0 ? 'block' : 'none';
    }
}

// Para üstü hesapla
function calculateChange() {
    const received = parseFloat(document.getElementById('cash-received').value) || 0;
    const total = calculateCartTotal();
    const change = received - total;
    
    document.getElementById('change-value').textContent = change.toFixed(2) + ' ₺';
    
    if (change >= 0) {
        document.getElementById('change-display').style.background = 'var(--color-success)';
    } else {
        document.getElementById('change-display').style.background = 'var(--color-warning)';
        document.getElementById('change-value').textContent = 'Eksik: ' + Math.abs(change).toFixed(2) + ' ₺';
    }
}

// Ödemeyi tamamla ve checkout yap
async function completePaymentAndCheckout() {
    const total = calculateCartTotal();
    
    // Ödeme kontrolü
    if (typeof Payment !== 'undefined' && Payment.payments.length > 0) {
        if (!Payment.isPaymentComplete(total)) {
            showToast('Ödeme tutarı yetersiz! Lütfen eksik tutarı ekleyin.', 'warning');
            return;
        }
    }
    
    // Siparişi tamamla
    await processOrder();
}

// Sipariş işle
async function processOrder() {
    if (cart.length === 0) {
        showToast('Sepet boş!', 'error');
        return;
    }
    
    // Müşteri notunu al
    const noteInput = document.getElementById('cart-note-input');
    customerNote = noteInput ? noteInput.value.trim() : '';
    
    const totalAmount = calculateCartTotal();
    const totalCost = calculateCartCost();
    const profit = totalAmount - totalCost;
    
    // Ödeme bilgileri
    let paymentData = {
        method: 'NAKIT',
        methodName: 'Nakit'
    };
    
    if (typeof Payment !== 'undefined' && Payment.payments.length > 0) {
        const completed = await Payment.completePayment({});
        paymentData = {
            method: completed.payments[0]?.method || 'NAKIT',
            methodName: completed.payments[0]?.methodName || 'Nakit',
            payments: completed.payments,
            tipAmount: completed.tipAmount || 0,
            totalPaid: completed.totalPaid || totalAmount,
            paymentBreakdown: completed.paymentBreakdown || []
        };
    }
    
    const order = {
        id: generateUUID(),
        items: [...cart],
        subtotal: calculateSubtotal(),
        discountPercent: discountPercent,
        discountAmount: discountAmount,
        totalAmount: totalAmount,
        totalCost: totalCost,
        profit: profit,
        itemCount: getCartItemCount(),
        customerNote: customerNote,
        createdBy: getCurrentUser() ? getCurrentUser().username : 'Bilinmeyen',
        createdAt: new Date().toISOString(),
        // Ödeme bilgileri
        paymentMethod: paymentData.methodName,
        paymentData: paymentData
    };
    
    // Satışı kaydet - Hybrid Mode (Supabase + localStorage)
    try {
        // Yeni addSale fonksiyonunu kullan (sales.js'ten)
        if (typeof addSale === 'function') {
            await addSale(order);
        } else {
            // Fallback: eski Storage yöntemini kullan
            Storage.addSale(order);
        }
        
        // Modal'ı kapat
        closePaymentModal();
        
        // 🆕 ÖKC (Yazar Kasa) Entegrasyonu - Fiş yazdır
        if (typeof OKC !== 'undefined' && OKC.enabled && OKC.autoPrint) {
            try {
                // Ödeme yöntemini fişe ekle
                order.payment = paymentData.method === 'cash' ? 'NAKIT' : 'KREDI_KARTI';
                
                const printResult = await OKC.printReceipt(order);
                
                if (printResult.success && !printResult.skipped) {
                    // Fiş başarıyla yazdırıldı
                    showToast(`✓ Sipariş tamamlandı! Fiş No: ${printResult.receiptNo || '---'}`, 'success');
                } else if (printResult.skipped) {
                    // ÖKC devre dışı
                    showToast(`Sipariş tamamlandı! ${totalAmount.toFixed(2)} ₺`, 'success');
                } else {
                    // Fiş yazdırma başarısız
                    showToast('⚠️ Sipariş kaydedildi ama fiş yazdırılamadı!', 'warning');
                    
                    // Manuel retry seçeneği sun
                    setTimeout(() => {
                        if (confirm('Fiş yazdırma başarısız oldu. Tekrar denemek ister misiniz?')) {
                            OKC.printReceipt(order).then(result => {
                                if (result.success) {
                                    showToast(`Fiş yazdırıldı! Fiş No: ${result.receiptNo}`, 'success');
                                } else {
                                    showToast('Fiş tekrar yazdırılamadı: ' + (result.error || 'Bilinmeyen hata'), 'error');
                                }
                            });
                        }
                    }, 1000);
                }
            } catch (error) {
                console.error('ÖKC Fiş yazdırma hatası:', error);
                showToast('⚠️ Sipariş kaydedildi ama fiş yazdırılamadı: ' + error.message, 'warning');
            }
        } else {
            // ÖKC kapalı veya otomatik yazdırma kapalı
            showToast(`Sipariş tamamlandı! ${totalAmount.toFixed(2)} ₺`, 'success');
        }
        
        // Sepeti temizle
        cart = [];
        discountPercent = 0;
        discountAmount = 0;
        customerNote = '';
        
        // Not alanını temizle
        if (noteInput) noteInput.value = '';
        
        // İndirim alanını temizle
        const discountInput = document.getElementById('discount-input');
        if (discountInput) discountInput.value = '0';
        
        renderCart();
        
        // Dashboard ve raporları güncelle
        if (typeof refreshDashboard === 'function') {
            refreshDashboard();
        }
        
        // Raporları güncelle (sadece rapor sayfası aktifse)
        if (typeof loadReport === 'function' && document.getElementById('reports-page').classList.contains('active')) {
            loadReport();
        }
    } catch (error) {
        console.error('Sipariş kaydetme hatası:', error);
        showToast('Sipariş kaydedilirken hata oluştu', 'error');
    }
}

// Eski checkout fonksiyonu (geriye uyumluluk için)
async function checkout() {
    // Ödeme modalını aç
    openPaymentModal();
}

// ===== YARDIMCI FONKSİYONLAR =====

// Sepet verilerini dışa aktar
function getCartData() {
    return {
        items: cart,
        subtotal: calculateSubtotal(),
        discount: discountAmount,
        total: calculateCartTotal(),
        cost: calculateCartCost(),
        count: getCartItemCount(),
        note: customerNote
    };
}

// Sepeti dışarıdan veriyle güncelle (test için)
function setCartData(newCart) {
    cart = newCart;
    renderCart();
}

// Hızlı sepet temizleme (onaysız - klavye kısayolu için)
function quickClearCart() {
    if (cart.length === 0) return;
    
    cart = [];
    discountPercent = 0;
    discountAmount = 0;
    customerNote = '';
    
    const noteInput = document.getElementById('cart-note-input');
    if (noteInput) noteInput.value = '';
    
    const discountInput = document.getElementById('discount-input');
    if (discountInput) discountInput.value = '0';
    
    renderCart();
    showToast('Sepet temizlendi', 'warning');
}

