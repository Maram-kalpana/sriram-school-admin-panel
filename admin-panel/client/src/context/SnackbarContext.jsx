import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Alert, Snackbar } from '@mui/material'

const SnackbarContext = createContext(null)

export function SnackbarProvider({ children }) {
  const [state, setState] = useState({ open: false, message: '', severity: 'info' })

  const showToast = useCallback((message, severity = 'info') => {
    setState({ open: true, message, severity })
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={4000}
        onClose={() => setState((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          severity={state.severity}
          variant="filled"
          onClose={() => setState((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {state.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  )
}

export function useSnackbar() {
  const ctx = useContext(SnackbarContext)
  if (!ctx) throw new Error('useSnackbar must be used within SnackbarProvider')
  return ctx
}
