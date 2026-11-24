import {
  callMemoOrStaticFn,
  cloneState,
  hasOwn,
  makeObjectMap,
  setStateSlice,
} from '../../utils'
import { orderByColumnPinning } from '../../core/featureStubs'
import type { CellData, RowData, Updater } from '../../types/type-utils'
import type { TableFeatures } from '../../types/TableFeatures'
import type { Table_Internal } from '../../types/Table'
import type { Cell } from '../../types/Cell'
import type { Column_Internal } from '../../types/Column'
import type {
  ColumnDef_ColumnVisibility,
  ColumnGroupMode,
  ColumnGroupModesState,
  ColumnVisibilityState,
} from './columnVisibilityFeature.types'
import type { Row } from '../../types/Row'

/**
 * Creates the default column visibility state.
 *
 * The feature default is an empty object, where missing column ids are treated
 * as visible. Reset APIs use this value when `defaultState` is `true`.
 *
 * @example
 * ```ts
 * const visibility = getDefaultColumnVisibilityState()
 * ```
 */
export function getDefaultColumnVisibilityState(): ColumnVisibilityState {
  return makeObjectMap()
}

/**
 * Creates the default group modes state: no group in a mode, so every group
 * shows all of its leaf columns.
 *
 * @example
 * ```ts
 * const groupModes = getDefaultColumnGroupModesState()
 * ```
 */
export function getDefaultColumnGroupModesState(): ColumnGroupModesState {
  return makeObjectMap()
}

/**
 * Updates this column's visibility when hiding is allowed.
 *
 * Passing `visible` stores that value. Omitting it flips the column's current
 * visibility state. Group columns update their hideable leaf columns because
 * visibility state is keyed by leaf column ids. Columns that cannot hide stay
 * unchanged.
 *
 * @example
 * ```ts
 * column_toggleVisibility(column)
 * ```
 */
export function column_toggleVisibility<
  TFeatures extends TableFeatures,
  TData extends RowData,
  TValue extends CellData = CellData,
>(column: Column_Internal<TFeatures, TData, TValue>, visible?: boolean): void {
  if (column_getCanHide(column)) {
    table_setColumnVisibility(column.table, (old) => {
      const next = Object.assign(makeObjectMap<boolean>(), old)
      const nextVisible =
        visible ??
        !callMemoOrStaticFn(column, 'getIsVisible', column_getIsVisible)

      const leafColumns = column.getLeafColumns()
      for (let i = 0; i < leafColumns.length; i++) {
        const leafColumn = leafColumns[i]!
        if (column_getCanHide(leafColumn)) {
          next[leafColumn.id] = nextVisible
        }
      }

      return next
    })
  }
}

/**
 * Gets the mode this group column is in, if any.
 *
 * @example
 * ```ts
 * const mode = column_getGroupMode(groupColumn)
 * ```
 */
export function column_getGroupMode<
  TFeatures extends TableFeatures,
  TData extends RowData,
  TValue extends CellData = CellData,
>(
  column: Column_Internal<TFeatures, TData, TValue>,
): ColumnGroupMode | undefined {
  const groupModes = column.table.atoms.columnGroupModes?.get()
  return groupModes && hasOwn(groupModes, column.id)
    ? groupModes[column.id]
    : undefined
}

/**
 * Sets the view and collapsed state of this group column. `undefined`, or a
 * mode with neither, removes the group's entry: it shows all of its leaf
 * columns again.
 *
 * @example
 * ```ts
 * column_setGroupMode(groupColumn, { collapsed: true })
 * ```
 */
export function column_setGroupMode<
  TFeatures extends TableFeatures,
  TData extends RowData,
  TValue extends CellData = CellData,
>(
  column: Column_Internal<TFeatures, TData, TValue>,
  mode: ColumnGroupMode | undefined,
): void {
  table_setColumnGroupModes(column.table, (old) => {
    const next = Object.assign(makeObjectMap<ColumnGroupMode>(), old)
    if (mode?.view === undefined && !mode?.collapsed) {
      delete next[column.id]
    } else {
      next[column.id] = mode
    }
    return next
  })
}

function getShownColumnIds(
  groupModes: ColumnDef_ColumnVisibility['groupModes'],
  mode: ColumnGroupMode | undefined,
): Array<string> | undefined {
  if (!groupModes || !mode) return undefined
  // A collapsed group shows its collapsed columns whatever view it is in.
  if (mode.collapsed && groupModes.collapsed) return groupModes.collapsed
  const { views } = groupModes
  return mode.view !== undefined && views && hasOwn(views, mode.view)
    ? views[mode.view]
    : undefined
}

/**
 * Checks whether the mode of a group this column sits in hides it.
 *
 * A leaf column is hidden when any ancestor group is collapsed, or in a view,
 * and the matching `columnDef.groupModes` entry does not list it. A group column
 * counts as hidden when all of its leaf columns are.
 *
 * @example
 * ```ts
 * const hiddenByGroup = column_getIsHiddenByGroupMode(column)
 * ```
 */
export function column_getIsHiddenByGroupMode<
  TFeatures extends TableFeatures,
  TData extends RowData,
  TValue extends CellData = CellData,
>(column: Column_Internal<TFeatures, TData, TValue>): boolean {
  const groupModes = column.table.atoms.columnGroupModes?.get()
  if (!groupModes) return false

  if (column.columns.length) {
    return column
      .getLeafColumns()
      .every((leafColumn) =>
        column_getIsHiddenByGroupMode(
          leafColumn as Column_Internal<TFeatures, TData, unknown>,
        ),
      )
  }

  let ancestor = column.parent as
    Column_Internal<TFeatures, TData, unknown> | undefined
  while (ancestor) {
    const mode = hasOwn(groupModes, ancestor.id)
      ? groupModes[ancestor.id]
      : undefined
    const shownColumnIds = getShownColumnIds(
      ancestor.columnDef.groupModes,
      mode,
    )
    if (shownColumnIds && !shownColumnIds.includes(column.id)) return true
    ancestor = ancestor.parent
  }

  return false
}

/**
 * Checks whether this column is visible.
 *
 * Leaf columns read `state.columnVisibility[column.id]`, where missing entries
 * default to visible, and are hidden while the mode of a group they sit in does
 * not show them (see `column_getIsHiddenByGroupMode`). Parent columns are
 * visible when at least one child column is visible.
 *
 * @example
 * ```ts
 * const visible = column_getIsVisible(column)
 * ```
 */
export function column_getIsVisible<
  TFeatures extends TableFeatures,
  TData extends RowData,
  TValue extends CellData = CellData,
>(column: Column_Internal<TFeatures, TData, TValue>): boolean {
  const columnVisibility = column.table.atoms.columnVisibility?.get()
  if (!columnVisibility) return true

  const childColumns = column.columns
  if (childColumns.length) {
    return childColumns.some((childColumn) =>
      callMemoOrStaticFn(childColumn, 'getIsVisible', column_getIsVisible),
    )
  }

  return (
    ((hasOwn(columnVisibility, column.id)
      ? columnVisibility[column.id]
      : undefined) ??
      true) &&
    !column_getIsHiddenByGroupMode(column)
  )
}

/**
 * Checks whether this column is allowed to be hidden.
 *
 * Both `columnDef.enableHiding` and table `enableHiding` default to `true`.
 *
 * @example
 * ```ts
 * const canHide = column_getCanHide(column)
 * ```
 */
export function column_getCanHide<
  TFeatures extends TableFeatures,
  TData extends RowData,
  TValue extends CellData = CellData,
>(column: Column_Internal<TFeatures, TData, TValue>) {
  return (
    (column.columnDef.enableHiding ?? true) &&
    (column.table.options.enableHiding ?? true)
  )
}

/**
 * Creates a checkbox-style handler that writes this column's visibility.
 *
 * The handler reads `event.target.checked`, so it is intended for visibility
 * controls whose checked state means "visible".
 *
 * @example
 * ```ts
 * const onChange = column_getToggleVisibilityHandler(column)
 * ```
 */
export function column_getToggleVisibilityHandler<
  TFeatures extends TableFeatures,
  TData extends RowData,
  TValue extends CellData = CellData,
>(column: Column_Internal<TFeatures, TData, TValue>) {
  return (e: unknown) => {
    column_toggleVisibility(
      column,
      ((e as MouseEvent).target as HTMLInputElement).checked,
    )
  }
}

/**
 * Collects the cells from this row whose columns are visible.
 *
 * When column pinning is active, the result is ordered as start-pinned cells,
 * center cells, then end-pinned cells.
 *
 * @example
 * ```ts
 * const visibleCells = row_getVisibleCells(row)
 * ```
 */
export function row_getVisibleCells<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(row: Row<TFeatures, TData>): Array<Cell<TFeatures, TData, unknown>> {
  const allCells = row.getAllCells()
  const visibleCells: Array<Cell<TFeatures, TData, unknown>> = []
  for (let i = 0; i < allCells.length; i++) {
    const cell = allCells[i]!
    if (callMemoOrStaticFn(cell.column, 'getIsVisible', column_getIsVisible)) {
      visibleCells.push(cell)
    }
  }

  return orderByColumnPinning(
    row.table,
    visibleCells,
    (cell) => cell.column.id,
    () =>
      callMemoOrStaticFn(
        row,
        'getVisibleCellsByColumnId',
        row_getVisibleCellsByColumnId,
      ),
  )
}

/**
 * Builds a lookup map of this row's visible cells keyed by column id.
 *
 * Hidden columns are omitted from the map.
 *
 * @example
 * ```ts
 * const visibleCellsById = row_getVisibleCellsByColumnId(row)
 * ```
 */
export function row_getVisibleCellsByColumnId<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(row: Row<TFeatures, TData>): Record<string, Cell<TFeatures, TData, unknown>> {
  const result = makeObjectMap<Cell<TFeatures, TData, unknown>>()
  const allCells = row.getAllCells()
  for (let i = 0; i < allCells.length; i++) {
    const cell = allCells[i]!
    if (callMemoOrStaticFn(cell.column, 'getIsVisible', column_getIsVisible)) {
      result[cell.column.id] = cell
    }
  }
  return result
}

/**
 * Filters the flat column list down to visible columns.
 *
 * Parent/group columns are included when `column_getIsVisible` considers them
 * visible.
 *
 * @example
 * ```ts
 * const columns = table_getVisibleFlatColumns(table)
 * ```
 */
export function table_getVisibleFlatColumns<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  return table
    .getAllFlatColumns()
    .filter((column) =>
      callMemoOrStaticFn(column, 'getIsVisible', column_getIsVisible),
    )
}

/**
 * Filters leaf columns down to those currently visible.
 *
 * This is the column list most row rendering code uses before pinning-specific
 * partitioning.
 *
 * @example
 * ```ts
 * const columns = table_getVisibleLeafColumns(table)
 * ```
 */
export function table_getVisibleLeafColumns<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  return table
    .getAllLeafColumns()
    .filter((column) =>
      callMemoOrStaticFn(column, 'getIsVisible', column_getIsVisible),
    )
}

/**
 * Routes a column visibility updater through the table's visibility change handler.
 *
 * The updater may be a next visibility map or a function of the previous map,
 * matching the instance `table.setColumnVisibility` behavior.
 *
 * @example
 * ```ts
 * table_setColumnVisibility(table, (old) => ({ ...old, age: false }))
 * ```
 */
export function table_setColumnVisibility<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(
  table: Table_Internal<TFeatures, TData>,
  updater: Updater<ColumnVisibilityState>,
) {
  setStateSlice(table, 'columnVisibility', updater)
}

/**
 * Routes a group modes updater through the table's group modes change handler.
 *
 * @example
 * ```ts
 * table_setColumnGroupModes(table, (old) => ({
 *   ...old,
 *   scores: { collapsed: true },
 * }))
 * ```
 */
export function table_setColumnGroupModes<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(
  table: Table_Internal<TFeatures, TData>,
  updater: Updater<ColumnGroupModesState>,
) {
  setStateSlice(table, 'columnGroupModes', updater)
}

/**
 * Resets `columnGroupModes` to the configured initial state or feature default.
 *
 * With no argument, the reset clones `table.initialState.columnGroupModes` when
 * it exists. Passing `true` ignores initial state and resets to `{}`.
 *
 * @example
 * ```ts
 * table_resetColumnGroupModes(table)
 * ```
 */
export function table_resetColumnGroupModes<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>, defaultState?: boolean) {
  table_setColumnGroupModes(
    table,
    defaultState
      ? makeObjectMap()
      : Object.assign(
          makeObjectMap<string>(),
          cloneState(table.initialState.columnGroupModes ?? {}),
        ),
  )
}

/**
 * Resets `columnVisibility` to the configured initial state or feature default.
 *
 * With no argument, the reset clones `table.initialState.columnVisibility` when
 * it exists. Passing `true` ignores initial state and resets to `{}`.
 *
 * @example
 * ```ts
 * table_resetColumnVisibility(table)
 * table_resetColumnVisibility(table, true)
 * ```
 */
export function table_resetColumnVisibility<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>, defaultState?: boolean) {
  table_setColumnVisibility(
    table,
    defaultState
      ? makeObjectMap()
      : Object.assign(
          makeObjectMap<boolean>(),
          cloneState(table.initialState.columnVisibility ?? {}),
        ),
  )
}

/**
 * Shows or hides every hideable leaf column.
 *
 * Columns that cannot hide stay visible when toggling all columns off.
 *
 * @example
 * ```ts
 * table_toggleAllColumnsVisible(table)
 * ```
 */
export function table_toggleAllColumnsVisible<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>, value?: boolean) {
  value = value ?? !table_getIsAllColumnsVisible(table)

  const visibility = makeObjectMap<boolean>()
  const leafColumns = table.getAllLeafColumns()
  for (let i = 0; i < leafColumns.length; i++) {
    const column = leafColumns[i]!
    visibility[column.id] = !value ? !column_getCanHide(column) : value
  }

  table_setColumnVisibility(table, visibility)
}

/**
 * Checks whether every leaf column is currently visible.
 *
 * Non-hideable columns are naturally visible because missing visibility entries
 * default to `true`.
 *
 * @example
 * ```ts
 * const allVisible = table_getIsAllColumnsVisible(table)
 * ```
 */
export function table_getIsAllColumnsVisible<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  return !table
    .getAllLeafColumns()
    .some(
      (column) =>
        !callMemoOrStaticFn(column, 'getIsVisible', column_getIsVisible),
    )
}

/**
 * Checks whether at least one leaf column is currently visible.
 *
 * This is useful for tri-state "show all columns" controls.
 *
 * @example
 * ```ts
 * const someVisible = table_getIsSomeColumnsVisible(table)
 * ```
 */
export function table_getIsSomeColumnsVisible<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  return table
    .getAllLeafColumns()
    .some((column) =>
      callMemoOrStaticFn(column, 'getIsVisible', column_getIsVisible),
    )
}

/**
 * Creates a checkbox-style handler that shows or hides all columns.
 *
 * The handler reads `event.target.checked`, so it is intended for controls whose
 * checked state means "all columns visible".
 *
 * @example
 * ```ts
 * const onChange = table_getToggleAllColumnsVisibilityHandler(table)
 * ```
 */
export function table_getToggleAllColumnsVisibilityHandler<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  return (e: unknown) => {
    table_toggleAllColumnsVisible(
      table,
      ((e as MouseEvent).target as HTMLInputElement).checked,
    )
  }
}
