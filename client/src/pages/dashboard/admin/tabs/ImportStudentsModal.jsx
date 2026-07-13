import ImportCsvModal from '../../../../components/ui/ImportCsvModal';

export default function ImportStudentsModal(props) {
  return (
    <ImportCsvModal
      {...props}
      title="Importer des élèves (CSV)"
      endpoint="/admin/import/students"
      accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      helpText={
        <>
          Colonnes attendues : <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">nom, prenom, email, mot_de_passe, classe, serie, matricule, telephone, genre, date_naissance</code>
          <br />Seules <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">nom</code> et <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">email</code> sont obligatoires (avec <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">classe</code>, et <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">serie</code> pour le lycée). La classe doit déjà exister dans l'onglet Classes. Fichier CSV ou Excel (.xlsx).
        </>
      }
      createdHeading={(n) => `${n} élève(s) créé(s)`}
      toastMessage={(n) => `${n} élève(s) importé(s)`}
      renderCreatedItem={(c) => (
        <>
          <span className="text-gray-700">{c.name} · {c.email}</span>
          <code className="bg-white px-1.5 py-0.5 rounded border border-success/30">{c.tempPassword}</code>
        </>
      )}
    />
  );
}
