import { useCallback, useEffect, useState } from 'react'
import useDebounce from './useDebounce'

/**
 * @param {(params: object) => Promise<{data: {items: any[], pagination: object}}>} fetcher
 * @param {object} filters
 */
export default function usePaginatedList(fetcher, filters = {}, deps = []) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const debouncedFilters = useDebounce(filters, 300)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetcher({
        page: page + 1,
        pageSize,
        ...debouncedFilters,
      })
      setItems(res.data.items || [])
      setPagination(res.data.pagination || { total: 0, totalPages: 1 })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load')
      setItems([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, page, pageSize, JSON.stringify(debouncedFilters), ...deps])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(0)
  }, [JSON.stringify(debouncedFilters)])

  return {
    items,
    pagination,
    loading,
    error,
    page,
    pageSize,
    setPage,
    setPageSize,
    reload: load,
  }
}
