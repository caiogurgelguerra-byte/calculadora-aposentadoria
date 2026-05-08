interface Props { onRetry: () => void }

export function ConnectionErrorScreen({ onRetry }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <h1 tabIndex={-1} className="text-2xl font-semibold text-gray-900 mb-2">
          Erro de conexão
        </h1>
        <p className="text-gray-600 mb-4">
          Não conseguimos carregar seus dados. Verifique sua internet e tente novamente.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
