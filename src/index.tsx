import React from 'react'
import theme from '~/resources/theme'
import router from '~/resources/router'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <React.Fragment>
      <CssBaseline />
      <ThemeProvider theme={ theme }>
        <RouterProvider router={ router } />
      </ThemeProvider>
    </React.Fragment>
  </React.StrictMode>,
)