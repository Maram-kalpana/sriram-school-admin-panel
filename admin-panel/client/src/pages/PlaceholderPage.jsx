import { Alert, Paper } from '@mui/material'
import PageHeader from '../components/PageHeader'

export default function PlaceholderPage({ title, description }) {
  return (
    <>
      <PageHeader title={title} subtitle={description} />
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Alert severity="info">
          This page is being rebuilt with the new MUI design system. Core APIs remain available.
        </Alert>
      </Paper>
    </>
  )
}
