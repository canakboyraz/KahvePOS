-- Migration: Create Admin User
-- Admin kullanıcı: admin / 4380
-- Email: admin@kahvepos.local
-- Tüm yetkiler: users, products, reports

-- Not: Bu migration SQL execute ile uygulanmıştır
-- auth.users ve public.profiles tablolarında kayıt mevcuttur

-- Doğrulama sorgusu:
-- SELECT p.id, p.username, p.role, p.permissions, u.email 
-- FROM public.profiles p JOIN auth.users u ON p.id = u.id 
-- WHERE u.email = 'admin@kahvepos.local';

-- Beklenen sonuç:
-- id: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
-- username: admin
-- role: admin
-- permissions: {"users": true, "products": true, "reports": true}
-- email: admin@kahvepos.local
