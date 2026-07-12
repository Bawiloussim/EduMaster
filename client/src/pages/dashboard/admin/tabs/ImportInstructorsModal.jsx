import ImportCsvModal from '../../../../components/ui/ImportCsvModal';

export default function ImportInstructorsModal(props) {
  return (
    <ImportCsvModal
      {...props}
      title="Importer des formateurs (CSV)"
      endpoint="/admin/import/instructors"
      helpText={
        <>
          Colonnes attendues : <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">nom, email</code>
        </>
      }
      createdHeading={(n) => `${n} formateur(s) créé(s)`}
      toastMessage={(n) => `${n} formateur(s) importé(s)`}
      renderCreatedItem={(c) => (
        <>
          <span className="text-gray-700">{c.name} · {c.email}</span>
          <code className="bg-white px-1.5 py-0.5 rounded border border-green-200">{c.tempPassword}</code>
        </>
      )}
    />
  );
}
