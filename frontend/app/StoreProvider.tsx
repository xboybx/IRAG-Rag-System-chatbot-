'use client';

import { useRef } from 'react';
import { Provider } from 'react-redux';
import { store, AppStore } from '../Redux/Store';

export default function StoreProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    // In Next.js App Router, we should ensure the store is created once per request on the server,
    // but here we are using a global singleton store which is fine for client-side rendering primarily.
    // However, a better pattern for SSR is creating a new store per request.
    // For now, based on your Store.ts setup, we will use the exported store directly.

    return <Provider store={store}>{children}</Provider>;
}
