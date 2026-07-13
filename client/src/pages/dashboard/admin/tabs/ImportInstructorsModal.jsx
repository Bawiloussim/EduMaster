import ImportCsvModal from '../../../../components/ui/ImportCsvModal';

export default function ImportInstructorsModal(props) {
  return (
    <ImportCsvModal
      {...props}
      title="Importer des formateurs (CSV)"
      endpoint="/admin/import/instructors"
      accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      helpText={
        <>
          Colonnes attendues : <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">nom, prenom, email, mot_de_passe, telephone, genre</code>
          <br />Seules <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">nom</code> et <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">email</code> sont obligatoires. Fichier CSV ou Excel (.xlsx).
        </>
      }
      createdHeading={(n) => `${n} formateur(s) créé(s)`}
      toastMessage={(n) => `${n} formateur(s) importé(s)`}
      renderCreatedItem={(c) => (
        <>
          <span className="text-gray-700">{c.name} · {c.email}</span>
          <code className="bg-white px-1.5 py-0.5 rounded border border-success/30">{c.tempPassword}</code>
        </>
      )}
    />
  );
}
