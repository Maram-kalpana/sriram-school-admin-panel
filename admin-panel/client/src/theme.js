import { createTheme } from '@mui/material/styles'

/**
 * Exact palette from the previous Tailwind UI:
 * - primary indigo #4f46e5 / hover #4338ca
 * - white sidebar, indigo filled active nav
 * - page bg slate-50 (#f8fafc), paper white
 * - text slate-900 / slate-500, borders slate-200
 * - system font stack, ~8px radius (rounded-lg)
 */
const theme = createTheme({
  palette: {
    primary: {
      main: '#4f46e5',
      dark: '#4338ca',
      light: '#eef2ff',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#64748b',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
    },
    divider: '#e2e8f0',
    success: { main: '#059669' },
    warning: { main: '#d97706' },
    error: { main: '#dc2626' },
    info: { main: '#4f46e5' },
  },
  typography: {
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8 },
        containedPrimary: {
          '&:hover': { backgroundColor: '#4338ca' },
        },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          borderColor: '#e2e8f0',
          borderRadius: 12,
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        outlined: {
          borderColor: '#e2e8f0',
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#f8fafc',
          '& .MuiTableCell-head': {
            fontWeight: 600,
            color: '#64748b',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
        sizeSmall: { height: 22, fontSize: '0.7rem' },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#0f172a',
          boxShadow: 'none',
          borderBottom: '1px solid #e2e8f0',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginBottom: 4,
          '&.Mui-selected': {
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            '& .MuiListItemIcon-root': { color: '#ffffff' },
            '&:hover': { backgroundColor: '#4338ca' },
          },
          '&:hover': {
            backgroundColor: '#eef2ff',
            color: '#4338ca',
            '& .MuiListItemIcon-root': { color: '#4338ca' },
          },
        },
      },
    },
  },
})

export default theme
