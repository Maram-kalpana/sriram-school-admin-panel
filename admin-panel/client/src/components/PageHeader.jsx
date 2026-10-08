import { Box, Breadcrumbs, Link as MuiLink, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

export default function PageHeader({ title, subtitle, actions, breadcrumbs = [] }) {
  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumbs.length > 0 && (
        <Breadcrumbs sx={{ mb: 1 }} separator="›">
          {breadcrumbs.map((b, i) =>
            b.to ? (
              <MuiLink key={i} component={RouterLink} to={b.to} underline="hover" color="inherit" variant="body2">
                {b.label}
              </MuiLink>
            ) : (
              <Typography key={i} variant="body2" color="text.secondary">
                {b.label}
              </Typography>
            )
          )}
        </Breadcrumbs>
      )}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h5" component="h1">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {actions}
          </Stack>
        )}
      </Stack>
    </Box>
  )
}
