import {
  assignPrototypeAPIs,
  assignTableAPIs,
  makeStateUpdater,
} from '../../utils'
import {
  column_getCanHide,
  column_getGroupMode,
  column_getIsHiddenByGroupMode,
  column_getIsVisible,
  column_getToggleVisibilityHandler,
  column_setGroupMode,
  column_toggleVisibility,
  getDefaultColumnGroupModesState,
  getDefaultColumnVisibilityState,
  row_getVisibleCells,
  row_getVisibleCellsByColumnId,
  table_getIsAllColumnsVisible,
  table_getIsSomeColumnsVisible,
  table_getToggleAllColumnsVisibilityHandler,
  table_getVisibleFlatColumns,
  table_getVisibleLeafColumns,
  table_resetColumnGroupModes,
  table_resetColumnVisibility,
  table_setColumnGroupModes,
  table_setColumnVisibility,
  table_toggleAllColumnsVisible,
} from './columnVisibilityFeature.utils'
import type { TableFeature } from '../../types/TableFeatures'

/**
 * Feature that adds column visibility state and APIs for hiding and showing columns.
 */
export const columnVisibilityFeature: TableFeature = {
  getInitialState: (initialState) => {
    return {
      columnVisibility: getDefaultColumnVisibilityState(),
      columnGroupModes: getDefaultColumnGroupModesState(),
      ...initialState,
    }
  },

  getDefaultTableOptions: (table) => {
    return {
      onColumnVisibilityChange: makeStateUpdater('columnVisibility', table),
      onColumnGroupModesChange: makeStateUpdater('columnGroupModes', table),
    }
  },

  assignColumnPrototype: (prototype, table) => {
    assignPrototypeAPIs('columnVisibilityFeature', prototype, table, {
      column_getIsVisible: {
        fn: (column) => column_getIsVisible(column),
        memoDeps: (column) => [
          table.options.columns,
          table.atoms.columnVisibility?.get(),
          table.atoms.columnGroupModes?.get(),
          column.columns,
        ],
      },
      column_getCanHide: {
        fn: (column) => column_getCanHide(column),
      },
      column_getGroupMode: {
        fn: (column) => column_getGroupMode(column),
      },
      column_getIsHiddenByGroupMode: {
        fn: (column) => column_getIsHiddenByGroupMode(column),
      },
      column_setGroupMode: {
        fn: (column, mode) => column_setGroupMode(column, mode),
      },
      column_getToggleVisibilityHandler: {
        fn: (column) => column_getToggleVisibilityHandler(column),
      },
      column_toggleVisibility: {
        fn: (column, visible) => column_toggleVisibility(column, visible),
      },
    })
  },

  assignRowPrototype: (prototype, table) => {
    assignPrototypeAPIs('columnVisibilityFeature', prototype, table, {
      row_getVisibleCells: {
        fn: (row) => row_getVisibleCells(row),
        memoDeps: (row) => [
          row.getAllCells(),
          table.atoms.columnPinning?.get(),
          table.atoms.columnVisibility?.get(),
          table.atoms.columnGroupModes?.get(),
        ],
      },
      row_getVisibleCellsByColumnId: {
        fn: (row) => row_getVisibleCellsByColumnId(row),
        memoDeps: (row) => [
          row.getAllCells(),
          table.atoms.columnVisibility?.get(),
          table.atoms.columnGroupModes?.get(),
        ],
      },
    })
  },

  constructTableAPIs: (table) => {
    assignTableAPIs('columnVisibilityFeature', table, {
      table_getVisibleFlatColumns: {
        fn: () => table_getVisibleFlatColumns(table),
        memoDeps: () => [
          table.atoms.columnVisibility?.get(),
          table.atoms.columnGroupModes?.get(),
          table.atoms.columnOrder?.get(),
          table.atoms.grouping?.get(),
          table.options.columns,
          table.options.groupedColumnMode,
        ],
      },
      table_getVisibleLeafColumns: {
        fn: () => table_getVisibleLeafColumns(table),
        memoDeps: () => [
          table.atoms.columnVisibility?.get(),
          table.atoms.columnGroupModes?.get(),
          table.atoms.columnOrder?.get(),
          table.atoms.grouping?.get(),
          table.options.columns,
          table.options.groupedColumnMode,
        ],
      },
      table_setColumnVisibility: {
        fn: (updater) => table_setColumnVisibility(table, updater),
      },
      table_resetColumnVisibility: {
        fn: (defaultState) => table_resetColumnVisibility(table, defaultState),
      },
      table_setColumnGroupModes: {
        fn: (updater) => table_setColumnGroupModes(table, updater),
      },
      table_resetColumnGroupModes: {
        fn: (defaultState) => table_resetColumnGroupModes(table, defaultState),
      },
      table_toggleAllColumnsVisible: {
        fn: (value) => table_toggleAllColumnsVisible(table, value),
      },
      table_getIsAllColumnsVisible: {
        fn: () => table_getIsAllColumnsVisible(table),
      },
      table_getIsSomeColumnsVisible: {
        fn: () => table_getIsSomeColumnsVisible(table),
      },
      table_getToggleAllColumnsVisibilityHandler: {
        fn: () => table_getToggleAllColumnsVisibilityHandler(table),
      },
    })
  },
}
