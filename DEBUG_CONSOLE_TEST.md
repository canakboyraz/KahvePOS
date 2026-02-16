# 🔍 Supabase Senkronizasyon Debug Talimatları

## Adım 1: Tarayıcı Konsolunu Aç
1. https://kahvepos.netlify.app/ sitesini aç
2. `F12` tuşuna bas (veya sağ tık → İncele → Console)
3. Aşağıdaki kodu konsolda yapıştır ve Enter'a bas:

```javascript
// Test: Supabase'e direkt INSERT
(async () => {
  console.log('🧪 TEST BAŞLIYOR...');
  console.log('1️⃣ window.supabase var mı?:', typeof window.supabase);
  
  const testSale = {
    id: 'test-' + Date.now(),
    total_amount: 100.50,
    total_cost: 50.25,
    profit: 50.25,
    discount_amount: 0,
    payment_method: [{method: 'cash', amount: 100.50}],
    payment_method_text: 'Nakit',
    items: [{productId: 'test', productName: 'Test Ürün', quantity: 1, unitPrice: 100.50}],
    created_by: 'test_user',
    created_at: new Date().toISOString()
  };
  
  console.log('2️⃣ Test verisi:', testSale);
  
  try {
    const { data, error } = await window.supabase
      .from('sales')
      .insert(testSale)
      .select();
    
    if (error) {
      console.error('❌ HATA:', error);
      console.error('Hata detayı:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ BAŞARILI! Supabase\'e kaydedildi:', data);
    }
  } catch (e) {
    console.error('❌ EXCEPTION:', e);
  }
})();
```

## Beklenen Sonuçlar:

### ✅ BAŞARILI olursa:
```
🧪 TEST BAŞLIYOR...
1️⃣ window.supabase var mı?: object
2️⃣ Test verisi: {id: "test-123...", total_amount: 100.5, ...}
✅ BAŞARILI! Supabase'e kaydedildi: [{...}]
```

### ❌ HATA alırsa:
Hatayı buraya kopyala. Örnek hatalar:

**1. Column hatası:**
```
column "payment_method" is of type jsonb but expression is of type text
```
↪️ **Çözüm**: `006_fix_sales_schema.sql` migration'ı çalıştırılmamış

**2. RLS Policy hatası:**
```
new row violates row-level security policy
```
↪️ **Çözüm**: `005_open_rls_policies.sql` migration'ı çalıştırılmamış

**3. Foreign key hatası:**
```
violates foreign key constraint "sales_user_id_fkey"
```
↪️ **Çözüm**: `user_id` kolonu nullable değil, `005_open_rls_policies.sql` çalıştırılmalı

## Adım 2: Supabase SQL Editor'da Kontrol

1. https://supabase.com/dashboard → Projen → SQL Editor
2. Şu sorguyu çalıştır:

```sql
-- Test kaydı var mı kontrol et
SELECT * FROM sales 
WHERE id LIKE 'test-%' 
ORDER BY created_at DESC 
LIMIT 5;
```

3. Eğer kayıt yoksa, RLS politikalarını kontrol et:

```sql
-- RLS politikalarını göster
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'sales';
```

Beklenen sonuç: "Herkes satış ekleyebilir" policy'si FOR INSERT WITH CHECK (true) olmalı

## Adım 3: Migration Durumunu Kontrol

```sql
-- payment_method_text kolonu var mı?
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sales' 
AND column_name IN ('payment_method', 'payment_method_text', 'created_by', 'user_id', 'profit', 'discount_amount');
```

Beklenen kolonlar:
- `payment_method` (jsonb)
- `payment_method_text` (text) ← 003 veya 006'dan gelecek
- `created_by` (text) ← 003'ten gelecek
- `user_id` (uuid, nullable) ← 005'te nullable yapıldı
- `profit` (numeric) ← 003'ten gelecek
- `discount_amount` (numeric) ← 003'ten gelecek

## Eksik Migration Varsa:

Sırayla çalıştır:
1. `supabase/migrations/003_schema_code_alignment.sql`
2. `supabase/migrations/005_open_rls_policies.sql`
3. `supabase/migrations/006_fix_sales_schema.sql`
