import { useNavigate, useOutletContext } from 'react-router-dom';
import SchoolSettingsForm from '../../../components/shared/SchoolSettingsForm';

export default function SchoolStep() {
  const navigate = useNavigate();
  const { refetchStatus } = useOutletContext();

  return (
    <SchoolSettingsForm
      dashboardButton
      onSaved={(wasCreate) => {
        refetchStatus();
        if (wasCreate) navigate('/onboarding/academic-year');
      }}
    />
  );
}
