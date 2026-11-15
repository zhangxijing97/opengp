import type { ResultTableVM } from '../../lib/home/results-model';

// The result table of a session page. Plain, built from tokens: the design has no session page. TODO(design)
export function ResultsTable({ table }: { table: ResultTableVM }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left">
        <thead>
          <tr className="text-table-head text-text-tertiary">
            <th scope="col" className="py-2 pr-3 font-semibold">
              POS
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              DRIVER
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              TEAM
            </th>
            {table.headers.map((header) => (
              <th key={header} scope="col" className="py-2 pl-3 text-right font-semibold">
                {header.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.key} className="border-t border-border-separator">
              <td className="text-table-pos py-2 pr-3">{row.position}</td>
              <td className="text-row-result-name py-2 pr-3">{row.driver}</td>
              <td className="text-row-result-name py-2 pr-3 text-text-secondary">{row.team}</td>
              {row.cells.map((cell, index) => (
                <td key={table.headers[index]} className="text-table-stat py-2 pl-3 text-right">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
