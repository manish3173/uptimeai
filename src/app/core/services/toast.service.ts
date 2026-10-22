import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'danger';
}

/** Minimal toast/notification service for API feedback. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private static readonly MAX_VISIBLE_TOASTS = 3;
  private nextId = 0;
  readonly toasts = signal<Toast[]>([]);

  show(message: string, tone: Toast['tone'] = 'info', timeout = 4500): void {
    if (this.toasts().some((toast) => toast.message === message && toast.tone === tone)) {
      return;
    }

    const id = ++this.nextId;
    this.toasts.update((list) => [
      ...list.slice(-(ToastService.MAX_VISIBLE_TOASTS - 1)),
      { id, message, tone },
    ]);
    setTimeout(() => this.dismiss(id), timeout);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }
}
