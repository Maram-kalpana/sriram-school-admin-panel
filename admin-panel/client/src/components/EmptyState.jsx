import { Box, Button, Typography } from '@mui/material'
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined'

export default function EmptyState({ title = 'Nothing here yet', description, actionLabel, onAction, icon }) {
  return (
    <Box
      sx={{
        py: 6,
        px: 2,
        textAlign: 'center',
        color: 'text.secondary',
      }}
    >
      <Box sx={{ mb: 1, color: 'text.disabled' }}>{icon || <InboxOutlinedIcon sx={{ fontSize: 48 }} />}</Box>
      <Typography variant="subtitle1" color="text.primary" fontWeight={600}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ mt: 0.5, maxWidth: 420, mx: 'auto' }}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" sx={{ mt: 2 }} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  )
}
