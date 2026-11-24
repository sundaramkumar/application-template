import bcrypt from 'bcryptjs';
import { eq, and } from 'drizzle-orm';
import { MODULES } from '@shared';
import { db } from './index';
import { roles } from './schema/roles';
import { users } from './schema/users';
import { rolePermissions } from './schema/role_permissions';

async function ensureRole(name: string, type: 'admin' | 'user', isSystem: boolean): Promise<string> {
  const [existing] = await db.select().from(roles).where(eq(roles.name, name)).limit(1);
  if (existing) {
    // Keep built-in role type/flags correct even on re-seed of an older DB.
    await db.update(roles).set({ type, is_system: isSystem }).where(eq(roles.id, existing.id));
    return existing.id;
  }
  const [row] = await db.insert(roles).values({ name, type, is_system: isSystem }).returning({ id: roles.id });
  console.log(`✔ created role: ${name} (${type})`);
  return row.id;
}

/** Admin role type already bypasses checks; seed an explicit full matrix anyway. */
async function ensureAdminPermissions(adminRoleId: string): Promise<void> {
  for (const m of MODULES) {
    const [ex] = await db.select().from(rolePermissions)
      .where(and(eq(rolePermissions.role_id, adminRoleId), eq(rolePermissions.module, m.key))).limit(1);
    if (ex) continue;
    await db.insert(rolePermissions).values({
      role_id: adminRoleId, module: m.key,
      can_read: true, can_create: true, can_update: true, can_delete: true, scope: 'all',
    });
  }
}

async function seed() {
  const adminRoleId = await ensureRole('Admin', 'admin', true);
  await ensureRole('User', 'user', true);
  await ensureAdminPermissions(adminRoleId);

  const [existing] = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
  if (existing) {
    console.log('• admin user already exists — skipping');
    return;
  }

  const password_hash = await bcrypt.hash('admin123', 10);
  await db.insert(users).values({
    username:      'admin',
    password_hash,
    full_name:     'Administrator',
    email:         'admin@example.com',
    status:        'active',
    role_id:       adminRoleId,
  });
  console.log('✔ created admin user → username: admin  password: admin123');
}

seed()
  .then(() => { console.log('Seed complete.'); process.exit(0); })
  .catch((err) => { console.error('Seed failed:', err); process.exit(1); });
