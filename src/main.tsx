import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import './index.css'
import { RootLayout } from '@/layouts/root-layout'
import { IframeLabPage } from '@/pages/iframe-lab-page'
import { PlaybookPage } from '@/pages/playbook-page'

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <IframeLabPage />,
      },
      {
        path: 'playbook',
        element: <PlaybookPage />,
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
