import { useNavigate, useOutletContext } from 'react-router-dom';
import Button from '../../components/ui/Button';

// Précédent/Suivant footer shared by every optional wizard step (all skippable —
// only the École step, which doesn't use this, is a hard gate).
export default function StepNav() {
  const navigate = useNavigate();
  const { currentIndex, steps } = useOutletContext();
  const prev = steps[currentIndex - 1];
  const next = steps[currentIndex + 1];

  return (
    <div className="flex justify-between pt-6 mt-6 border-t border-gray-100">
      <Button type="button" variant="secondary" disabled={!prev} onClick={() => prev && navigate(`/onboarding/${prev.path}`)}>
        Précédent
      </Button>
      {next ? (
        <Button type="button" onClick={() => navigate(`/onboarding/${next.path}`)}>Suivant</Button>
      ) : (
        <Button type="button" onClick={() => navigate('/admin')}>Terminer</Button>
      )}
    </div>
  );
}
