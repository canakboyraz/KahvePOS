# Firebase Kurulum Rehberi - KahvePOS

## 1. Firebase Projesi Oluşturma

1. [Firebase Console](https://console.firebase.google.com/) adresine gidin
2. "Add project" (Proje Ekle) butonuna tıklayın
3. Proje adı: **KahvePOS**
4. Google Analytics'i istediğiniz gibi aktif/pasif yapın
5. "Create project" butonuna tıklayın

## 2. Firebase Web App Ekleme

1. Proje oluşturulduktan sonra "Web" (</>) ikonuna tıklayın
2. App nickname: **KahvePOS Web**
3. "Also set up Firebase Hosting" seçeneğini işaretleyin
4. "Register app" butonuna tıklayın
5. Firebase SDK config bilgilerini kopyalayın (sonraki adımda kullanacağız)

## 3. Authentication Ayarları

1. Sol menüden **Authentication** > **Get Started** tıklayın
2. **Sign-in method** sekmesine gidin
3. **Email/Password** seçeneğini aktif edin
4. "Enable" ve "Save" butonlarına tıklayın

## 4. Firestore Database Oluşturma

1. Sol menüden **Firestore Database** > **Create database** tıklayın
2. **Start in production mode** seçin (güvenlik kurallarını sonra ayarlayacağız)
3. Lokasyon: **europe-west** (Avrupa sunucusu)
4. "Enable" butonuna tıklayın

## 5. Firestore Security Rules (Güvenlik Kuralları)

Firestore Database > **Rules** sekmesine gidin ve aşağıdaki kuralları yapıştırın:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Kullanıcılar - Sadece kendi profili
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Ürünler - Tüm authenticated kullanıcılar okuyabilir
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Satışlar - Kendi satışları veya admin
    match /sales/{saleId} {
      allow read: if request.auth != null && 
                     (resource.data.userId == request.auth.uid || 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // Kategoriler - Herkes okuyabilir, admin yazabilir
    match /categories/{categoryId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

"Publish" butonuna tıklayın.

## 6. Firebase Config Bilgilerini Alma

1. Project Overview > ⚙️ (Settings) > **Project settings**
2. **General** sekmesinde aşağı kaydırın
3. "Your apps" bölümünde Web app'inizi bulun
4. "Config" kısmındaki bilgileri kopyalayın:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "kahvepos.firebaseapp.com",
  projectId: "kahvepos",
  storageBucket: "kahvepos.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

Bu bilgileri `firebase/config.js` dosyasına yapıştırın.

## 7. İlk Admin Kullanıcısı Oluşturma

Firebase Console'da:
1. **Authentication** > **Users** sekmesine gidin
2. "Add user" butonuna tıklayın
3. Email: admin@kahvepos.com (veya istediğiniz)
4. Password: admin123 (güçlü bir şifre seçin)
5. "Add user" butonuna tıklayın
6. Oluşturulan kullanıcının **UID**'sini kopyalayın

Firestore Database'de:
1. **Firestore Database** sayfasına gidin
2. "Start collection" butonuna tıklayın
3. Collection ID: **users**
4. Document ID: (az önce kopyaladığınız UID'yi yapıştırın)
5. Fields:
   - **username**: "admin" (string)
   - **role**: "admin" (string)
   - **permissions**: {products: true, reports: true, users: true} (map)
   - **createdAt**: (şu anki timestamp)
6. "Save" butonuna tıklayın

## 8. Örnek Verileri İçe Aktarma (Opsiyonel)

Mevcut localStorage verilerinizi Firebase'e aktarmak için:

1. KahvePOS'u tarayıcıda açın
2. Console'u açın (F12)
3. Aşağıdaki kodu çalıştırın:

```javascript
// Mevcut verileri Firebase'e aktar
firebase.auth().signInWithEmailAndPassword('admin@kahvepos.com', 'admin123')
  .then(() => {
    // Ürünleri aktar
    const products = JSON.parse(localStorage.getItem('kahvepos_products') || '[]');
    products.forEach(product => {
      firebase.firestore().collection('products').add(product);
    });
    
    // Satışları aktar
    const sales = JSON.parse(localStorage.getItem('kahvepos_sales') || '[]');
    sales.forEach(sale => {
      firebase.firestore().collection('sales').add(sale);
    });
    
    console.log('Veriler başarıyla aktarıldı!');
  });
```

## 9. Firestore Indexes (Performans için)

Aşağıdaki composite index'leri oluşturun:

1. **Firestore Database** > **Indexes** sekmesi
2. "Create index" butonuna tıklayın

**Sales Index:**
- Collection: sales
- Fields: 
  - userId (Ascending)
  - createdAt (Descending)
- Query scope: Collection

**Sales Date Index:**
- Collection: sales
- Fields:
  - saleDate (Ascending)
  - createdAt (Descending)
- Query scope: Collection

## 10. Firebase Hosting (Opsiyonel)

Projenizi Firebase'de host etmek için:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

---

## Kurulum Tamamlandı! ✅

Firebase config bilgilerinizi hazırladıktan sonra KahvePOS uygulamasını Firebase ile entegre edeceğiz.

### Sonraki Adımlar:
1. Firebase config bilgilerinizi paylaşın
2. Kod entegrasyonunu yapacağım
3. Uygulamayı test edeceğiz
4. GitHub ve Netlify'a deploy edeceğiz
