-- KahvePOS - RLS Politikalarını Gevşet (Tek Mağaza Modu)
-- Bu uygulama tek mağaza POS sistemi olduğu için
-- anon key ile erişimi açıyoruz
-- Supabase SQL Editor'da çalıştırın

-- ======================================
-- PRODUCTS - Herkese Okuma/Yazma İzni
-- ======================================

-- Mevcut kısıtlayıcı policy'leri kaldır
DROP POLICY IF EXISTS "Authenticated kullanıcılar ürünleri görebilir" ON products;
DROP POLICY IF EXISTS "Admin ürünleri yönetebilir" ON products;
DROP POLICY IF EXISTS "Tüm authenticated kullanıcılar ürünleri görebilir" ON products;

-- Yeni açık policy'ler
CREATE POLICY "Herkes ürünleri okuyabilir" ON products
    FOR SELECT USING (true);

CREATE POLICY "Herkes ürün ekleyebilir" ON products
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Herkes ürün güncelleyebilir" ON products
    FOR UPDATE USING (true);

CREATE POLICY "Herkes ürün silebilir" ON products
    FOR DELETE USING (true);

-- ======================================
-- SALES - Herkese Okuma/Yazma İzni
-- ======================================

DROP POLICY IF EXISTS "Kendi satışlarını görebilir" ON sales;
DROP POLICY IF EXISTS "Admin tüm satışları görebilir" ON sales;
DROP POLICY IF EXISTS "Satış ekleyebilir" ON sales;

CREATE POLICY "Herkes satışları okuyabilir" ON sales
    FOR SELECT USING (true);

CREATE POLICY "Herkes satış ekleyebilir" ON sales
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Herkes satış güncelleyebilir" ON sales
    FOR UPDATE USING (true);

CREATE POLICY "Herkes satış silebilir" ON sales
    FOR DELETE USING (true);

-- ======================================
-- PROFILES - Herkese Okuma/Yazma İzni
-- ======================================

DROP POLICY IF EXISTS "Kendi profilini görebilir" ON profiles;
DROP POLICY IF EXISTS "Admin tüm profilleri görebilir" ON profiles;
DROP POLICY IF EXISTS "Admin profil güncelleyebilir" ON profiles;
DROP POLICY IF EXISTS "Service role profil oluşturabilir" ON profiles;

CREATE POLICY "Herkes profilleri okuyabilir" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Herkes profil ekleyebilir" ON profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Herkes profil güncelleyebilir" ON profiles
    FOR UPDATE USING (true);

-- ======================================
-- CASH_TRANSACTIONS - Herkese Okuma/Yazma İzni
-- ======================================

DROP POLICY IF EXISTS "Kendi kasasını görebilir" ON cash_transactions;
DROP POLICY IF EXISTS "Admin tüm kasa hareketlerini görebilir" ON cash_transactions;
DROP POLICY IF EXISTS "Kasa hareketi ekleyebilir" ON cash_transactions;

CREATE POLICY "Herkes kasa hareketlerini okuyabilir" ON cash_transactions
    FOR SELECT USING (true);

CREATE POLICY "Herkes kasa hareketi ekleyebilir" ON cash_transactions
    FOR INSERT WITH CHECK (true);

-- ======================================
-- CUSTOMERS - Herkese Okuma/Yazma İzni
-- ======================================

DROP POLICY IF EXISTS "Authenticated kullanıcılar müşterileri görebilir" ON customers;
DROP POLICY IF EXISTS "Admin müşterileri yönetebilir" ON customers;

CREATE POLICY "Herkes müşterileri okuyabilir" ON customers
    FOR SELECT USING (true);

CREATE POLICY "Herkes müşteri ekleyebilir" ON customers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Herkes müşteri güncelleyebilir" ON customers
    FOR UPDATE USING (true);

CREATE POLICY "Herkes müşteri silebilir" ON customers
    FOR DELETE USING (true);

-- ======================================
-- NOTIFICATIONS - Herkese Okuma/Yazma İzni
-- ======================================

DROP POLICY IF EXISTS "Kendi bildirimlerini görebilir" ON notifications;
DROP POLICY IF EXISTS "Kendi bildirimlerini güncelleyebilir" ON notifications;

CREATE POLICY "Herkes bildirimleri okuyabilir" ON notifications
    FOR SELECT USING (true);

CREATE POLICY "Herkes bildirim ekleyebilir" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Herkes bildirim güncelleyebilir" ON notifications
    FOR UPDATE USING (true);

-- ======================================
-- sales tablosundaki user_id kısıtını gevşet
-- Uygulama Supabase Auth kullanmadan çalıştığı için
-- user_id zorunlu olmamalı
-- ======================================

ALTER TABLE sales ALTER COLUMN user_id DROP NOT NULL;

-- ======================================
-- TAMAMLANDI
-- ======================================
SELECT 'RLS politikaları açık erişim moduna alındı!' as sonuc;
