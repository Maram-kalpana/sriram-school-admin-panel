import { Box, Skeleton, Stack } from '@mui/material'

export default function LoadingSkeleton({ rows = 6, height = 40 }) {
  return (
    <Stack spacing={1} sx={{ p: 2 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={height} />
      ))}
    </Stack>
  )
}

export function CardGridSkeleton({ count = 4 }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={100} />
      ))}
    </Box>
  )
}
