import { describe, expect, it } from 'vitest'
import { ColumnDef, createTable, getCoreRowModel } from '../src'

type Person = {
  firstName: string
  lastName: string
}

describe('CoreTable', () => {
  it('refreshes the column lookup cache when columns change without data changing', () => {
    const data: Person[] = [{ firstName: 'Ada', lastName: 'Lovelace' }]
    const firstNameColumns: ColumnDef<Person>[] = [
      {
        id: 'name',
        accessorFn: row => row.firstName,
      },
    ]
    const lastNameColumns: ColumnDef<Person>[] = [
      {
        id: 'name',
        accessorFn: row => row.lastName,
      },
    ]

    const table = createTable<Person>({
      onStateChange() {},
      renderFallbackValue: '',
      data,
      state: {},
      columns: firstNameColumns,
      getCoreRowModel: getCoreRowModel(),
    })

    const firstColumn = table.getColumn('name')
    const row = table.getCoreRowModel().rows[0]!

    expect(row.getValue('name')).toBe('Ada')

    table.setOptions(old => ({
      ...old,
      columns: lastNameColumns,
    }))

    expect(table.getCoreRowModel().rows[0]).toBe(row)
    expect(table.getColumn('name')).not.toBe(firstColumn)
    expect(row.getValue('name')).toBe('Lovelace')
  })
})
