import ImportCsvModal from '../../../../components/ui/ImportCsvModal';

export default function ImportStudentsModal(props) {
  return (
    <ImportCsvModal
      {...props}
      title="Importer des élèves (CSV)"
      endpoint="/admin/import/students"
      helpText={
        <>
          Colonnes attendues : <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">nom, email, classe, serie</code>
          <br />La colonne <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">serie</code> peut rester vide pour les classes de collège (6ème à 3ème) — elle n'est requise que pour le lycée (Seconde à Terminale).
        </>
      }
      createdHeading={(n) => `${n} élève(s) créé(s)`}
      toastMessage={(n) => `${n} élève(s) importé(s)`}
      renderCreatedItem={(c) => (
        <>
          <span className="text-gray-700">{c.name} · {c.email}</span>
          <code className="bg-white px-1.5 py-0.5 rounded border border-green-200">{c.tempPassword}</code>
        </>
      )}
    />
  );
}
