import prisma from "../src/lib/prisma";

async function syncAuthUsers() {
  try {
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users in public.User`);

    for (const u of users) {
      // Check if already in auth.users
      const existing: any = await prisma.$queryRawUnsafe(
        `SELECT id FROM auth.users WHERE email = $1 OR id = $2::uuid LIMIT 1`,
        u.email,
        u.id
      );

      if (!existing || existing.length === 0) {
        console.log(`Inserting ${u.email} (${u.name}) into auth.users...`);
        await prisma.$queryRawUnsafe(`
          INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            is_sso_user,
            is_anonymous
          ) VALUES (
            $1::uuid,
            '00000000-0000-0000-0000-000000000000'::uuid,
            'authenticated',
            'authenticated',
            $2,
            crypt($3, gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            json_build_object('name', $4, 'role', $5, 'phone', $6)::jsonb,
            NOW(),
            NOW(),
            false,
            false
          )
        `, u.id, u.email, u.passwordHash || 'coach123', u.name, u.role, u.phone || '');
        console.log(`Successfully synced ${u.email} to auth.users!`);
      } else {
        console.log(`${u.email} already exists in auth.users.`);
      }
    }

    const authCount: any = await prisma.$queryRawUnsafe(`SELECT count(*) FROM auth.users`);
    console.log("Current auth.users count:", authCount);
  } catch (err: any) {
    console.error("Error syncing auth users:", err);
  } finally {
    await prisma.$disconnect();
  }
}

syncAuthUsers();
