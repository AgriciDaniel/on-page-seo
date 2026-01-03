import { useState, Fragment, useMemo } from 'react'
import { ChevronDownSquare, ChevronRightSquare } from 'lucide-react'
import {
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type ExpandedState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { type PageResult } from '@/types/seo'
import { auditColumns as columns, ExpandedRowContent } from './audit-columns'

// Status filter options
const statuses = [
  { label: 'Excellent', value: 'excellent' },
  { label: 'Good', value: 'good' },
  { label: 'Needs Improvement', value: 'needs_improvement' },
  { label: 'Poor', value: 'poor' },
]

interface AuditTableProps {
  data: PageResult[]
}

export function AuditTable({ data }: AuditTableProps) {
  // Auto-expand first 6 rows by default
  const initialExpanded = useMemo(() => {
    const expanded: Record<string, boolean> = {}
    for (let i = 0; i < Math.min(6, data.length); i++) {
      expanded[String(i)] = true
    }
    return expanded
  }, [data.length])

  // Local state management
  const [rowSelection, setRowSelection] = useState({})
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'onpage_score', desc: true },
  ])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [expanded, setExpanded] = useState<ExpandedState>(initialExpanded)

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
      expanded,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
    getRowCanExpand: () => true,
    globalFilterFn: (row, _columnId, filterValue) => {
      const url = String(row.getValue('url')).toLowerCase()
      const searchValue = String(filterValue).toLowerCase()
      return url.includes(searchValue)
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getExpandedRowModel: getExpandedRowModel(),
  })

  const allExpanded = table.getIsAllRowsExpanded()
  const someExpanded = table.getIsSomeRowsExpanded()

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between gap-2'>
        <DataTableToolbar
          table={table}
          searchPlaceholder='Filter by URL...'
          filters={[
            {
              columnId: 'overall_status',
              title: 'Status',
              options: statuses,
            },
          ]}
          hideViewOptions
        />
        <div className='flex items-center gap-1'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => table.toggleAllRowsExpanded(true)}
            disabled={allExpanded}
            className='h-8 text-xs'
          >
            <ChevronDownSquare className='h-4 w-4 mr-1' />
            Expand All
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => table.toggleAllRowsExpanded(false)}
            disabled={!someExpanded && !allExpanded}
            className='h-8 text-xs'
          >
            <ChevronRightSquare className='h-4 w-4 mr-1' />
            Collapse All
          </Button>
        </div>
      </div>
      <div className='overflow-hidden rounded-md border'>
        <div className='overflow-x-auto'>
          <Table style={{ tableLayout: 'fixed', width: '100%' }}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{
                        width: header.column.id === 'onpage_score' ? '80px'
                          : header.column.id === 'overall_status' ? '130px'
                          : header.column.id === 'expander' ? '50px'
                          : 'auto'
                      }}
                      className={cn(
                        'whitespace-nowrap',
                        header.column.columnDef.meta?.className,
                        header.column.columnDef.meta?.thClassName
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <Fragment key={row.id}>
                    <TableRow
                      data-state={row.getIsSelected() && 'selected'}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-muted/30',
                        row.getIsExpanded() && 'bg-muted/50'
                      )}
                      onClick={() => row.toggleExpanded()}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            'whitespace-nowrap py-2',
                            cell.column.columnDef.meta?.className,
                            cell.column.columnDef.meta?.tdClassName
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    {row.getIsExpanded() && (
                      <tr>
                        <td
                          colSpan={row.getVisibleCells().length}
                          className='p-0 bg-muted/5'
                        >
                          <div className='w-full overflow-hidden'>
                            <ExpandedRowContent row={row} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='h-24 text-center'
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <DataTablePagination table={table} className='mt-auto' />
    </div>
  )
}
