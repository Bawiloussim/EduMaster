import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import api from '../services/api';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import PageWrapper from '../components/layout/PageWrapper';

export default function Notifications() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
  });

  const readAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const notifications = data?.data || [];

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {data?.unreadCount > 0 && (
            <Button variant="ghost" size="sm" loading={readAllMutation.isPending} onClick={() => readAllMutation.mutate()}>
              <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
            </Button>
          )}
        </div>

        {isLoading ? <Spinner className="py-20" /> : notifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Aucune notification</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n._id} className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-colors ${!n.read ? 'border-brand/25 bg-brand/10' : 'border-gray-100'}`}>
                <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${!n.read ? 'bg-brand/100' : 'bg-transparent'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{n.title}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{n.message}</div>
                  <div className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
