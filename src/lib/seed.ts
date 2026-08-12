import { db } from '@/lib/db';

// This runs during build to seed initial admin if no users exist
export async function seedIfEmpty() {
  try {
    const count = await db.persona.count();
    if (count === 0) {
      await db.persona.create({
        data: {
          nombre: 'Administrador',
          cedula: null,
          telefono: null,
          rol: 'ADMIN',
          pin: '2107',
          esActual: false,
        },
      });
      console.log('Seed: Admin user created (PIN: 2107)');
    }
  } catch (error) {
    console.error('Seed error:', error);
  }
}
