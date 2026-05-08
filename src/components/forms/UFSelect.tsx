import { forwardRef, type SelectHTMLAttributes } from 'react';

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR',
  'PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

export const UFSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function UFSelect(props, ref) {
    return (
      <select
        ref={ref}
        {...props}
        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
      >
        <option value="">UF</option>
        {UFS.map((uf) => (
          <option key={uf} value={uf}>{uf}</option>
        ))}
      </select>
    );
  },
);
