export default function ThankYou({ searchParams }: { searchParams: { orderID?: string } }) {
    const id = searchParams.orderID ?? '';
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold">Thanks for your order!</h1>
        {id && <p className="mt-3 text-sm text-neutral-600">Order ID: <code>{id}</code></p>}
        <p className="mt-6">We’ve received your order and will process it shortly.</p>
      </main>
    );
  }
  