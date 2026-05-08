import { whatsappUrl } from '../../lib/contact/whatsapp';

interface Props {
  value: number[];
  onChange: (next: number[]) => void;
}

const MAX = 10;

export function DependentesInput({ value, onChange }: Props) {
  const atLimit = value.length >= MAX;

  function add() {
    if (atLimit) return;
    onChange([...value, 0]);
  }

  function update(idx: number, idade: number) {
    const next = [...value];
    next[idx] = idade;
    onChange(next);
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      {value.map((idade, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <label className="text-sm text-gray-700 w-28">Dependente {idx + 1} — idade</label>
          <input
            type="number"
            min={0}
            max={120}
            value={idade}
            onChange={(e) => update(idx, parseInt(e.target.value || '0', 10))}
            className="border border-gray-300 rounded-lg px-3 py-1 w-20 focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => remove(idx)}
            className="text-red-600 text-sm hover:underline"
          >
            Remover
          </button>
        </div>
      ))}
      {!atLimit ? (
        <button
          type="button"
          onClick={add}
          className="text-blue-600 text-sm hover:underline"
        >
          + Adicionar dependente
        </button>
      ) : (
        <p className="text-sm text-gray-500">
          Limite de 10 dependentes nesta etapa. Para mais,{' '}
          <a
            href={whatsappUrl('duvida_geral')}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            fale comigo no WhatsApp
          </a>.
        </p>
      )}
    </div>
  );
}
