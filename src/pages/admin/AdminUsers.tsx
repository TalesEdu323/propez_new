import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  ShieldCheck,
  ShieldOff,
  UserCircle2,
  MoreHorizontal,
  Mail,
  KeyRound,
  Trash2,
  Pencil,
} from 'lucide-react';
import AdminPageShell from './AdminPageShell';
import { api } from '../../lib/apiClient';
import { toast, confirmAction } from '../../lib/feedback';
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

type ActionModal =
  | { type: 'edit-email'; user: AdminUser }
  | { type: 'delete'; user: AdminUser }
  | null;

export default function AdminUsers({ navigate }: { navigate: NavigateFn }) {
  const session = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [modal, setModal] = useState<ActionModal>(null);
  const [editEmail, setEditEmail] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const toggleAdmin = async (user: AdminUser) => {
    if (toggling) return;
    const nextValue = !user.isPlatformAdmin;
    if (session?.user.id === user.id && !nextValue) {
      toast.warning('Você não pode remover a si mesmo da lista de platform admins.');
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
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar usuário');
    } finally {
      setToggling(null);
    }
  };

  const sendPasswordReset = async (user: AdminUser) => {
    setOpenMenuId(null);
    setActionLoading(user.id);
    try {
      await api.post(`/api/admin/users/${user.id}/send-password-reset`, {});
      toast.success(`E-mail de redefinição de senha enviado para ${user.email}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar e-mail');
    } finally {
      setActionLoading(null);
    }
  };

  const sendVerification = async (user: AdminUser) => {
    setOpenMenuId(null);
    setActionLoading(user.id);
    try {
      const res = await api.post<{ sent?: boolean; alreadyVerified?: boolean }>(
        `/api/admin/users/${user.id}/send-verification`,
        {},
      );
      if (res.alreadyVerified) {
        toast.warning('Este usuário já tem e-mail verificado.');
      } else {
        toast.success(`E-mail de verificação enviado para ${user.email}.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar verificação');
    } finally {
      setActionLoading(null);
    }
  };

  const openEditEmail = (user: AdminUser) => {
    setOpenMenuId(null);
    setEditEmail(user.email);
    setModal({ type: 'edit-email', user });
  };

  const saveEmail = async () => {
    if (!modal || modal.type !== 'edit-email') return;
    const trimmed = editEmail.trim().toLowerCase();
    if (!trimmed) return;
    setActionLoading(modal.user.id);
    try {
      await api.patch(`/api/admin/users/${modal.user.id}`, { email: trimmed });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === modal.user.id
            ? { ...u, email: trimmed, emailVerifiedAt: null }
            : u,
        ),
      );
      setModal(null);
      toast.success('E-mail atualizado com sucesso.');
      const sendVerify = await confirmAction({
        title: 'Enviar e-mail de verificação?',
        description: 'O e-mail foi atualizado. Deseja enviar a verificação agora?',
        confirmLabel: 'Enviar verificação',
        cancelLabel: 'Agora não',
      });
      if (sendVerify) {
        await sendVerification({ ...modal.user, email: trimmed });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar e-mail');
    } finally {
      setActionLoading(null);
    }
  };

  const openDelete = (user: AdminUser) => {
    setOpenMenuId(null);
    setDeleteConfirm('');
    setModal({ type: 'delete', user });
  };

  const confirmDelete = async () => {
    if (!modal || modal.type !== 'delete') return;
    if (deleteConfirm.trim().toLowerCase() !== modal.user.email.toLowerCase()) {
      toast.warning('Digite o e-mail do usuário exatamente como aparece na lista.');
      return;
    }
    setActionLoading(modal.user.id);
    try {
      await api.delete(`/api/admin/users/${modal.user.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== modal.user.id));
      setModal(null);
      toast.success('Usuário excluído.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir usuário');
    } finally {
      setActionLoading(null);
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
                  <th className="text-right font-semibold px-5 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
                {filtered.map((u) => {
                  const isSelf = session?.user.id === u.id;
                  const busy = actionLoading === u.id;
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
                      <td className="px-5 py-3.5 text-right relative">
                        <div ref={openMenuId === u.id ? menuRef : undefined} className="inline-block">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId((prev) => (prev === u.id ? null : u.id));
                            }}
                            className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 disabled:opacity-50"
                            aria-label="Ações"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {openMenuId === u.id && (
                            <div className="absolute right-5 top-full mt-1 z-20 min-w-[200px] bg-white border border-black/5 rounded-xl shadow-lg py-1 text-left">
                              <button
                                type="button"
                                onClick={() => openEditEmail(u)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Editar e-mail
                              </button>
                              <button
                                type="button"
                                onClick={() => void sendPasswordReset(u)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50"
                              >
                                <KeyRound className="w-3.5 h-3.5" /> Enviar reset de senha
                              </button>
                              <button
                                type="button"
                                disabled={!!u.emailVerifiedAt}
                                onClick={() => void sendVerification(u)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-40"
                              >
                                <Mail className="w-3.5 h-3.5" /> Enviar verificação
                              </button>
                              {!isSelf && (
                                <button
                                  type="button"
                                  onClick={() => openDelete(u)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Excluir usuário
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal?.type === 'edit-email' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="apple-card p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-zinc-900 mb-1">Editar e-mail</h3>
            <p className="text-sm text-zinc-500 mb-4">{modal.user.name}</p>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-black/5 rounded-xl text-sm bg-zinc-50 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm font-semibold text-zinc-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading === modal.user.id}
                onClick={() => void saveEmail()}
                className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {modal?.type === 'delete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="apple-card p-6 w-full max-w-md border border-red-100">
            <h3 className="text-lg font-bold text-red-700 mb-1">Excluir usuário</h3>
            <p className="text-sm text-zinc-600 mb-4">
              Esta ação é irreversível. Digite <strong>{modal.user.email}</strong> para confirmar.
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="E-mail do usuário"
              className="w-full px-3 py-2.5 border border-black/5 rounded-xl text-sm bg-zinc-50 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm font-semibold text-zinc-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading === modal.user.id}
                onClick={() => void confirmDelete()}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
