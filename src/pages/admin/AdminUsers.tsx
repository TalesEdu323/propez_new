import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, ShieldOff, UserCircle2 } from 'lucide-react';
import AdminPageShell from './AdminPageShell';
import { api } from '../../lib/apiClient';
import { formatDateBR } from '../../lib/format';
import { useSession } from '../../lib/authSession';
import type { NavigateFn } from '../../types/navigation';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  isPlatformAdmin: boolean;
  createdAt: string;
  orgCount: number;
}

export default function AdminUsers({ navigate }: { navigate: NavigateFn }) {
  const session = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.get<AdminUser[]>('/api/admin/users');
      setUsers(data);
    } catch (err) {
      console.error('[admin/users] erro:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const toggleAdmin = async (user: AdminUser) => {
    if (toggling) return;
    const nextValue = !user.isPlatformAdmin;
    if (session?.user.id === user.id && !nextValue) {
      alert('Você não pode remover a si mesmo da lista de platform admins.');
      return;
    }
    setToggling(user.id);
    try {
      await api.patch(`/api/admin/users/${user.id}`, { isPlatformAdmin: nextValue });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isPlatformAdmin: nextValue } : u)),
      );
    } catch (err) {
      console.error('[admin/users/toggle] erro:', err);
      alert(err instanceof Error ? err.message : 'Erro ao atualizar usuário');
    } finally {
      setToggling(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, query]);

  const adminCount = users.filter((u) => u.isPlatformAdmin).length;

  return (
    <AdminPageShell
      navigate={navigate}
      current="admin-users"
      title="Usuários"
      subtitle={`${users.length} usuários • ${adminCount} platform admin${adminCount === 1 ? '' : 's'}`}
      onRefresh={handleRefresh}
      refreshing={refreshing}
    >
      <div className="apple-card p-4 md:p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail…"
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>
      </div>

      {loading && (
        <div className="apple-card p-12 flex items-center justify-center text-zinc-500">
          Carregando usuários…
        </div>
      )}

      {error && !loading && (
        <div className="apple-card p-6 border border-red-100 bg-red-50/40 text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="apple-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50/60 text-zinc-500 text-[11px] uppercase tracking-wider">
                  <th className="text-left font-semibold px-5 py-3">Usuário</th>
                  <th className="text-left font-semibold px-5 py-3">E-mail</th>
                  <th className="text-right font-semibold px-5 py-3">Orgs</th>
                  <th className="text-left font-semibold px-5 py-3">Último login</th>
                  <th className="text-left font-semibold px-5 py-3">Criado em</th>
                  <th className="text-right font-semibold px-5 py-3">Admin?</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
                {filtered.map((u) => {
                  const isSelf = session?.user.id === u.id;
                  return (
                    <tr key={u.id} className="border-t border-black/[0.04] hover:bg-zinc-50/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500">
                            <UserCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900">{u.name}</div>
                            {u.emailVerifiedAt ? (
                              <div className="text-[10px] text-green-600 font-bold uppercase tracking-wider mt-0.5">
                                Verificado
                              </div>
                            ) : (
                              <div className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-0.5">
                                Não verificado
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-700">{u.email}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">{u.orgCount}</td>
                      <td className="px-5 py-3.5 text-zinc-500">
                        {u.lastLoginAt ? formatDateBR(u.lastLoginAt, 'datetime') : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500">
                        {formatDateBR(u.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => toggleAdmin(u)}
                          disabled={toggling === u.id || (isSelf && u.isPlatformAdmin)}
                          title={
                            isSelf && u.isPlatformAdmin
                              ? 'Você não pode rebaixar a si mesmo'
                              : undefined
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
                            u.isPlatformAdmin
                              ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                              : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                          }`}
                        >
                          {u.isPlatformAdmin ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" /> Admin
                            </>
                          ) : (
                            <>
                              <ShieldOff className="w-3.5 h-3.5" /> Não
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
