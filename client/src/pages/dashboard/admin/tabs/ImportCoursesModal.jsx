import ImportCsvModal from '../../../../components/ui/ImportCsvModal';

export default function ImportCoursesModal(props) {
  return (
    <ImportCsvModal
      {...props}
      title="Importer des cours (CSV)"
      endpoint="/admin/import/courses"
      helpText={
        <>
          Colonnes attendues : <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">matiere, classe, serie, email_formateur</code>
          <br />La colonne <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">serie</code> peut rester vide pour le collège. <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">email_formateur</code> doit correspondre à un compte formateur existant. Les cours importés sont créés en brouillon.
        </>
      }
      createdHeading={(n) => `${n} cours créé(s)`}
      toastMessage={(n) => `${n} cours importé(s)`}
      renderCreatedItem={(c) => (
        <span className="text-gray-700">{c.title} · {c.classe}{c.serie ? ` · ${c.serie}` : ''} · {c.formateur}</span>
      )}
    />
  );
}
