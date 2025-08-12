// /src/app/thank-you/page.tsx
export default async function ThankYou({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = sp?.orderID;
  const orderID =
    typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] ?? '' : '';

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Thanks for your order!</h1>
      {orderID && (
        <p className="mt-3 text-sm text-neutral-600">
          Order ID: <code>{orderID}</code>
        </p>
      )}
      <p className="mt-6">We’ve received your order and will process it shortly.</p>
    </main>
  );
}
