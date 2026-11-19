import { describe, expect, it, vi } from 'vitest'
import { constructTable, stockFeatures } from '../../../../src'
import { testFeatures } from '../../../fixtures/features'
import type { ColumnDef } from '../../../../src'

const features = testFeatures({ ...stockFeatures })

type Item = { a: number; b: number; total: number; x: number }

const leaf = (id: keyof Item): ColumnDef<typeof features, Item> => ({
  id,
  accessorKey: id,
  size: 100,
})

// `scores` groups a, b and total; x stands alone.
const columns: Array<ColumnDef<typeof features, Item>> = [
  {
    id: 'scores',
    columns: [leaf('a'), leaf('b'), leaf('total')],
    groupModes: { collapsed: ['total'], combined: ['a', 'b'] },
  },
  leaf('x'),
]

function makeTable(
  options: Partial<
    Omit<
      Parameters<typeof constructTable<typeof features, Item>>[0],
      'features' | 'data' | 'columns'
    >
  > = {},
) {
  return constructTable<typeof features, Item>({
    features,
    data: [{ a: 1, b: 2, total: 3, x: 4 }],
    columns,
    ...options,
  })
}

const ids = (items: Array<{ id: string }>) => items.map((item) => item.id)
const columnIds = (items: Array<{ column: { id: string } }>) =>
  items.map((item) => item.column.id)

describe('columnGroupModes', () => {
  it('starts empty and shows every column', () => {
    const table = makeTable()

    expect(table.atoms.columnGroupModes.get()).toEqual({})
    expect(ids(table.getVisibleLeafColumns())).toEqual(['a', 'b', 'total', 'x'])
    expect(table.getColumn('scores')!.getGroupMode()).toBeUndefined()
    expect(table.getColumn('a')!.getIsHiddenByGroupMode()).toBe(false)
  })

  it('shows only the columns the active mode lists', () => {
    const table = makeTable({
      initialState: { columnGroupModes: { scores: 'collapsed' } },
    })

    expect(ids(table.getVisibleLeafColumns())).toEqual(['total', 'x'])
    expect(table.getColumn('a')!.getIsVisible()).toBe(false)
    expect(table.getColumn('a')!.getIsHiddenByGroupMode()).toBe(true)
    expect(table.getColumn('total')!.getIsHiddenByGroupMode()).toBe(false)
    expect(table.getColumn('x')!.getIsHiddenByGroupMode()).toBe(false)
    // The group column itself stays visible while one of its columns is.
    expect(table.getColumn('scores')!.getIsVisible()).toBe(true)
    expect(table.getColumn('scores')!.getIsHiddenByGroupMode()).toBe(false)
  })

  it('does not write to columnVisibility', () => {
    const table = makeTable()

    table.getColumn('scores')!.setGroupMode('collapsed')

    expect(table.atoms.columnVisibility.get()).toEqual({})
    expect(table.atoms.columnGroupModes.get()).toEqual({ scores: 'collapsed' })
  })

  it('combines with columnVisibility: a column is shown only if both allow it', () => {
    const table = makeTable({
      initialState: {
        columnVisibility: { b: false },
        columnGroupModes: { scores: 'combined' },
      },
    })

    expect(ids(table.getVisibleLeafColumns())).toEqual(['a', 'x'])
    // b is hidden by the user, not by the mode.
    expect(table.getColumn('b')!.getIsHiddenByGroupMode()).toBe(false)

    table.getColumn('scores')!.setGroupMode(undefined)
    expect(ids(table.getVisibleLeafColumns())).toEqual(['a', 'total', 'x'])
  })

  it('switches and clears the mode through the column and table APIs', () => {
    const table = makeTable()
    const scores = table.getColumn('scores')!

    scores.setGroupMode('collapsed')
    expect(scores.getGroupMode()).toBe('collapsed')
    expect(ids(table.getVisibleLeafColumns())).toEqual(['total', 'x'])

    scores.setGroupMode('combined')
    expect(ids(table.getVisibleLeafColumns())).toEqual(['a', 'b', 'x'])

    scores.setGroupMode(undefined)
    expect(table.atoms.columnGroupModes.get()).toEqual({})
    expect(ids(table.getVisibleLeafColumns())).toEqual(['a', 'b', 'total', 'x'])

    table.setColumnGroupModes({ scores: 'collapsed' })
    expect(ids(table.getVisibleLeafColumns())).toEqual(['total', 'x'])
  })

  it('ignores a mode the group does not define, and entries for unknown columns', () => {
    const table = makeTable({
      initialState: {
        columnGroupModes: { scores: 'unknown', missing: 'collapsed' },
      },
    })

    expect(ids(table.getVisibleLeafColumns())).toEqual(['a', 'b', 'total', 'x'])
    expect(table.getColumn('a')!.getIsHiddenByGroupMode()).toBe(false)
  })

  it('resets to the initial state, or to empty', () => {
    const table = makeTable({
      initialState: { columnGroupModes: { scores: 'collapsed' } },
    })

    table.setColumnGroupModes({})
    table.resetColumnGroupModes()
    expect(table.atoms.columnGroupModes.get()).toEqual({ scores: 'collapsed' })

    table.resetColumnGroupModes(true)
    expect(table.atoms.columnGroupModes.get()).toEqual({})
  })

  it('calls onColumnGroupModesChange with an updater', () => {
    const onColumnGroupModesChange = vi.fn()
    const table = makeTable({ onColumnGroupModesChange })

    table.getColumn('scores')!.setGroupMode('collapsed')

    expect(onColumnGroupModesChange).toHaveBeenCalledTimes(1)
    const updater = onColumnGroupModesChange.mock.calls[0]![0]
    expect(typeof updater === 'function' ? updater({}) : updater).toEqual({
      scores: 'collapsed',
    })
  })

  // Every getter below is cached by TanStack. Each is read before the mode
  // changes, so a cache that misses the columnGroupModes dependency fails here.
  describe('refreshes everything that depends on visibility', () => {
    function read(table: ReturnType<typeof makeTable>) {
      const row = table.getRowModel().rows[0]!
      const headerGroups = table.getHeaderGroups()
      return {
        visibleLeaf: ids(table.getVisibleLeafColumns()),
        visibleFlat: ids(table.getVisibleFlatColumns()),
        centerLeaf: ids(table.getCenterVisibleLeafColumns()),
        startLeaf: ids(table.getStartVisibleLeafColumns()),
        groupHeaders: columnIds(headerGroups[0]!.headers),
        leafHeaders: columnIds(headerGroups[headerGroups.length - 1]!.headers),
        groupHeaderSize: headerGroups[0]!.headers[0]!.getSize(),
        totalSize: table.getTotalSize(),
        xStart: table.getColumn('x')!.getStart(),
        xIndex: table.getColumn('x')!.getIndex(),
        cells: columnIds(row.getVisibleCells()),
        centerCells: columnIds(row.getCenterVisibleCells()),
        startCells: columnIds(row.getStartVisibleCells()),
      }
    }

    it('when a mode is set and cleared', () => {
      const table = makeTable({
        initialState: { columnPinning: { start: ['total'], end: [] } },
      })

      expect(read(table)).toEqual({
        visibleLeaf: ['a', 'b', 'total', 'x'],
        visibleFlat: ['scores', 'a', 'b', 'total', 'x'],
        centerLeaf: ['a', 'b', 'x'],
        startLeaf: ['total'],
        groupHeaders: ['scores', 'x'],
        leafHeaders: ['total', 'a', 'b', 'x'],
        groupHeaderSize: 300,
        totalSize: 400,
        xStart: 300,
        xIndex: 3,
        cells: ['total', 'a', 'b', 'x'],
        centerCells: ['a', 'b', 'x'],
        startCells: ['total'],
      })

      table.getColumn('scores')!.setGroupMode('collapsed')

      expect(read(table)).toEqual({
        visibleLeaf: ['total', 'x'],
        visibleFlat: ['scores', 'total', 'x'],
        centerLeaf: ['x'],
        startLeaf: ['total'],
        groupHeaders: ['scores', 'x'],
        leafHeaders: ['total', 'x'],
        groupHeaderSize: 100,
        totalSize: 200,
        xStart: 100,
        xIndex: 1,
        cells: ['total', 'x'],
        centerCells: ['x'],
        startCells: ['total'],
      })

      table.getColumn('scores')!.setGroupMode('combined')

      expect(read(table)).toMatchObject({
        visibleLeaf: ['a', 'b', 'x'],
        startLeaf: [],
        leafHeaders: ['a', 'b', 'x'],
        groupHeaderSize: 200,
        totalSize: 300,
        xStart: 200,
        xIndex: 2,
        cells: ['a', 'b', 'x'],
        startCells: [],
      })

      table.getColumn('scores')!.setGroupMode(undefined)

      expect(read(table).totalSize).toBe(400)
      expect(read(table).cells).toEqual(['total', 'a', 'b', 'x'])
    })
  })
})
