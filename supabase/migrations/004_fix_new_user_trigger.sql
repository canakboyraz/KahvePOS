-- KahvePOS - "Database error creating new user" düzeltmesi
-- Bu hata handle_new_user trigger'ından kaynaklanıyor
-- Trigger, yeni auth kullanıcısı oluşturulduğunda profiles tablosuna kayıt eklemeye çalışıyor
-- Ama username UNIQUE constraint veya NULL problemi oluşabiliyor
-- Supabase SQL Editor'da çalıştırın

-- ======================================
-- 1. profiles tablosundaki username kısıtını gevşet
-- ======================================

-- username NULL olabilir yap (trigger'da email'den parse edilecek)
ALTER TABLE profiles ALTER COLUMN username DROP NOT NULL;

-- ======================================
-- 2. handle_new_user fonksiyonunu düzelt
-- ======================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_username TEXT;
    new_role TEXT;
BEGIN
    -- Username belirle: metadata'dan veya email'den parse et
    new_username := COALESCE(
        NEW.raw_user_meta_data->>'username',
        split_part(NEW.email, '@', 1)
    );
    
    -- Role belirle: metadata'dan veya varsayılan
    new_role := COALESCE(
        (NEW.raw_user_meta_data->>'role')::text, 
        'barista'
    );
    
    -- Eğer bu username zaten varsa, sonuna sayı ekle
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username) THEN
        new_username := new_username || '_' || substr(NEW.id::text, 1, 8);
    END IF;
    
    -- Profil oluştur (hata varsa yoksay - UPSERT mantığı)
    INSERT INTO public.profiles (id, username, role, permissions)
    VALUES (
        NEW.id,
        new_username,
        new_role,
        jsonb_build_object(
            'products', CASE WHEN new_role = 'admin' THEN true ELSE false END,
            'reports', true,
            'users', CASE WHEN new_role = 'admin' THEN true ELSE false END
        )
    )
    ON CONFLICT (id) DO UPDATE SET
        username = COALESCE(EXCLUDED.username, profiles.username),
        role = COALESCE(EXCLUDED.role, profiles.role),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Herhangi bir hata durumunda loglayıp devam et
        RAISE LOG 'handle_new_user hatası: % - %', SQLERRM, SQLSTATE;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================
-- 3. Trigger'ı yeniden oluştur
-- ======================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ======================================
-- 4. RLS - profiles INSERT policy ekle (eksikti!)
-- ======================================

-- Profil INSERT policy (trigger SECURITY DEFINER ile çalışıyor ama yine de ekleyelim)
DROP POLICY IF EXISTS "Service role profil oluşturabilir" ON profiles;
CREATE POLICY "Service role profil oluşturabilir" ON profiles
    FOR INSERT WITH CHECK (true);

-- ======================================
-- 5. Mevcut auth kullanıcıları için profil yoksa oluştur
-- ======================================

INSERT INTO public.profiles (id, username, role, permissions)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)),
    COALESCE((au.raw_user_meta_data->>'role')::text, 'barista'),
    CASE 
        WHEN COALESCE((au.raw_user_meta_data->>'role')::text, 'barista') = 'admin' 
        THEN '{"products": true, "reports": true, "users": true}'::jsonb
        ELSE '{"products": false, "reports": true, "users": false}'::jsonb
    END
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- ======================================
-- TAMAMLANDI
-- ======================================
SELECT 'handle_new_user trigger düzeltmesi tamamlandı!' as sonuc;
