/**
 * Componente per visualizzare la data corrente
 * Da usare in cima a ogni pagina per coerenza UI
 */
export default function DateHeader() {
  const oggi = new Date();
  const opzioniData = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  };
  const dataFormattata = oggi.toLocaleDateString('it-IT', opzioniData);
  // Prima lettera maiuscola
  const dataCapitalizzata = dataFormattata.charAt(0).toUpperCase() + dataFormattata.slice(1);

  return (
    <div className="mb-2 text-sm text-slate-500">
      {dataCapitalizzata}
    </div>
  );
}