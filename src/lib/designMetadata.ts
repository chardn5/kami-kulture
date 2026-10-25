export const MANAGED_DESIGN_TAG = 'kami:managed';
export const APPROVED_DESIGN_TAG = 'kami:approved';
export const GARMENT_TAG_PREFIX = 'kami:garment:';

export function designSlug(tags: string[]) {
  const value = tags.find(tag => tag.startsWith('kami:slug:'))?.slice('kami:slug:'.length);
  return value && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 70 ? value : null;
}

export function isApprovedDesign(product: { visible: boolean; tags: string[] }) {
  return product.visible && product.tags.includes(MANAGED_DESIGN_TAG) && product.tags.includes(APPROVED_DESIGN_TAG);
}

export function approvedTags(tags: string[], approved: boolean) {
  const next = tags.filter(tag => tag !== APPROVED_DESIGN_TAG);
  return approved ? [...next, APPROVED_DESIGN_TAG] : next;
}

export function isSameOriginMutation(origin: string | null, requestUrl: string) {
  return !origin || origin === new URL(requestUrl).origin;
}
