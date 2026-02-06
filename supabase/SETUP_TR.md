# Supabase Kurulum Rehberi - KahvePOS

## Adım 1: SQL Script'i Çalıştırın

1. **Supabase Dashboard**'a gidin:
   ```
   https://supabase.com/dashboard/project/rnibcfiwsleobsdlfqfg
   ```

2. Sol menüden **SQL Editor** tıklayın

3. **"New query"** butonuna tıklayın

4. `supabase/migrations/001_initial_schema.sql` dosyasının içeriğini kopyalayıp SQL Editor'a yapıştırın

5. **"Run"** veya **"Run"** ▶️ butonuna tıklayın

Bu işlem tüm tabloları, indeksleri ve güvenlik kurallarını oluşturacaktır.

## Adım 2: İlk Admin Kullanıcısını Oluşturun

### Authentication'da Kullanıcı Oluştur:

1. Sol menüden **Authentication** > **Users** tıklayın
2. **"Add user"** butonuna tıklayın
3. Formu doldurun:
   - **Email:** `admin@kahvepos.com`
   - **Password:** (güçlü bir şifre, örn: `Admin123!`)
   - **Auto Confirm User:** işaretleyin
4. **"Create user"** butonuna tıklayın
5. Oluşan kullanıcının **User ID**'sini kopyalayın (UUID formatında)

### Profil Kaydı Oluşturun:

1. Sol menüden **Table Editor** tıklayın
2. **profiles** tablosuna tıklayın
3. **"Insert row"** (yeni satır ekle) butonuna tıklayın
4. Alanları doldurun:
   - **id:** (az önce kopyaladığınız User ID'yi yapıştırın)
   - **username:** `admin`
   - **role:** `admin`
   - **permissions:** `{"products": true, "reports": true, "users": true}` (JSON formatında)
5. **"Save"** tıklayın

## Adım 3: Email Template Ayarla (Opsiyonel)

Email doğrulaması için:

1. **Authentication** > **Email Templates** tıklayın
2. **"Confirm signup"** şablonunu açın
3. Email içeriğini Türkçe'ye çevirebilir veya varsayılan bırakabilirsiniz

## Adım 4: Database API URL'yi Alın

Supabase ayarları zaten yapılandırıldı:
- **URL:** `https://rnibcfiwsleobsdlfqfg.supabase.co`
- **Anon Key:** Config dosyasına eklenmiş ✅

## Adım 5: Test Edin

1. Uygulamayı çalıştırın:
   ```bash
   python -m http.server 8080
   ```

2. Tarayıcıda açın:
   ```
   http://localhost:8080
   ```

3. Authentication'da oluşturduğunuz email/şifre ile giriş yapın

## Tablo Yapısı

Kurulum sonrası bu tablolar oluşacak:

| Tablo | Açıklama |
|-------|----------|
| **profiles** | Kullanıcı profilleri |
| **products** | Ürün kataloğu |
| **sales** | Satış kayıtları |
| **cash_transactions** | Kasa hareketleri |
| **customers** | Müşteri kartları (CRM) |
| **notifications** | Bildirimler |

## Görünümler (Views)

| Görünüm | Açıklama |
|---------|----------|
| **daily_sales_summary** | Günlük satış özeti |
| **user_performance** | Kullanıcı performansı |
| **product_performance** | Ürün performansı |

## Güvenlik Kuralları (RLS)

Row Level Security aktif:
- Kullanıcılar sadece kendi verilerini görebilir
- Admin tüm verilere erişebilir
- Ürünler tüm authenticated kullanıcılar tarafından okunabilir

---

## Kurulum Tamamlandı! ✅

Artık KahvePOS bulut tabanlı çalışmaya hazır.

### İlk Kullanım:
1. Admin olarak giriş yapın
2. Products sayfasından ürün ekleyin
3. POS ekranından satış yapın
4. Tüm veriler Supabase'de saklanacak
