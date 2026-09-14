/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Home from './app/page';
import { Toaster } from './components/ui/toaster';

export default function App() {
  return (
    <div className="w-full min-h-screen bg-gray-50">
      <Home />
      <Toaster />
    </div>
  );
}


