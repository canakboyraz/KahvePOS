-- KahvePOS v5.0 - Yeni Özellikler Migrasyonu
-- Müşteri Sadakat Sistemi, Rezervasyon Modülü, Etkinlik Takvimi

-- =====================================================
-- 1. MÜŞTERİ SADAKAT SİSTEMİ (LOYALTY PROGRAM)
-- =====================================================

-- Müşteriler tablosunu güncelle
ALTER TABLE customers 
    ADD COLUMN IF NOT EXISTS loyalty_card_number TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS loyalty_level TEXT DEFAULT 'bronze' CHECK (loyalty_level IN ('bronze', 'silver', 'gold', 'platinum')),
    ADD COLUMN IF NOT EXISTS total_purchases DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_visit_date DATE,
    ADD COLUMN IF NOT EXISTS favorite_products TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Sadakat işlem geçmişi tablosu
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'adjusted')),
    points INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sadakat ödülleri tablosu
CREATE TABLE IF NOT EXISTS loyalty_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('free_drink', 'discount', 'merchandise', 'upgrade')),
    discount_percent INTEGER,
    is_active BOOLEAN DEFAULT true,
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    icon TEXT DEFAULT '🎁',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Müşteri ödül kullanım geçmişi
CREATE TABLE IF NOT EXISTS customer_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id),
    reward_id UUID NOT NULL REFERENCES loyalty_rewards(id),
    sale_id UUID REFERENCES sales(id),
    points_used INTEGER NOT NULL,
    redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sadakat seviyesi avantajları
CREATE TABLE IF NOT EXISTS loyalty_tier_benefits (
    tier TEXT PRIMARY KEY CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    points_multiplier DECIMAL(3,2) DEFAULT 1.0,
    free_birthday_drink BOOLEAN DEFAULT false,
    priority_seating BOOLEAN DEFAULT false,
    exclusive_discount INTEGER DEFAULT 0,
    free_refills BOOLEAN DEFAULT false,
    special_events BOOLEAN DEFAULT false
);

-- Varsayılan tier avantajlarını ekle
INSERT INTO loyalty_tier_benefits (tier, points_multiplier, free_birthday_drink, priority_seating, exclusive_discount, free_refills, special_events)
VALUES 
    ('bronze', 1.0, false, false, 0, false, false),
    ('silver', 1.2, true, false, 5, false, false),
    ('gold', 1.5, true, true, 10, true, false),
    ('platinum', 2.0, true, true, 15, true, true)
ON CONFLICT (tier) DO NOTHING;

-- =====================================================
-- 2. REZERVASYON MODÜLÜ
-- =====================================================

-- Masa/Alan yönetimi tablosu
CREATE TABLE IF NOT EXISTS tables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_number TEXT NOT NULL UNIQUE,
    table_type TEXT DEFAULT 'standard' CHECK (table_type IN ('standard', 'window', 'outdoor', 'vip', 'bar')),
    capacity INTEGER NOT NULL DEFAULT 4,
    is_active BOOLEAN DEFAULT true,
    features TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rezervasyonlar tablosu
CREATE TABLE IF NOT EXISTS reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    table_id UUID REFERENCES tables(id),
    reservation_date DATE NOT NULL,
    time_slot TIME NOT NULL,
    guest_count INTEGER NOT NULL,
    duration_minutes INTEGER DEFAULT 120,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')),
    special_requests TEXT,
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    deposit_paid BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT
);

-- Rezervasyon notları
CREATE TABLE IF NOT EXISTS reservation_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. ETKİNLİK TAKVİMİ
-- =====================================================

-- Etkinlikler tablosu
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('live_music', 'quiz', 'workshop', 'tasting', 'social', 'special')),
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    entry_fee DECIMAL(10,2) DEFAULT 0,
    is_free BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'ongoing', 'completed', 'cancelled')),
    image_url TEXT,
    tags TEXT[] DEFAULT '{}',
    organizer_name TEXT,
    organizer_contact TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Etkinlik kayıtları
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    registration_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'cancelled', 'attended', 'no_show')),
    notes TEXT,
    UNIQUE(event_id, customer_id),
    UNIQUE(event_id, customer_phone)
);

-- Etkinlik anket/geri bildirimleri
CREATE TABLE IF NOT EXISTS event_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    would_recommend BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. İNDEKSLER
-- =====================================================

-- Sadakat sistemi indeksleri
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created ON loyalty_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_loyalty_card ON customers(loyalty_card_number);
CREATE INDEX IF NOT EXISTS idx_customers_loyalty_level ON customers(loyalty_level);
CREATE INDEX IF NOT EXISTS idx_customer_rewards_customer ON customer_rewards(customer_id);

-- Rezervasyon indeksleri
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_customer ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_table ON reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_reservations_datetime ON reservations(reservation_date, time_slot);

-- Etkinlik indeksleri
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_customer ON event_registrations(customer_id);

-- =====================================================
-- 5. RLS POLİTİKALARI
-- =====================================================

-- Sadakat işlemleri RLS
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Müşteri kendi işlemlerini görebilir" ON loyalty_transactions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM customers c JOIN profiles p ON c.id = p.id WHERE c.id = loyalty_transactions.customer_id AND p.id = auth.uid())
    );
CREATE POLICY "Admin tüm işlemleri görebilir" ON loyalty_transactions
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Sadakat ödülleri RLS
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Herkes ödülleri görebilir" ON loyalty_rewards
    FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admin ödülleri yönetebilir" ON loyalty_rewards
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Müşteri ödülleri RLS
ALTER TABLE customer_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Müşteri kendi ödüllerini görebilir" ON customer_rewards
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM customers c JOIN profiles p ON c.id = p.id WHERE c.id = customer_rewards.customer_id AND p.id = auth.uid())
    );
CREATE POLICY "Admin tüm ödülleri görebilir" ON customer_rewards
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Tier avantajları RLS
ALTER TABLE loyalty_tier_benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Herkes tier avantajlarını görebilir" ON loyalty_tier_benefits
    FOR SELECT TO authenticated USING (true);

-- Masa yönetimi RLS
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tüm çalışanlar masaları görebilir" ON tables
    FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admin masaları yönetebilir" ON tables
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Rezervasyonlar RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tüm çalışanlar rezervasyonları görebilir" ON reservations
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin rezervasyonları yönetebilir" ON reservations
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Rezervasyon notları RLS
ALTER TABLE reservation_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tüm çalışanlar notları görebilir" ON reservation_notes
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Kendi notlarını ekleyebilir" ON reservation_notes
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Etkinlikler RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Herkes aktif etkinlikleri görebilir" ON events
    FOR SELECT TO authenticated USING (status IN ('upcoming', 'ongoing', 'completed'));
CREATE POLICY "Admin etkinlikleri yönetebilir" ON events
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Etkinlik kayıtları RLS
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Müşteri kendi kayıtlarını görebilir" ON event_registrations
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM customers c JOIN profiles p ON c.id = p.id WHERE c.id = event_registrations.customer_id AND p.id = auth.uid())
    );
CREATE POLICY "Admin tüm kayıtları görebilir" ON event_registrations
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Etkinlik geri bildirimleri RLS
ALTER TABLE event_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Müşteri kendi geri bildirimlerini görebilir" ON event_feedback
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM customers c JOIN profiles p ON c.id = p.id WHERE c.id = event_feedback.customer_id AND p.id = auth.uid())
    );
CREATE POLICY "Admin tüm geri bildirimleri görebilir" ON event_feedback
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 6. TRIGGERLAR
-- =====================================================

-- Rezervasyon updated_at trigger
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Etkinlik updated_at trigger
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sadakat puanı hesaplama fonksiyonu
CREATE OR REPLACE FUNCTION calculate_loyalty_level(total_purchases DECIMAL)
RETURNS TEXT AS $$
BEGIN
    IF total_purchases >= 10000 THEN
        RETURN 'platinum';
    ELSIF total_purchases >= 5000 THEN
        RETURN 'gold';
    ELSIF total_purchases >= 2000 THEN
        RETURN 'silver';
    ELSE
        RETURN 'bronze';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. VIEWS (GÖRÜNÜMLER)
-- =====================================================

-- Sadakat müşteri özeti
CREATE OR REPLACE VIEW loyalty_customer_summary AS
SELECT 
    c.id,
    c.name,
    c.loyalty_card_number,
    c.loyalty_level,
    c.loyalty_points,
    c.total_purchases,
    c.visit_count,
    c.last_visit_date,
    lt.points_multiplier,
    lt.free_birthday_drink,
    lt.priority_seating,
    lt.exclusive_discount,
    lt.free_refills,
    COUNT(DISTINCT rt.id) as transaction_count
FROM customers c
LEFT JOIN loyalty_tier_benefits lt ON c.loyalty_level = lt.tier
LEFT JOIN loyalty_transactions rt ON c.id = rt.customer_id
GROUP BY c.id, c.name, c.loyalty_card_number, c.loyalty_level, c.loyalty_points, 
         c.total_purchases, c.visit_count, c.last_visit_date, lt.points_multiplier,
         lt.free_birthday_drink, lt.priority_seating, lt.exclusive_discount, lt.free_refills;

-- Günlük rezervasyon özeti
CREATE OR REPLACE VIEW daily_reservations_summary AS
SELECT 
    reservation_date,
    COUNT(*) as total_reservations,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
    SUM(guest_count) as total_guests,
    SUM(CASE WHEN status IN ('confirmed', 'seated', 'completed') THEN guest_count ELSE 0 END) as expected_guests
FROM reservations
WHERE reservation_date >= CURRENT_DATE
GROUP BY reservation_date
ORDER BY reservation_date;

-- Etkinlik katılım özeti
CREATE OR REPLACE VIEW event_participation_summary AS
SELECT 
    e.id,
    e.title,
    e.event_date,
    e.max_participants,
    e.current_participants,
    COUNT(er.id) as registered_count,
    e.entry_fee,
    SUM(CASE WHEN er.status = 'confirmed' THEN e.entry_fee ELSE 0 END) as potential_revenue,
    AVG(ef.rating) as avg_rating
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id AND er.status IN ('registered', 'confirmed')
LEFT JOIN event_feedback ef ON e.id = ef.event_id
GROUP BY e.id, e.title, e.event_date, e.max_participants, e.current_participants, e.entry_fee
ORDER BY e.event_date DESC;

-- =====================================================
-- 8. BAŞLANGIÇ VERİLERİ
-- =====================================================

-- Varsayılan masaları ekle
INSERT INTO tables (table_number, table_type, capacity, features) VALUES
    ('1', 'standard', 2, ARRAY['window']),
    ('2', 'standard', 4, '{}'),
    ('3', 'standard', 4, '{}'),
    ('4', 'window', 4, ARRAY['window', 'charging']),
    ('5', 'standard', 6, '{}'),
    ('6', 'outdoor', 4, ARRAY['outdoor', 'pet_friendly']),
    ('7', 'vip', 8, ARRAY['privacy', 'charging', 'tv']),
    ('8', 'bar', 4, ARRAY['bar_seating', 'quick_service'])
ON CONFLICT (table_number) DO NOTHING;

-- Varsayılan sadakat ödüllerini ekle
INSERT INTO loyalty_rewards (name, description, points_required, reward_type, discount_percent, icon) VALUES
    ('Ücretsiz Türk Kahvesi', 'Herhangi bir boy Türk Kahvesi ücretsiz', 100, 'free_drink', NULL, '☕'),
    ('%5 İndirim', 'Toplam sipariş üzerinden %5 indirim', 200, 'discount', 5, '🏷️'),
    ('Ücretsiz Tatlı', 'Menüden herhangi bir tatlı ücretsiz', 300, 'free_drink', NULL, '🧁'),
    ('%10 İndirim', 'Toplam sipariş üzerinden %10 indirim', 400, 'discount', 10, '🎉'),
    ('Ücretsiz Kahve + Tatlı', 'Bir kahve ve bir tatlı ücretsiz', 500, 'free_drink', NULL, '🎁'),
    ('Altın Üyelik Upgrade', 'Silver''dan Gold''a geçiş', 1000, 'upgrade', NULL, '⭐'),
    ('%15 İndirim', 'Toplam sipariş üzerinden %15 indirim (Gold+)', 1500, 'discount', 15, '👑'),
    ('Platinum VIP Deneyimi', 'Özel alan kullanımı + ücretsiz upgrade', 3000, 'upgrade', NULL, '💎')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 9. YARDIMCI FONKSİYONLAR
-- =====================================================

-- Müşteri sadakat seviyesini güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_customer_loyalty_level(customer_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE customers
    SET loyalty_level = calculate_loyalty_level(total_purchases)
    WHERE id = customer_uuid;
END;
$$ LANGUAGE plpgsql;

-- Müşteri kartı numarası oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION generate_loyalty_card()
RETURNS TEXT AS $$
DECLARE
    card_num TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        card_num := 'KP' || LPAD(ROUND(RANDOM() * 999999)::TEXT, 6, '0');
        SELECT EXISTS(SELECT 1 FROM customers WHERE loyalty_card_number = card_num) INTO exists;
        IF NOT exists THEN
            RETURN card_num;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
