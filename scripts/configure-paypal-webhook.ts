import { paypalEnvironment, paypalRequest } from '../src/lib/paypalServer';

async function main() {
  if (paypalEnvironment() !== 'sandbox') throw new Error('This setup command is sandbox-only.');
  const url = 'https://www.kamikulture.com/api/paypal/webhook';
  const types = ['CHECKOUT.ORDER.APPROVED', 'PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED', 'PAYMENT.CAPTURE.DENIED'];
  type Webhook = { id: string; url: string; event_types: { name: string }[] };
  const list = await paypalRequest<{ webhooks: Webhook[] }>('/v1/notifications/webhooks');
  let webhook = list.webhooks.find(h => h.url === url);
  if (!process.argv.includes('--apply')) { console.log({ environment: 'sandbox', url, exists: !!webhook, events: types }); return; }
  if (webhook) {
    const names = [...new Set([...webhook.event_types.map(t => t.name), ...types])];
    await paypalRequest(`/v1/notifications/webhooks/${webhook.id}`, 'PATCH', [{ op: 'replace', path: '/event_types', value: names.map(name => ({ name })) }]);
  } else {
    webhook = await paypalRequest<Webhook>('/v1/notifications/webhooks', 'POST', { url, event_types: types.map(name => ({ name })) });
  }
  console.log(JSON.stringify({ environment: 'sandbox', url, webhookId: webhook.id, events: types }));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Webhook configuration failed'); process.exitCode = 1; });
