import type { OnChangeFn, RowData, Updater } from '../../types/type-utils'
import type { TableFeatures } from '../../types/TableFeatures'
import type { Cell } from '../../types/Cell'
import type { Column } from '../../types/Column'

export type ColumnVisibilityState = Record<string, boolean>

/**
 * The mode each group column is in, keyed by group column id. A group without
 * an entry shows all of its leaf columns.
 */
export type ColumnGroupModesState = Record<string, string>

export interface TableState_ColumnVisibility {
  columnVisibility: ColumnVisibilityState
  /**
   * The mode each group column is in. Which leaf columns a mode shows is set by
   * the group's `columnDef.groupModes`. Kept apart from `columnVisibility`, so
   * changing a group's mode never touches the visibility users have chosen.
   */
  columnGroupModes: ColumnGroupModesState
}

export interface TableOptions_ColumnVisibility {
  /**
   * Whether to enable column hiding. Defaults to `true`.
   */
  enableHiding?: boolean
  /**
   * Called with an updater when column visibility state changes. Pair this with
   * `state.columnVisibility` when using external state; external atoms can own
   * the slice without this callback.
   */
  onColumnVisibilityChange?: OnChangeFn<ColumnVisibilityState>
  /**
   * Called with an updater when the group modes change. Pair this with
   * `state.columnGroupModes` when using external state; external atoms can own
   * the slice without this callback.
   */
  onColumnGroupModesChange?: OnChangeFn<ColumnGroupModesState>
}

export type VisibilityDefaultOptions = Pick<
  TableOptions_ColumnVisibility,
  'onColumnVisibilityChange' | 'onColumnGroupModesChange'
>

export interface Table_ColumnVisibility<
  in out TFeatures extends TableFeatures,
  in out TData extends RowData,
> {
  /**
   * Checks whether every leaf column is currently visible.
   */
  getIsAllColumnsVisible: () => boolean
  /**
   * Checks whether at least one leaf column is currently visible.
   */
  getIsSomeColumnsVisible: () => boolean
  /**
   * Creates a checkbox-style handler that shows or hides all columns.
   */
  getToggleAllColumnsVisibilityHandler: () => (event: unknown) => void
  /**
   * Lists visible columns in flat table order, including parent columns that
   * have visible descendants.
   */
  getVisibleFlatColumns: () => Array<Column<TFeatures, TData, unknown>>
  /**
   * Lists visible leaf columns in the order used for row cells and headers.
   */
  getVisibleLeafColumns: () => Array<Column<TFeatures, TData, unknown>>
  /**
   * Resets `columnVisibility` to `initialState.columnVisibility`.
   *
   * Pass `true` to ignore initial state and reset to `{}`.
   */
  resetColumnVisibility: (defaultState?: boolean) => void
  /**
   * Resets `columnGroupModes` to `initialState.columnGroupModes`.
   *
   * Pass `true` to ignore initial state and reset to `{}`.
   */
  resetColumnGroupModes: (defaultState?: boolean) => void
  /**
   * Updates column visibility state with a next map or updater function.
   */
  setColumnVisibility: (updater: Updater<ColumnVisibilityState>) => void
  /**
   * Updates the group modes with a next map or updater function.
   */
  setColumnGroupModes: (updater: Updater<ColumnGroupModesState>) => void
  /**
   * Toggles the visibility of all columns.
   */
  toggleAllColumnsVisible: (value?: boolean) => void
}

export interface ColumnDef_ColumnVisibility {
  /**
   * Allows this column to be hidden. Defaults to `true`.
   */
  enableHiding?: boolean
  /**
   * For group columns: the modes the group can be put in, each with the ids of
   * the leaf columns the group shows while in it. Its other leaf columns are
   * hidden, on top of `columnVisibility`. A group in a mode that is not listed
   * here, or in no mode, shows all of its leaf columns.
   *
   * @example
   * ```ts
   * columnHelper.group({
   *   id: 'scores',
   *   columns: [math, physics, total],
   *   groupModes: { collapsed: ['total'] },
   * })
   * ```
   */
  groupModes?: Record<string, Array<string>>
}

export interface Row_ColumnVisibility<
  in out TFeatures extends TableFeatures,
  in out TData extends RowData,
> {
  /**
   * Gets this row's cells for currently visible columns.
   */
  getVisibleCells: () => Array<Cell<TFeatures, TData, unknown>>
  /**
   * Maps this row's currently visible cells by column id.
   */
  getVisibleCellsByColumnId: () => Record<
    string,
    Cell<TFeatures, TData, unknown>
  >
}

export interface Column_ColumnVisibility {
  /**
   * Checks whether this column is allowed to be hidden.
   */
  getCanHide: () => boolean
  /**
   * Gets the mode this group column is in, if any.
   */
  getGroupMode: () => string | undefined
  /**
   * Checks whether the mode of a group this column sits in hides it, whatever
   * `columnVisibility` says. A group column counts as hidden when all of its
   * leaf columns are.
   */
  getIsHiddenByGroupMode: () => boolean
  /**
   * Checks whether this column is currently visible: shown by
   * `columnVisibility` and not hidden by the mode of a group it sits in.
   */
  getIsVisible: () => boolean
  /**
   * Puts this group column in a mode from its `columnDef.groupModes`, or back to
   * showing all of its leaf columns with `undefined`.
   */
  setGroupMode: (mode: string | undefined) => void
  /**
   * Creates a checkbox-style handler that toggles this column's visibility.
   */
  getToggleVisibilityHandler: () => (event: unknown) => void
  /**
   * Toggles the visibility of the column.
   */
  toggleVisibility: (value?: boolean) => void
}
