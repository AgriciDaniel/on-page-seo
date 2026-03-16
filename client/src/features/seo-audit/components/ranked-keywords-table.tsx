import { useState } from 'react'
import {
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { type RankedKeyword } from '@/types/seo'
import { rankedKeywordsColumns as columns } from './ranked-keywords-columns'

const positionFilters = [
  { label: 'Top 3', value: '1-3' },
  { label: 'Top 10', value: '4-10' },
  { label: '11-20', value: '11-20' },
  { label: '21-50', value: '21-50' },
  { label: '51-100', value: '51-100' },
]

const intentFilters = [
  { label: 'Informational', value: 'informational' },
  { label: 'Commercial', value: 'commercial' },
  { label: 'Navigational', value: 'navigational' },
  { label: 'Transactional', value: 'transactional' },
]

const trendFilters = [
  { label: 'New', value: 'new' },
  { label: 'Up', value: 'up' },
  { label: 'Stable', value: 'stable' },
  { label: 'Down', value: 'down' },
  { label: 'Lost', value: 'lost' },
]

const competitionFilters = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
]

interface RankedKeywordsTableProps {
  data: RankedKeyword[]
}

export function RankedKeywordsTable({ data }: RankedKeywordsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'position', desc: false },
  ])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const search = filterValue.toLowerCase()
      const keyword = (row.original.keyword || '').toLowerCase()
      const url = (row.original.url || '').toLowerCase()
      return keyword.includes(search) || url.includes(search)
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  return (
    <div className='space-y-4'>
      <DataTableToolbar
        table={table}
        searchPlaceholder='Search keywords or URLs...'
        filters={[
          { columnId: 'position', title: 'Position', options: positionFilters },
          { columnId: 'search_intent', title: 'Intent', options: intentFilters },
          { columnId: 'trend', title: 'Trend', options: trendFilters },
          { columnId: 'competition_level', title: 'Competition', options: competitionFilters },
        ]}
      />

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  No keywords found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  )
}
