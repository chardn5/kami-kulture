import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hasAdminApiAccess } from '@/lib/adminApiAuth';
import {
  buildPrintifyOrderPayload,
  formatPrintifyError,
  getOrderShippingSnapshot,
  getPrintifyReadiness,
  mergeOrderRaw,
  submitPrintifyFulfillment,
  type PrintifyFulfillmentLine,
} from '@/lib/printifyFulfillment';
import { PRINTIFY_SYNC_ORDER_SELECT, refreshOrderFromPrintify } from '@/lib/printifyOrderSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUBMITTABLE_STATUSES = new Set(['PAID', 'IN_PRODUCTION', 'FULFILLMENT_FAILED']);

type Body = {
  dryRun?: boolean;
  refresh?: boolean;
};

function lineItems(order: {
  items: Array<{
    id: string;
    sku: string;
    title: string;
    qty: number;
    size: string | null;
    color: string | null;
    printifyProductId: string | null;
    printifyVariantId: number | null;
  }>;
}): PrintifyFulfillmentLine[] {
  return order.items.map((item) => ({
    id: item.id,
    sku: item.sku,
    title: item.title,
    qty: item.qty,
    size: item.size,
    color: item.color,
    printifyProductId: item.printifyProductId,
    printifyVariantId: item.printifyVariantId,
  }));
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await hasAdminApiAccess(req))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const orderId = decodeURIComponent(id || '').trim();
  if (!orderId) {
    return NextResponse.json({ ok: false, error: 'Order ID required' }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        select: {
          id: true,
          sku: true,
          title: true,
          qty: true,
          size: true,
          color: true,
          printifyProductId: true,
          printifyVariantId: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  }

  if (order.printifyOrderId) {
    if (body.refresh) {
      try {
        const syncOrder = await prisma.order.findUnique({
          where: { seq: order.seq },
          select: PRINTIFY_SYNC_ORDER_SELECT,
        });
        if (!syncOrder) {
          return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
        }
        const result = await refreshOrderFromPrintify(syncOrder);

        return NextResponse.json({
          ok: result.ok,
          refreshed: true,
          order: result,
        });
      } catch (error) {
        const message = formatPrintifyError(error);
        await prisma.order.update({
          where: { seq: order.seq },
          data: {
            printifyLastError: message,
            raw: mergeOrderRaw(order.raw, {
              printifyRefreshError: message,
            }),
          },
        });

        return NextResponse.json(
          { ok: false, error: 'Printify status refresh failed.', detail: message },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Already submitted to Printify',
        printifyOrderId: order.printifyOrderId,
      },
      { status: 409 }
    );
  }

  if (!SUBMITTABLE_STATUSES.has(order.status)) {
    return NextResponse.json(
      { ok: false, error: `Order status ${order.status} cannot be submitted to Printify.` },
      { status: 409 }
    );
  }

  const lines = lineItems(order);
  const shipping = getOrderShippingSnapshot(order);
  const readiness = getPrintifyReadiness({ lines, shipping });

  if (!readiness.ok) {
    if (body.dryRun) {
      return NextResponse.json(
        { ok: false, dryRun: true, error: 'Order is not ready for Printify.', issues: readiness.issues },
        { status: 422 }
      );
    }

    await prisma.order.update({
      where: { seq: order.seq },
      data: {
        status: 'FULFILLMENT_FAILED',
        printifyStatus: 'not_ready',
        printifyLastError: readiness.issues.join(' | '),
        raw: mergeOrderRaw(order.raw, {
          printifyError: readiness.issues.join(' | '),
        }),
      },
    });

    return NextResponse.json(
      { ok: false, error: 'Order is not ready for Printify.', issues: readiness.issues },
      { status: 422 }
    );
  }

  if (body.dryRun) {
    try {
      const payload = await buildPrintifyOrderPayload({ orderId: order.id, lines, shipping });
      return NextResponse.json({ ok: true, dryRun: true, payload });
    } catch (error) {
      return NextResponse.json(
        { ok: false, dryRun: true, error: 'Order is not ready for Printify.', detail: formatPrintifyError(error) },
        { status: 422 }
      );
    }
  }

  try {
    const result = await submitPrintifyFulfillment({
      orderId: order.id,
      lines,
      shipping,
    });

    const updated = await prisma.order.update({
      where: { seq: order.seq },
      data: {
        status: 'FULFILLMENT_SUBMITTED',
        printifyOrderId: result.response.id,
        printifyStatus: result.response.status ?? 'submitted',
        printifySubmittedAt: new Date(),
        printifyLastError: null,
        printifyPayload: result.payload as Prisma.InputJsonValue,
        raw: mergeOrderRaw(order.raw, {
          printify: result.response as Prisma.InputJsonValue,
          printifyPayload: result.payload as Prisma.InputJsonValue,
        }),
      },
      select: {
        id: true,
        status: true,
        printifyOrderId: true,
        printifyStatus: true,
        printifySubmittedAt: true,
      },
    });

    const syncOrder = await prisma.order.findUnique({
      where: { seq: order.seq },
      select: PRINTIFY_SYNC_ORDER_SELECT,
    });
    const refreshed = syncOrder ? await refreshOrderFromPrintify(syncOrder) : null;

    return NextResponse.json({
      ok: true,
      order: {
        ...updated,
        printifySubmittedAt: updated.printifySubmittedAt?.toISOString() ?? null,
      },
      refreshed,
    });
  } catch (error) {
    const message = formatPrintifyError(error);

    await prisma.order.update({
      where: { seq: order.seq },
      data: {
        status: 'FULFILLMENT_FAILED',
        printifyStatus: 'failed',
        printifyLastError: message,
        raw: mergeOrderRaw(order.raw, {
          printifyError: message,
        }),
      },
    });

    return NextResponse.json(
      { ok: false, error: 'Printify submission failed.', detail: message },
      { status: 502 }
    );
  }
}
