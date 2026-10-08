import { Box, Card, CardContent, Typography } from '@mui/material'

export default function StatCard({ title, value, subtitle, icon, color = 'primary.main' }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {title}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 700 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box sx={{ color, display: 'flex', opacity: 0.9 }}>{icon}</Box>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

export { StatCard as KpiCard }
