/**
 * Products.js
 * Ürün yönetimi modülü - v3.0
 * Arama ve filtreleme özellikleri dahil
 */

// Kategoriler
const CATEGORIES = {
    all: { id: 'all', name: 'Tümü', icon: '🎯' },
    sicak: { id: 'sicak', name: 'Sıcak İçecekler', icon: '☕' },
    soguk: { id: 'soguk', name: 'Soğuk İçecekler', icon: '🧊' },
    tatli: { id: 'tatli', name: 'Tatlılar', icon: '🧁' },
    diger: { id: 'diger', name: 'Diğer', icon: '📦' }
};

let allProducts = [];
let selectedCategory = 'all';
let searchQuery = '';

// UUID oluşturucu
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Ürünleri yükleme
function loadProducts() {
    allProducts = Storage.getProducts();
    
    // İlk yüklemede örnek veriler ekle
    if (Storage.isFirstLoad() && allProducts.length === 0) {
        allProducts = [
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
        
        Storage.saveProducts(allProducts);
        Storage.markFirstLoadComplete();
    }
    
    return allProducts;
}

// Kategori tablarını oluştur
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

// Kategori filtreleme
function filterByCategory(categoryId) {
    selectedCategory = categoryId;
    renderCategoryTabs();
    renderProductsGrid();
}

// ===== ÜRÜN ARAMA =====

// Ürünleri ara/filtrele
function filterProducts() {
    const searchInput = document.getElementById('product-search-input');
    if (!searchInput) return;
    
    searchQuery = searchInput.value.toLowerCase().trim();
    renderProductsGrid();
}

// Arama input'una odaklan
function focusSearchInput() {
    const searchInput = document.getElementById('product-search-input');
    if (searchInput) {
        searchInput.focus();
        searchInput.select();
    }
}

// Arama input'unu temizle
function clearSearch() {
    const searchInput = document.getElementById('product-search-input');
    if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        renderProductsGrid();
    }
}

// Ürün gridini oluştur (POS ekranı için)
function renderProductsGrid() {
    const gridContainer = document.getElementById('products-grid');
    if (!gridContainer) return;
    
    // Ürünleri filtrele
    let filteredProducts = allProducts.filter(p => p.active);
    
    // Kategori filtresi
    if (selectedCategory !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
    }
    
    // Arama filtresi
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
        <div class="product-card" onclick="addToCart('${product.id}')">
            <span class="product-icon">${product.icon}</span>
            <div class="product-name">${highlightSearchTerm(product.name)}</div>
            <div class="product-price">${product.salePrice.toFixed(2)} ₺</div>
        </div>
    `).join('');
}

// Arama terimini vurgula
function highlightSearchTerm(text) {
    if (!searchQuery) return text;
    
    const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// Regex'de özel karakterleri escape et
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ===== ÜRÜN LİSTESİ =====

// Ürün listesini oluştur (Ürün yönetimi sayfası için)
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

// Ürün modal açma
function openProductModal(productId = null) {
    const modal = document.getElementById('product-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('product-form');
    
    // Formu temizle
    form.reset();
    document.getElementById('product-id').value = '';
    
    // Icon seçicisini sıfırla
    const iconOptions = document.querySelectorAll('.icon-option');
    iconOptions.forEach(opt => opt.classList.remove('selected'));
    if (iconOptions[0]) iconOptions[0].classList.add('selected');
    document.getElementById('product-icon').value = '☕';
    
    if (productId) {
        // Düzenleme modu
        const product = allProducts.find(p => p.id === productId);
        if (product) {
            modalTitle.textContent = 'Ürün Düzenle';
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-cost').value = product.costPrice;
            document.getElementById('product-price').value = product.salePrice;
            document.getElementById('product-icon').value = product.icon;
            
            // Icon seçimini ayarla
            iconOptions.forEach(opt => {
                if (opt.getAttribute('data-icon') === product.icon) {
                    opt.classList.add('selected');
                } else {
                    opt.classList.remove('selected');
                }
            });
        }
    } else {
        // Yeni ürün modu
        modalTitle.textContent = 'Yeni Ürün Ekle';
    }
    
    modal.classList.add('active');
}

// Ürün modal kapatma
function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.remove('active');
}

// Ürün kaydetme
function saveProduct(event) {
    event.preventDefault();
    
    const productId = document.getElementById('product-id').value;
    const productData = {
        name: document.getElementById('product-name').value.trim(),
        category: document.getElementById('product-category').value,
        costPrice: parseFloat(document.getElementById('product-cost').value),
        salePrice: parseFloat(document.getElementById('product-price').value),
        icon: document.getElementById('product-icon').value,
        active: true
    };
    
    // Fiyat kontrolü
    if (productData.salePrice <= productData.costPrice) {
        showToast('Satış fiyatı, maliyet fiyatından yüksek olmalıdır!', 'warning');
        return;
    }
    
    if (productId) {
        // Güncelleme
        const index = allProducts.findIndex(p => p.id === productId);
        if (index !== -1) {
            allProducts[index] = {
                ...allProducts[index],
                ...productData
            };
            showToast('Ürün güncellendi', 'success');
        }
    } else {
        // Yeni ürün
        const newProduct = {
            id: generateUUID(),
            ...productData,
            createdAt: new Date().toISOString()
        };
        allProducts.push(newProduct);
        showToast('Ürün eklendi', 'success');
    }
    
    Storage.saveProducts(allProducts);
    renderProductsList();
    renderProductsGrid();
    closeProductModal();
}

// Ürün düzenleme
function editProduct(productId) {
    openProductModal(productId);
}

// Ürün silme
function deleteProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    if (confirm(`"${product.name}" ürününü silmek istediğinize emin misiniz?`)) {
        allProducts = allProducts.filter(p => p.id !== productId);
        Storage.saveProducts(allProducts);
        renderProductsList();
        renderProductsGrid();
        showToast('Ürün silindi', 'success');
    }
}

// ID'ye göre ürün getir
function getProductById(productId) {
    return allProducts.find(p => p.id === productId);
}

// İsme göre ürün ara (tam eşleşme veya benzer)
function findProductsByName(name) {
    const searchName = name.toLowerCase().trim();
    return allProducts.filter(p => 
        p.active && p.name.toLowerCase().includes(searchName)
    );
}

// ===== INIT =====

// Icon seçici için event listener
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
    
    // Arama input'u için Enter tuşu
    const searchInput = document.getElementById('product-search-input');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                clearSearch();
            }
        });
    }
});

// CSS ekle - highlight için
const highlightStyle = document.createElement('style');
highlightStyle.textContent = `
    mark {
        background: rgba(255, 193, 7, 0.5);
        padding: 0 2px;
        border-radius: 2px;
    }
`;
document.head.appendChild(highlightStyle);
