import { createRoot } from 'react-dom/client';

import { OutdoorApp } from '../src/OutdoorApp';
import type { OutdoorLayout } from '../src/layout';
import { disableBrowserHistorySwipe } from './disableBrowserHistorySwipe';

disableBrowserHistorySwipe();

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing #root');
}

const params = new URLSearchParams(window.location.search);
const wantsMobile =
  params.get('mobile') === '1' ||
  typeof (window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView !==
    'undefined';

const layout: OutdoorLayout = wantsMobile ? 'mobile' : 'browser';

// Mac browser: spacious side-by-side. ?mobile=1 / iPhone WebView: stacked mobile layout.
// Native Expo App.tsx passes layout="mobile" directly.
createRoot(root).render(<OutdoorApp apiBaseUrl="" layout={layout} />);
