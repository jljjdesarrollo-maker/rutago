import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/owner-expenses
// Parámetros opcionales: busId, yearMonth (ej: "2026-08"), category, status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const busId = searchParams.get('busId') || 'BUS-01';
    const yearMonth = searchParams.get('yearMonth');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {
      busId,
    };

    if (yearMonth) {
      where.expenseDate = { startsWith: yearMonth };
    }
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (status && (status === 'PAGADO' || status === 'PENDIENTE')) {
      where.status = status;
    }

    const expenses = await db.ownerExpense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: expenses,
      count: expenses.length,
    });
  } catch (error) {
    console.error('Error al obtener gastos de socio:', error);
    // En caso de entorno sin base de datos activa o error de conexión, responder con array vacío resiliente
    return NextResponse.json(
      {
        success: false,
        data: [],
        message: error instanceof Error ? error.message : 'Error al consultar base de datos',
      },
      { status: 500 }
    );
  }
}

// POST /api/owner-expenses
// Soporta registro individual o carga masiva (bulk migration)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Caso 1: Carga masiva (bulk migration desde localStorage)
    if (body && (Array.isArray(body.bulk) || Array.isArray(body))) {
      const items = Array.isArray(body.bulk) ? body.bulk : body;
      const results = [];

      for (const item of items) {
        if (!item.expenseDate || !item.description) continue;

        const total = Number(item.totalAmount) || 0;
        const paid = Number(item.paidAmount) || 0;
        const pending = Math.max(0, total - paid);

        const upserted = await db.ownerExpense.upsert({
          where: { id: item.id || `EXP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` },
          update: {
            busId: item.busId || 'BUS-01',
            expenseDate: item.expenseDate,
            category: item.category || 'OTROS',
            description: item.description,
            provider: item.provider || null,
            totalAmount: total,
            paidAmount: paid,
            pendingBalance: pending,
            paymentMethod: item.paymentMethod || 'EFECTIVO',
            comprobanteRef: item.comprobanteRef || null,
            bankName: item.bankName || null,
            receiptPhotoUrl: item.receiptPhotoUrl || null,
            abonos: item.abonos ? JSON.stringify(item.abonos) : '[]',
            status: pending <= 0 ? 'PAGADO' : 'PENDIENTE',
          },
          create: {
            id: item.id || undefined,
            busId: item.busId || 'BUS-01',
            expenseDate: item.expenseDate,
            category: item.category || 'OTROS',
            description: item.description,
            provider: item.provider || null,
            totalAmount: total,
            paidAmount: paid,
            pendingBalance: pending,
            paymentMethod: item.paymentMethod || 'EFECTIVO',
            comprobanteRef: item.comprobanteRef || null,
            bankName: item.bankName || null,
            receiptPhotoUrl: item.receiptPhotoUrl || null,
            abonos: item.abonos ? JSON.stringify(item.abonos) : '[]',
            status: pending <= 0 ? 'PAGADO' : 'PENDIENTE',
          },
        });
        results.push(upserted);
      }

      return NextResponse.json({
        success: true,
        migratedCount: results.length,
        data: results,
      });
    }

    // Caso 2: Registro individual de nuevo gasto
    const {
      id,
      busId = 'BUS-01',
      expenseDate,
      category,
      description,
      provider,
      totalAmount,
      paidAmount,
      paymentMethod = 'EFECTIVO',
      comprobanteRef,
      bankName,
      receiptPhotoUrl,
      abonos,
    } = body;

    if (!expenseDate || !description) {
      return NextResponse.json(
        { success: false, error: 'Fecha y descripción son requeridas' },
        { status: 400 }
      );
    }

    const total = Number(totalAmount) || 0;
    const paid = Number(paidAmount) || 0;
    const pending = Math.max(0, total - paid);

    const newExpense = await db.ownerExpense.create({
      data: {
        id: id || undefined,
        busId,
        expenseDate,
        category: category || 'OTROS',
        description,
        provider: provider || null,
        totalAmount: total,
        paidAmount: paid,
        pendingBalance: pending,
        paymentMethod,
        comprobanteRef: comprobanteRef || null,
        bankName: bankName || null,
        receiptPhotoUrl: receiptPhotoUrl || null,
        abonos: abonos ? JSON.stringify(abonos) : '[]',
        status: pending <= 0 ? 'PAGADO' : 'PENDIENTE',
      },
    });

    return NextResponse.json({
      success: true,
      data: newExpense,
    });
  } catch (error) {
    console.error('Error al registrar gasto de socio:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno al guardar',
      },
      { status: 500 }
    );
  }
}

// PUT /api/owner-expenses
// Permite actualizar un gasto o registrar un abono a deudas de talleres
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, abono, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID del gasto es requerido' },
        { status: 400 }
      );
    }

    const existing = await db.ownerExpense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Gasto no encontrado' },
        { status: 404 }
      );
    }

    // Si viene una acción de abono directo
    if (abono && abono.amount) {
      const currentAbonos = typeof existing.abonos === 'string' 
        ? JSON.parse(existing.abonos) 
        : (Array.isArray(existing.abonos) ? existing.abonos : []);

      currentAbonos.push({
        id: `ABN-${Date.now()}`,
        date: abono.date || new Date().toISOString().split('T')[0],
        amount: Number(abono.amount),
        paymentMethod: abono.paymentMethod || 'TRANSFERENCIA',
        comprobanteRef: abono.comprobanteRef || null,
        notes: abono.notes || null,
        createdAt: new Date().toISOString(),
      });

      const newPaid = existing.paidAmount + Number(abono.amount);
      const newPending = Math.max(0, existing.totalAmount - newPaid);

      const updated = await db.ownerExpense.update({
        where: { id },
        data: {
          paidAmount: newPaid,
          pendingBalance: newPending,
          status: newPending <= 0 ? 'PAGADO' : 'PENDIENTE',
          abonos: JSON.stringify(currentAbonos),
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // Actualización general de campos
    const total = updates.totalAmount !== undefined ? Number(updates.totalAmount) : existing.totalAmount;
    const paid = updates.paidAmount !== undefined ? Number(updates.paidAmount) : existing.paidAmount;
    const pending = Math.max(0, total - paid);

    const updated = await db.ownerExpense.update({
      where: { id },
      data: {
        busId: updates.busId ?? existing.busId,
        expenseDate: updates.expenseDate ?? existing.expenseDate,
        category: updates.category ?? existing.category,
        description: updates.description ?? existing.description,
        provider: updates.provider !== undefined ? updates.provider : existing.provider,
        totalAmount: total,
        paidAmount: paid,
        pendingBalance: pending,
        paymentMethod: updates.paymentMethod ?? existing.paymentMethod,
        comprobanteRef: updates.comprobanteRef !== undefined ? updates.comprobanteRef : existing.comprobanteRef,
        bankName: updates.bankName !== undefined ? updates.bankName : existing.bankName,
        receiptPhotoUrl: updates.receiptPhotoUrl !== undefined ? updates.receiptPhotoUrl : existing.receiptPhotoUrl,
        status: pending <= 0 ? 'PAGADO' : 'PENDIENTE',
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error al actualizar gasto de socio:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error al actualizar' },
      { status: 500 }
    );
  }
}

// DELETE /api/owner-expenses
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID es requerido para eliminar' },
        { status: 400 }
      );
    }

    await db.ownerExpense.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Gasto eliminado de la base de datos',
    });
  } catch (error) {
    console.error('Error al eliminar gasto de socio:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error al eliminar' },
      { status: 500 }
    );
  }
}
