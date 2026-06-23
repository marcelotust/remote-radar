export const SettingsPage = () => (
  <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-8">
    <section className="rounded-3xl border-2 border-brand-green/20 bg-brand-surface p-6 flex flex-col gap-3">
      <h2 className="text-white font-semibold text-base">Cálculo de score</h2>
      <p className="text-sm text-gray-400">
        Edição das palavras-chave positivas e negativas. Em breve (#43).
      </p>
      <textarea
        disabled
        aria-label="Palavras-chave positivas"
        placeholder="Palavras-chave positivas"
        className="rounded-2xl border-2 border-brand-gray/30 bg-transparent px-4 py-2 text-sm text-gray-400 disabled:opacity-50"
      />
      <textarea
        disabled
        aria-label="Palavras-chave negativas"
        placeholder="Palavras-chave negativas"
        className="rounded-2xl border-2 border-brand-gray/30 bg-transparent px-4 py-2 text-sm text-gray-400 disabled:opacity-50"
      />
    </section>

    <section className="rounded-3xl border-2 border-brand-green/20 bg-brand-surface p-6 flex flex-col gap-3">
      <h2 className="text-white font-semibold text-base">Tema</h2>
      <p className="text-sm text-gray-400">Seletor de tema. Em breve (#44).</p>
      <fieldset disabled className="flex gap-4 text-sm text-gray-400">
        <label className="flex items-center gap-2">
          <input type="radio" name="theme" value="light" /> Claro
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="theme" value="dark" defaultChecked /> Escuro
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="theme" value="system" /> Sistema
        </label>
      </fieldset>
    </section>
  </main>
)
