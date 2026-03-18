/**
 * Products.js - Hybrid Supabase Mode v4.0
 * Ürün yönetimi modülü - Online (Supabase) + Offline (localStorage) desteği
 */

// Kategoriler
const CATEGORIES = {
    all: { id: 'all', name: 'Tümü', icon: '🎯' },
    sicak: { id: 'sicak', name: 'Sıcak İçecekler', icon: '☕' },
    soguk: { id: 'soguk', name: 'Soğuk İçecekler', icon: '🧊' },
    tatli: { id: 'tatli', name: 'Tatlılar', icon: '🧁' },
    diger: { id: 'diger', name: 'Diğer', icon: '📦' }
};

// Durum değişkenleri
let allProducts = [];
let selectedCategory = 'all';
let searchQuery = '';
let productsIsOnline = navigator.onLine;
let productsOfflineQueue = [];
let localProductCache = [];

// ===== SUPABASE BAĞLANTI KONTROLÜ =====

function productsCheckSupabaseConnection() {
    return typeof window.supabase !== 'undefined' &&
           window.supabase &&
           productsIsOnline;
}

function toSupabaseProductPayload(product) {
    return {
        id: product.id,
        name: product.name,
        category: product.category,
        cost_price: product.costPrice ?? product.cost_price ?? 0,
        sale_price: product.salePrice ?? product.sale_price ?? 0,
        icon: product.icon || 'â˜•',
        active: product.active ?? true
    };
}

// ===== OFFLINE QUEUE =====

function loadOfflineQueue() {
    try {
        productsOfflineQueue = JSON.parse(localStorage.getItem('products_offline_queue') || '[]');
    } catch (e) {
        productsOfflineQueue = [];
    }
}

function saveOfflineQueue() {
    try {
        localStorage.setItem('products_offline_queue', JSON.stringify(productsOfflineQueue));
    } catch (e) {
        console.error('Offline queue kaydedilemedi:', e);
    }
}

function addToOfflineQueue(operation, data) {
    productsOfflineQueue.push({
        id: Date.now().toString(),
        operation,
        data,
        timestamp: new Date().toISOString()
    });
    saveOfflineQueue();
}

async function syncOfflineChanges() {
    if (!productsCheckSupabaseConnection() || productsOfflineQueue.length === 0) {
        return;
    }

    const initialQueueLength = productsOfflineQueue.length;
    const failedItems = [];

    for (const item of productsOfflineQueue) {
        try {
            let result = null;
            switch (item.operation) {
                case 'add':
                    result = await window.supabase
                        .from('products')
                        .insert(toSupabaseProductPayload(item.data));
                    break;
                case 'update':
                    result = await window.supabase
                        .from('products')
                        .update(toSupabaseProductPayload(item.data))
                        .eq('id', item.data.id);
                    break;
                case 'delete':
                    result = await window.supabase
                        .from('products')
                        .delete()
                        .eq('id', item.data.id);
                    break;
            }
            if (result?.error) {
                throw result.error;
            }
        } catch (error) {
            console.error('Sync hatası:', error);
            failedItems.push(item);
        }
    }

    productsOfflineQueue = failedItems;
    saveOfflineQueue();
    
    if (failedItems.length === 0 && initialQueueLength > 0) {
        showToast('Offline değişiklikler senkronize edildi', 'success');
    }
}

// ===== LOCAL CACHE =====

function updateLocalProductCache(supabaseProduct) {
    const formattedProduct = {
        id: supabaseProduct.id,
        name: supabaseProduct.name,
        category: supabaseProduct.category,
        costPrice: supabaseProduct.cost_price,
        salePrice: supabaseProduct.sale_price,
        icon: supabaseProduct.icon || '☕',
        active: supabaseProduct.active !== false,
        createdAt: supabaseProduct.created_at,
        updatedAt: supabaseProduct.updated_at
    };

    const existingIndex = localProductCache.findIndex(p => p.id === formattedProduct.id);
    if (existingIndex !== -1) {
        localProductCache[existingIndex] = formattedProduct;
    } else {
        localProductCache.push(formattedProduct);
    }

    Storage.saveProducts(localProductCache);
}

// ===== UUID OLUŞTURUCU =====

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ===== ÜRÜNLERİ YÜKLEME =====

async function loadProducts() {
    loadOfflineQueue();

    // Önce localStorage'dan yükle
    localProductCache = Storage.getProducts() || [];

    if (productsCheckSupabaseConnection()) {
        try {
            const { data, error } = await window.supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
                allProducts = data.map(p => ({
                    id: p.id,
                    name: p.name,
                    category: p.category,
                    // cost_price yoksa cost kullan, yoksa 0
                    costPrice: p.cost_price ?? p.cost ?? 0,
                    // sale_price yoksa price kullan, yoksa 0
                    salePrice: p.sale_price ?? p.price ?? 0,
                    icon: p.icon || '☕',
                    // active yoksa is_active kullan, yoksa true
                    active: p.active ?? p.is_active ?? true,
                    createdAt: p.created_at,
                    updatedAt: p.updated_at
                }));

                // Local cache'i güncelle
                localProductCache = [...allProducts];
                Storage.saveProducts(localProductCache);

                // İlk yükleme kontrolü - örnek veriler
                if (Storage.isFirstLoad() && allProducts.length === 0) {
                    await seedInitialProducts();
                }
            } else if (allProducts.length === 0) {
                // Supabase'de ürün yok, localStorage'dan varsa oradan al
                allProducts = localProductCache;
            }
        } catch (error) {
            console.error('Supabase ürün yükleme hatası:', error);
            // Local cache'i kullan
            allProducts = localProductCache;
        }
    } else {
        // Offline mod - localStorage'u kullan
        allProducts = localProductCache;
        
        // İlk yükleme ve boşsa örnek veriler ekle
        if (Storage.isFirstLoad() && allProducts.length === 0) {
            allProducts = getSampleProducts();
            Storage.saveProducts(allProducts);
            Storage.markFirstLoadComplete();
        }
    }

    return allProducts;
}

async function seedInitialProducts() {
    const sampleProducts = getSampleProducts();
    
    if (productsCheckSupabaseConnection()) {
        try {
            const { data, error } = await window.supabase
                .from('products')
                .insert(sampleProducts.map(p => ({
                    id: p.id,
                    name: p.name,
                    category: p.category,
                    cost_price: p.costPrice,
                    sale_price: p.salePrice,
                    icon: p.icon,
                    active: p.active
                })));

            if (!error) {
                Storage.markFirstLoadComplete();
            }
        } catch (error) {
            console.error('Örnek ürünler eklenemedi:', error);
        }
    }

    Storage.saveProducts(sampleProducts);
    allProducts = sampleProducts;
}

function getSampleProducts() {
    return [
        {
            id: generateUUID(),
            name: 'Türk Kahvesi',
            category: 'sicak',
            costPrice: 15,
            salePrice: 35,
            icon: '☕',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: generateUUID(),
            name: 'Filtre Kahve',
            category: 'sicak',
            costPrice: 18,
            salePrice: 45,
            icon: '☕',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: generateUUID(),
            name: 'Latte',
            category: 'sicak',
            costPrice: 20,
            salePrice: 55,
            icon: '☕',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: generateUUID(),
            name: 'Cappuccino',
            category: 'sicak',
            costPrice: 20,
            salePrice: 55,
            icon: '☕',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: generateUUID(),
            name: 'Americano',
            category: 'sicak',
            costPrice: 15,
            salePrice: 40,
            icon: '☕',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: generateUUID(),
            name: 'Espresso',
            category: 'sicak',
            costPrice: 12,
            salePrice: 30,
            icon: '☕',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: generateUUID(),
            name: 'Ice Latte',
            category: 'soguk',
            costPrice: 22,
            salePrice: 60,
            icon: '🧊',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: generateUUID(),
            name: 'Soğuk Kahve',
            category: 'soguk',
            costPrice: 20,
            salePrice: 50,
            icon: '🥤',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: generateUUID(),
            name: 'Mocha',
            category: 'sicak',
            costPrice: 22,
            salePrice: 60,
            icon: '☕',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: generateUUID(),
            name: 'Caramel Macchiato',
            category: 'sicak',
            costPrice: 25,
            salePrice: 65,
            icon: '☕',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: generateUUID(),
            name: 'Brownie',
            category: 'tatli',
            costPrice: 20,
            salePrice: 40,
            icon: '🧁',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: generateUUID(),
            name: 'Cheesecake',
            category: 'tatli',
            costPrice: 25,
            salePrice: 50,
            icon: '🍰',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: generateUUID(),
            name: 'Kurabiye',
            category: 'tatli',
            costPrice: 8,
            salePrice: 20,
            icon: '🍪',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: generateUUID(),
            name: 'Tiramisu',
            category: 'tatli',
            costPrice: 22,
            salePrice: 55,
            icon: '🍰',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: generateUUID(),
            name: 'Croissant',
            category: 'diger',
            costPrice: 12,
            salePrice: 30,
            icon: '🥐',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: generateUUID(),
            name: 'Sandviç',
            category: 'diger',
            costPrice: 25,
            salePrice: 50,
            icon: '🥪',
            active: true,
            createdAt: new Date().toISOString()
        }
    ];
}

// ===== KATEGORİ TABLARI =====

function renderCategoryTabs() {
    const tabsContainer = document.getElementById('category-tabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = '';
    
    Object.values(CATEGORIES).forEach(category => {
        const btn = document.createElement('button');
        btn.className = `category-tab ${category.id === selectedCategory ? 'active' : ''}`;
        btn.setAttribute('data-category', category.id);
        btn.innerHTML = `${category.icon} ${category.name}`;
        btn.onclick = () => filterByCategory(category.id);
        tabsContainer.appendChild(btn);
    });
}

function filterByCategory(categoryId) {
    selectedCategory = categoryId;
    renderCategoryTabs();
    renderProductsGrid();
}

// ===== ÜRÜN ARAMA =====

function filterProducts() {
    const searchInput = document.getElementById('product-search-input');
    if (!searchInput) return;
    
    searchQuery = searchInput.value.toLowerCase().trim();
    renderProductsGrid();
}

function focusSearchInput() {
    const searchInput = document.getElementById('product-search-input');
    if (searchInput) {
        searchInput.focus();
        searchInput.select();
    }
}

function clearSearch() {
    const searchInput = document.getElementById('product-search-input');
    if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        renderProductsGrid();
    }
}

// ===== ÜRÜN GRIDİ (POS EKRANI) =====

function renderProductsGrid() {
    const gridContainer = document.getElementById('products-grid');
    if (!gridContainer) return;
    
    let filteredProducts = allProducts.filter(p => p.active);
    
    if (selectedCategory !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
    }
    
    if (searchQuery) {
        filteredProducts = filteredProducts.filter(p => {
            const nameMatch = p.name.toLowerCase().includes(searchQuery);
            const category = CATEGORIES[p.category];
            const categoryName = category ? category.name.toLowerCase() : '';
            const categoryMatch = categoryName.includes(searchQuery);
            return nameMatch || categoryMatch;
        });
    }
    
    if (filteredProducts.length === 0) {
        gridContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">📦</div>
                <h3>${searchQuery ? 'Ürün bulunamadı' : 'Bu kategoride ürün yok'}</h3>
                <p>${searchQuery ? 'Başka bir arama terimi deneyin' : 'Başka bir kategori seçin'}</p>
                ${searchQuery ? '<button class="btn-secondary" onclick="clearSearch()" style="margin-top: 1rem;">Aramayı Temizle</button>' : ''}
            </div>
        `;
        return;
    }
    
    gridContainer.innerHTML = filteredProducts.map(product => `
        <div class="product-card" onclick="handleProductClick(event, '${product.id}', this)">
            <span class="product-icon">${product.icon}</span>
            <div class="product-name">${highlightSearchTerm(product.name)}</div>
            <div class="product-price">${product.salePrice.toFixed(2)} ₺</div>
        </div>
    `).join('');
}

/**
 * Ürün kartına tıklama - Boy seçenekleri popover'ını aç
 */
function handleProductClick(event, productId, cardElement) {
    event.stopPropagation();
    openSizePopover(productId, cardElement);
}

function highlightSearchTerm(text) {
    if (!searchQuery) return text;
    
    const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ===== ÜRÜN LİSTESİ (YÖNETİM SAYFASI) =====

function renderProductsList() {
    const listContainer = document.getElementById('products-list');
    const emptyState = document.getElementById('empty-products');
    
    if (!listContainer) return;
    
    if (allProducts.length === 0) {
        listContainer.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    listContainer.innerHTML = allProducts.map(product => {
        const category = CATEGORIES[product.category];
        const profit = product.salePrice - product.costPrice;
        
        return `
            <div class="product-item">
                <div class="product-item-info">
                    <span class="product-item-icon">${product.icon}</span>
                    <div class="product-item-details">
                        <h3>${product.name}</h3>
                        <div class="category-badge">${category.icon} ${category.name}</div>
                        <div class="price-info">
                            <span>
                                <span class="price-label">Maliyet:</span>
                                <span class="price-cost">${product.costPrice.toFixed(2)} ₺</span>
                            </span>
                            <span>
                                <span class="price-label">Satış:</span>
                                <span class="price-sale">${product.salePrice.toFixed(2)} ₺</span>
                            </span>
                            <span>
                                <span class="price-label">Kar:</span>
                                <span class="price-profit">${profit.toFixed(2)} ₺</span>
                            </span>
                        </div>
                    </div>
                </div>
                <div class="product-item-actions">
                    <button class="btn-edit" onclick="editProduct('${product.id}')">✏️ Düzenle</button>
                    <button class="btn-delete" onclick="deleteProduct('${product.id}')">🗑️ Sil</button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== ÜRÜN MODAL =====

function openProductModal(productId = null) {
    const modal = document.getElementById('product-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('product-form');
    
    form.reset();
    document.getElementById('product-id').value = '';
    
    const iconOptions = document.querySelectorAll('.icon-option');
    iconOptions.forEach(opt => opt.classList.remove('selected'));
    if (iconOptions[0]) iconOptions[0].classList.add('selected');
    document.getElementById('product-icon').value = '☕';
    
    if (productId) {
        const product = allProducts.find(p => p.id === productId);
        if (product) {
            modalTitle.textContent = 'Ürün Düzenle';
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-cost').value = product.costPrice;
            document.getElementById('product-price').value = product.salePrice;
            document.getElementById('product-icon').value = product.icon;
            
            // Boy fiyat farklarını yükle
            const sizePrices = product.sizePrices || DEFAULT_SIZE_OPTIONS;
            document.getElementById('size-small-price').value = sizePrices.small?.priceModifier || 0;
            document.getElementById('size-regular-price').value = sizePrices.regular?.priceModifier || 5;
            document.getElementById('size-large-price').value = sizePrices.large?.priceModifier || 10;
            document.getElementById('size-almond-price').value = sizePrices.almond?.priceModifier || 3;
            
            iconOptions.forEach(opt => {
                if (opt.getAttribute('data-icon') === product.icon) {
                    opt.classList.add('selected');
                } else {
                    opt.classList.remove('selected');
                }
            });
        }
    } else {
        modalTitle.textContent = 'Yeni Ürün Ekle';
    }
    
    modal.classList.add('active');
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.remove('active');
}

// ===== ÜRÜN KAYDETME (HYBRID) =====

async function saveProduct(event) {
    event.preventDefault();
    
    const productId = document.getElementById('product-id').value;
    const productData = {
        name: document.getElementById('product-name').value.trim(),
        category: document.getElementById('product-category').value,
        costPrice: parseFloat(document.getElementById('product-cost').value),
        salePrice: parseFloat(document.getElementById('product-price').value),
        icon: document.getElementById('product-icon').value,
        active: true,
        sizePrices: {
            small: {
                name: 'Küçük',
                priceModifier: parseFloat(document.getElementById('size-small-price').value) || 0
            },
            regular: {
                name: 'Büyük Boy',
                priceModifier: parseFloat(document.getElementById('size-regular-price').value) || 5
            },
            large: {
                name: 'Ekstra Büyük',
                priceModifier: parseFloat(document.getElementById('size-large-price').value) || 10
            },
            almond: {
                name: 'Badem Sütü',
                priceModifier: parseFloat(document.getElementById('size-almond-price').value) || 3
            }
        }
    };
    
    if (productData.salePrice <= productData.costPrice) {
        showToast('Satış fiyatı, maliyet fiyatından yüksek olmalıdır!', 'warning');
        return;
    }
    
    if (productId) {
        // Güncelleme
        const updatedProduct = {
            ...productData,
            id: productId,
            updatedAt: new Date().toISOString()
        };

        // Local storage güncelle
        const index = allProducts.findIndex(p => p.id === productId);
        if (index !== -1) {
            allProducts[index] = { ...allProducts[index], ...updatedProduct };
        }

        if (productsCheckSupabaseConnection()) {
            try {
                const { error } = await window.supabase
                    .from('products')
                    .update({
                        name: updatedProduct.name,
                        category: updatedProduct.category,
                        cost_price: updatedProduct.costPrice,
                        sale_price: updatedProduct.salePrice,
                        icon: updatedProduct.icon,
                        active: updatedProduct.active
                    })
                    .eq('id', productId);

                if (error) throw error;
                showToast('Ürün güncellendi (Senkronize)', 'success');
            } catch (error) {
                console.error('Supabase güncelleme hatası:', error);
                addToOfflineQueue('update', { ...updatedProduct, id: productId });
                showToast('Ürün güncellendi (Offline kuyrukta)', 'warning');
            }
        } else {
            addToOfflineQueue('update', { ...updatedProduct, id: productId });
            showToast('Ürün güncellendi (Offline)', 'info');
        }
    } else {
        // Yeni ürün
        const newProduct = {
            id: generateUUID(),
            ...productData,
            createdAt: new Date().toISOString()
        };

        allProducts.push(newProduct);

        if (productsCheckSupabaseConnection()) {
            try {
                const { error } = await window.supabase
                    .from('products')
                    .insert({
                        id: newProduct.id,
                        name: newProduct.name,
                        category: newProduct.category,
                        cost_price: newProduct.costPrice,
                        sale_price: newProduct.salePrice,
                        icon: newProduct.icon,
                        active: newProduct.active
                    });

                if (error) throw error;
                showToast('Ürün eklendi (Senkronize)', 'success');
            } catch (error) {
                console.error('Supabase ekleme hatası:', error);
                addToOfflineQueue('add', { ...newProduct });
                showToast('Ürün eklendi (Offline kuyrukta)', 'warning');
            }
        } else {
            addToOfflineQueue('add', { ...newProduct });
            showToast('Ürün eklendi (Offline)', 'info');
        }
    }
    
    // Local storage güncelle
    Storage.saveProducts(allProducts);
    renderProductsList();
    renderProductsGrid();
    closeProductModal();
}

function editProduct(productId) {
    openProductModal(productId);
}

// ===== ÜRÜN SİLME (HYBRID) =====

async function deleteProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    if (!confirm(`"${product.name}" ürününü silmek istediğinize emin misiniz?`)) {
        return;
    }

    // Local storage'dan sil
    allProducts = allProducts.filter(p => p.id !== productId);

    if (productsCheckSupabaseConnection()) {
        try {
            const { error } = await window.supabase
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;
            showToast('Ürün silindi (Senkronize)', 'success');
        } catch (error) {
            console.error('Supabase silme hatası:', error);
            addToOfflineQueue('delete', { id: productId });
            showToast('Ürün silindi (Offline kuyrukta)', 'warning');
        }
    } else {
        addToOfflineQueue('delete', { id: productId });
        showToast('Ürün silindi (Offline)', 'info');
    }
    
    Storage.saveProducts(allProducts);
    renderProductsList();
    renderProductsGrid();
}

// ===== YARDIMCI FONKSİYONLAR =====

function getProductById(productId) {
    return allProducts.find(p => p.id === productId);
}

function findProductsByName(name) {
    const searchName = name.toLowerCase().trim();
    return allProducts.filter(p => 
        p.active && p.name.toLowerCase().includes(searchName)
    );
}

// ===== ONLINE/OFFLINE EVENT LISTENERS =====

window.addEventListener('online', () => {
    productsIsOnline = true;
    syncOfflineChanges();
});

window.addEventListener('offline', () => {
    productsIsOnline = false;
    showToast('Offline moda geçildi', 'info');
});

// ===== INIT =====

document.addEventListener('DOMContentLoaded', () => {
    const iconOptions = document.querySelectorAll('.icon-option');
    iconOptions.forEach(option => {
        option.addEventListener('click', () => {
            iconOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            const iconInput = document.getElementById('product-icon');
            if (iconInput) iconInput.value = option.getAttribute('data-icon');
        });
    });
    
    const searchInput = document.getElementById('product-search-input');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                clearSearch();
            }
        });
    }

    // Offline queue'yu yükle
    loadOfflineQueue();
    
    // Eğer offline queue varsa ve online isek, sync et
    if (navigator.onLine && productsOfflineQueue.length > 0) {
        syncOfflineChanges();
    }
});

// ===== ÜRÜN BOY SEÇENEKLERİ POPOVER =====

// Varsayılan boy seçenekleri - ürün özelinde tanımlanmadığında kullanılır
const DEFAULT_SIZE_OPTIONS = {
    'small': { name: 'Küçük', priceModifier: 0 },
    'regular': { name: 'Büyük Boy', priceModifier: 5 },
    'large': { name: 'Ekstra Büyük', priceModifier: 10 },
    'almond': { name: 'Badem Sütü', priceModifier: 3 }
};

// Seçili ürün ve boy bilgisi
let selectedProduct = null;
let selectedSize = 'regular';
let selectedProductCard = null; // Tıklanan ürün kartı

/**
 * Boy seçenekleri popover'ını aç (tıklanan kartın yanında)
 */
function openSizePopover(productId, cardElement) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    selectedProduct = product;
    selectedProductCard = cardElement;
    selectedSize = 'regular'; // Varsayılan
    
    const popover = document.getElementById('size-popover');
    if (!popover) {
        console.error('Boy seçenekleri popover bulunamadı!');
        return;
    }
    
    // Ürün bilgisi güncelle
    document.getElementById('size-popover-product-name').textContent = product.name;
    document.getElementById('size-popover-product-icon').textContent = product.icon;
    document.getElementById('size-popover-base-price').textContent = `${product.salePrice.toFixed(2)} ₺`;
    
    // Ürünün boy fiyat farklarını al (varsayılan değerleri kullan)
    const sizePrices = product.sizePrices || DEFAULT_SIZE_OPTIONS;
    
    // Boy seçeneklerini render et
    const sizeOptionsContainer = document.getElementById('size-options-container');
    sizeOptionsContainer.innerHTML = Object.entries(sizePrices).map(([key, option]) => {
        const finalPrice = product.salePrice + (option.priceModifier || 0);
        return `
            <div class="size-option" data-size="${key}" onclick="selectSize('${key}')">
                <div class="size-info">
                    <div class="size-name">${option.name}</div>
                    <div class="size-price">+${option.priceModifier > 0 ? option.priceModifier : ''} ₺</div>
                </div>
                <div class="size-final-price">${finalPrice.toFixed(2)} ₺</div>
            </div>
        `;
    }).join('');
    
    // Varsayılan seçimi işaretle
    document.querySelector(`[data-size="regular"]`)?.classList.add('selected');
    
    // Popover'ı konumlandır ve aç
    const rect = cardElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Popover boyutunu hesapla (henüz render edilmediği için yaklaşık)
    const popoverWidth = 320;
    const popoverHeight = 400;
    
    // Konum hesapla (sağ alt köşe)
    let top = rect.bottom + 8;
    let left = rect.left;
    
    // Sağa taşma kontrolü
    if (left + popoverWidth > viewportWidth - 16) {
        left = viewportWidth - popoverWidth - 16;
    }
    
    // Aşağı taşma kontrolü
    if (top + popoverHeight > viewportHeight - 16) {
        top = rect.top - popoverHeight - 8;
    }
    
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
    popover.style.display = 'block';
    
    // Dışarı tıklandığında kapat
    setTimeout(() => {
        document.addEventListener('click', closeSizePopoverOutside);
    }, 100);
}

/**
 * Boy seç
 */
function selectSize(size) {
    selectedSize = size;
    
    // Seçimi güncelle
    document.querySelectorAll('.size-option').forEach(el => el.classList.remove('selected'));
    document.querySelector(`[data-size="${size}"]`)?.classList.add('selected');
}

/**
 * Seçili boy ile sepete ekle
 */
function addToCartWithSize() {
    if (!selectedProduct) return;
    
    // Ürünün boy fiyat farklarını al (varsayılan değerleri kullan)
    const sizePrices = selectedProduct.sizePrices || DEFAULT_SIZE_OPTIONS;
    const option = sizePrices[selectedSize];
    const finalPrice = selectedProduct.salePrice + (option.priceModifier || 0);
    const sizeName = option.name;
    
    // Sepete ekle (boy bilgisi ile)
    const existingItem = cart.find(item =>
        item.productId === selectedProduct.id && item.size === selectedSize
    );
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            productIcon: selectedProduct.icon,
            unitPrice: finalPrice,
            costPrice: selectedProduct.costPrice,
            quantity: 1,
            size: selectedSize,
            sizeName: sizeName
        });
    }
    
    closeSizePopover();
    renderCart();
    showToast(`${selectedProduct.name} (${sizeName}) sepete eklendi`, 'success');
}

/**
 * Boy seçenekleri popover'ını kapat
 */
function closeSizePopover() {
    const popover = document.getElementById('size-popover');
    if (!popover) return;
    
    popover.style.display = 'none';
    selectedProduct = null;
    selectedProductCard = null;
    selectedSize = 'regular';
    
    document.removeEventListener('click', closeSizePopoverOutside);
}

/**
 * Popover dışına tıklandığında kapat
 */
function closeSizePopoverOutside(event) {
    const popover = document.getElementById('size-popover');
    if (!popover || popover.style.display === 'none') return;
    
    // Popover içinde tıklama ise kapatma
    if (popover.contains(event.target)) return;
    
    // Tıklanan ürün kartı dışında bir yere tıklandı
    if (selectedProductCard && !selectedProductCard.contains(event.target)) {
        closeSizePopover();
    }
}

// Offline queue'yu yükle
    
    // Eğer offline queue varsa ve online isek, sync et
    if (navigator.onLine && productsOfflineQueue.length > 0) {
        syncOfflineChanges();
    }
const highlightStyle = document.createElement('style');
highlightStyle.textContent = `
    mark {
        background: rgba(255, 193, 7, 0.5);
        padding: 0 2px;
        border-radius: 2px;
    }
`;
document.head.appendChild(highlightStyle);

// ===== GLOBAL EXPORT =====

// Boy seçenekleri popover fonksiyonları
window.handleProductClick = handleProductClick;
window.openSizePopover = openSizePopover;
window.closeSizePopover = closeSizePopover;
window.selectSize = selectSize;
window.addToCartWithSize = addToCartWithSize;
window.SIZE_OPTIONS = SIZE_OPTIONS;

