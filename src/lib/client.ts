'use client';
import type { EIP1193Provider } from 'viem';
declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}
export async function api(action: string, data: Record<string, unknown> = {}) {
  const response = await fetch('/api/app', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Please try again.');
  return result;
}
export async function auth(action: string, data: Record<string, unknown> = {}) {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not connect.');
  return result;
}
