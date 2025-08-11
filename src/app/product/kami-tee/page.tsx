"use client";

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useState } from "react";

export default function KamiTee() {
  const [status, setStatus] = useState<string>("");

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-3xl p-6">
        <h1 className="text-4xl font-bold">Kami Tee</h1>
        <p className="mt-2 text-white/70">$24.99 • Free US shipping over $50</p>

        {/* Mock product image */}
        <div className="mt-6 h-64 rounded-xl bg-white/5 border border-white/10 grid place-items-center">
          <span className="text-white/40">[ product image ]</span>
        </div>

        <div className="mt-8">
          <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID! }}>
            <PayPalButtons
              style={{ layout: "vertical", color: "gold", shape: "rect", label: "paypal" }}
              createOrder={async () => {
                setStatus("Creating order...");
                const res = await fetch("/api/paypal/create-order", { method: "POST" });
                const data = await res.json();
                if (!res.ok || !data?.id) throw new Error(data?.error || "Failed to create order");
                setStatus("Order created. Awaiting approval...");
                return data.id as string;
              }}
              onApprove={async (data) => {
                setStatus("Capturing payment...");
                const res = await fetch("/api/paypal/capture-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderID: data.orderID }),
                });
                const out = await res.json();
                if (!res.ok || !out?.ok) throw new Error(out?.error || "Capture failed");
                setStatus("Payment captured! We’ll email you confirmation.");
                // TODO: redirect to a Thank You page; for now, just show message.
              }}
              onError={(err) => {
                console.error(err);
                setStatus("Payment error. Please try again.");
              }}
            />
          </PayPalScriptProvider>
        </div>

        {status && <p className="mt-4 text-sm text-white/70">{status}</p>}
      </section>
    </main>
  );
}
