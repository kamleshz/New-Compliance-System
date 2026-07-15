import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlertTriangle as AlertTriangle,
  FiBriefcase as Building2,
  FiEdit3 as Edit3,
  FiEye as Eye,
  FiLoader as Loader2,
  FiPlus as Plus,
  FiRefreshCw as RefreshCw,
  FiSearch as Search,
  FiShield as ShieldCheck,
  FiTrash2 as Trash2,
  FiUpload as Upload,
  FiUser as UserRound,
  FiUsers as UsersIcon,
  FiX as X,
} from 'react-icons/fi';
import api from '../services/api.js';

const emptyUserForm = {
  name: '',
  email: '',
  password: '',
  roleId: '',
  teamId: '',
  managerId: '',
  operationHeadId: '',
  isActive: true,
  avatarUrl: '',
};

const emptyTeamForm = {
  teamName: '',
  description: '',
  managerId: '',
  operationHeadId: '',
  members: [],
};

const allowedRoleNames = ['Admin', 'Operation', 'Manager', 'Compliance', 'Account', 'Super Admin'];

function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [filters, setFilters] = useState({ search: '', roleId: '', teamId: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userModalMode, setUserModalMode] = useState(null);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [teamForm, setTeamForm] = useState(emptyTeamForm);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchPageData();
  }, []);

  const fetchPageData = async () => {
    try {
      setLoading(true);
      const [usersResponse, rolesResponse, teamsResponse] = await Promise.all([
        api.get('/users', { params: { limit: 500 } }),
        api.get('/roles'),
        api.get('/departments'),
      ]);
      setUsers(usersResponse.data.items || []);
      setRoles(normalizeItems(rolesResponse.data)
        .filter((role) => allowedRoleNames.includes(role.roleName))
        .sort((a, b) => allowedRoleNames.indexOf(a.roleName) - allowedRoleNames.indexOf(b.roleName)));
      setTeams(normalizeItems(teamsResponse.data));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load User Master data.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return users.filter((user) => {
      const userStatus = getUserStatus(user);
      const teamId = getId(user.teamId || user.departmentId);
      const matchesSearch = !term || [
        user.name,
        user.email,
        user.employeeCode,
        user.roleId?.roleName,
        user.teamName,
        user.departmentId?.departmentName,
        user.managerId?.name,
        user.operationHeadId?.name,
      ].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      return matchesSearch
        && (!filters.roleId || getId(user.roleId) === filters.roleId)
        && (!filters.teamId || teamId === filters.teamId)
        && (!filters.status || userStatus === filters.status);
    });
  }, [filters, users]);

  const openCreateUser = () => {
    setSelectedUser(null);
    setUserForm({
      ...emptyUserForm,
      roleId: roles[0]?._id || '',
    });
    setFormError('');
    setUserModalMode('create');
  };

  const openViewUser = (user) => {
    setSelectedUser(user);
    setUserForm(getFormFromUser(user));
    setFormError('');
    setUserModalMode('view');
  };

  const openEditUser = (user) => {
    setSelectedUser(user);
    setUserForm({ ...getFormFromUser(user), password: '' });
    setFormError('');
    setUserModalMode('edit');
  };

  const openCreateTeam = () => {
    setTeamForm(emptyTeamForm);
    setFormError('');
    setTeamModalOpen(true);
  };

  const closeModals = () => {
    setUserModalMode(null);
    setTeamModalOpen(false);
    setSelectedUser(null);
    setUserForm(emptyUserForm);
    setTeamForm(emptyTeamForm);
    setFormError('');
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleUserChange = (event) => {
    const { name, value, type, checked } = event.target;
    setUserForm((current) => {
      const next = { ...current, [name]: type === 'checkbox' ? checked : value };
      if (name === 'teamId') {
        const team = teams.find((item) => item._id === value);
        next.managerId = getId(team?.manager) || '';
        next.operationHeadId = getId(team?.operationHead) || '';
      }
      return next;
    });
  };

  const handleTeamChange = (event) => {
    const { name, value, selectedOptions } = event.target;
    setTeamForm((current) => ({
      ...current,
      [name]: name === 'members' ? Array.from(selectedOptions).map((option) => option.value) : value,
    }));
  };

  const uploadAvatar = (dataUrl) => {
    setUserForm((current) => ({ ...current, avatarUrl: dataUrl }));
  };

  const saveUser = async (event) => {
    event.preventDefault();
    setFormError('');
    const validation = validateUserForm(userForm, userModalMode);
    if (validation) {
      setFormError(validation);
      return;
    }

    const role = roles.find((item) => item._id === userForm.roleId);
    const team = teams.find((item) => item._id === userForm.teamId);
    const payload = {
      name: normalizeName(userForm.name),
      email: userForm.email.trim().toLowerCase(),
      password: userForm.password,
      roleId: userForm.roleId,
      designation: role?.roleName || 'User',
      avatarUrl: userForm.avatarUrl,
      isActive: userForm.isActive,
      status: userForm.isActive ? 'active' : 'inactive',
    };
    if (userForm.teamId) {
      payload.teamId = userForm.teamId;
      payload.departmentId = userForm.teamId;
      payload.teamName = team?.departmentName || '';
    }
    if (userForm.managerId) payload.managerId = userForm.managerId;
    if (userForm.operationHeadId) payload.operationHeadId = userForm.operationHeadId;

    if (!payload.password) delete payload.password;
    if (userModalMode === 'create') payload.employeeCode = `USR${Date.now()}`;

    try {
      setSaving(true);
      if (userModalMode === 'edit' && selectedUser?._id) {
        await api.put(`/users/${selectedUser._id}`, payload);
        setSuccess('User updated successfully.');
      } else {
        await api.post('/users', payload);
        setSuccess('User created successfully.');
      }
      await fetchPageData();
      closeModals();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to save user.');
    } finally {
      setSaving(false);
    }
  };

  const saveTeam = async (event) => {
    event.preventDefault();
    setFormError('');
    const validation = validateTeamForm(teamForm);
    if (validation) {
      setFormError(validation);
      return;
    }

    try {
      setSaving(true);
      await api.post('/departments', {
        teamName: normalizeName(teamForm.teamName),
        departmentName: normalizeName(teamForm.teamName),
        description: teamForm.description.trim(),
        managerId: teamForm.managerId,
        operationHeadId: teamForm.operationHeadId,
        members: teamForm.members,
      });
      setSuccess('Team created successfully.');
      await fetchPageData();
      closeModals();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to create team.');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    if (!deleteTarget?._id) return;
    try {
      setSaving(true);
      await api.delete(`/users/${deleteTarget._id}`);
      setSuccess('User deleted successfully.');
      await fetchPageData();
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6">
      <div className="space-y-5">
        <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Admin</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">User Management</h1>
            <p className="mt-1 text-sm text-slate-500">Create users, teams, reporting lines and access status.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={openCreateTeam} className="admin-secondary-button justify-center">
              <UsersIcon className="h-4 w-4" />
              Create Team
            </button>
            <button type="button" onClick={openCreateUser} className="admin-primary-button justify-center">
              <Plus className="h-4 w-4" />
              Add New User
            </button>
          </div>
        </section>

        {success && (
          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {success}
            <button type="button" onClick={() => setSuccess('')} className="rounded p-1 hover:bg-emerald-100" aria-label="Dismiss success"><X className="h-4 w-4" /></button>
          </div>
        )}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[minmax(220px,1fr)_180px_200px_160px_auto_auto] lg:items-end">
            <div>
              <label className="admin-field-label" htmlFor="userSearch">Search</label>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input id="userSearch" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Name, email, manager or team" className="admin-input pl-9" />
              </div>
            </div>
            <FilterSelect label="Role" name="roleId" value={filters.roleId} onChange={handleFilterChange}>
              <option value="">All roles</option>
              {roles.map((role) => <option key={role._id} value={role._id}>{role.roleName}</option>)}
            </FilterSelect>
            <FilterSelect label="Team" name="teamId" value={filters.teamId} onChange={handleFilterChange}>
              <option value="">All teams</option>
              {teams.map((team) => <option key={team._id} value={team._id}>{team.departmentName}</option>)}
            </FilterSelect>
            <FilterSelect label="Status" name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </FilterSelect>
            <button type="button" onClick={() => setFilters({ search: '', roleId: '', teamId: '', status: '' })} className="admin-secondary-button">Reset</button>
            <button type="button" onClick={fetchPageData} className="admin-secondary-button"><RefreshCw className="h-4 w-4" /> Refresh</button>
          </div>

          {error && <ErrorState message={error} onRetry={fetchPageData} />}
          {loading ? <LoadingState /> : filteredUsers.length === 0 ? <EmptyState onAdd={openCreateUser} /> : (
            <UserTable users={filteredUsers} onView={openViewUser} onEdit={openEditUser} onDelete={setDeleteTarget} />
          )}
          <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>Showing {filteredUsers.length} of {users.length} users</span>
            <span>{teams.length} teams available</span>
          </div>
        </section>
      </div>

      {userModalMode && (
        <UserModal
          mode={userModalMode}
          form={userForm}
          users={users}
          roles={roles}
          teams={teams}
          error={formError}
          saving={saving}
          onChange={handleUserChange}
          onAvatar={uploadAvatar}
          onClose={closeModals}
          onSubmit={saveUser}
        />
      )}

      {teamModalOpen && (
        <TeamModal
          form={teamForm}
          users={users}
          error={formError}
          saving={saving}
          onChange={handleTeamChange}
          onClose={closeModals}
          onSubmit={saveTeam}
        />
      )}

      {deleteTarget && <ConfirmDeleteModal user={deleteTarget} saving={saving} onCancel={() => setDeleteTarget(null)} onConfirm={deleteUser} />}
    </div>
  );
}

function UserTable({ users, onView, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1120px] w-full text-left">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3">Manager</th>
            <th className="px-4 py-3">Operation Head</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {users.map((user) => (
            <tr key={user._id} className="bg-white transition hover:bg-slate-50/80">
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <AvatarPreview user={user} />
                  <div>
                    <p className="font-semibold text-slate-950">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.employeeCode || 'No code'}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 text-slate-600">{user.email}</td>
              <td className="px-4 py-4 text-slate-700">{user.roleId?.roleName || user.designation || '-'}</td>
              <td className="px-4 py-4 text-slate-700">{user.teamName || user.departmentId?.departmentName || '-'}</td>
              <td className="px-4 py-4 text-slate-700">{user.managerId?.name || '-'}</td>
              <td className="px-4 py-4 text-slate-700">{user.operationHeadId?.name || '-'}</td>
              <td className="px-4 py-4"><StatusBadge status={getUserStatus(user)} /></td>
              <td className="px-4 py-4">
                <div className="flex justify-end gap-2">
                  <IconButton label="View user" onClick={() => onView(user)}><Eye className="h-4 w-4" /></IconButton>
                  <IconButton label="Edit user" onClick={() => onEdit(user)}><Edit3 className="h-4 w-4" /></IconButton>
                  <IconButton label="Delete user" tone="danger" onClick={() => onDelete(user)}><Trash2 className="h-4 w-4" /></IconButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserModal({ mode, form, users, roles, teams, error, saving, onChange, onAvatar, onClose, onSubmit }) {
  const isView = mode === 'view';
  const title = mode === 'create' ? 'Add New User' : mode === 'edit' ? 'Edit User' : 'View User';
  const fileInputRef = useRef(null);
  const roleLabel = roles.find((role) => role._id === form.roleId)?.roleName || 'Not selected';
  const teamLabel = teams.find((team) => team._id === form.teamId)?.departmentName || 'No team';
  const managerOptions = getAssignableUsers(users, ['Manager', 'Admin', 'Super Admin']);
  const complianceManagerOptions = getAssignableUsers(users, ['Compliance', 'Operation', 'Admin', 'Super Admin']);
  const statusLabel = form.isActive ? 'Active' : 'Inactive';

  const handleAvatarFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <ModalShell title={title} subtitle="Configure identity, access and reporting structure in one place." onClose={onClose}>
      <form onSubmit={onSubmit} className="flex h-full flex-col">
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <DrawerStat label="Role" value={roleLabel} icon={<ShieldCheck className="h-4 w-4" />} />
            <DrawerStat label="Team" value={teamLabel} icon={<Building2 className="h-4 w-4" />} />
            <DrawerStat label="Status" value={statusLabel} icon={<UserRound className="h-4 w-4" />} />
          </div>

          <section className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
            <div className="mb-4">
              <p className="text-sm font-extrabold text-slate-950">User profile</p>
              <p className="text-sm text-slate-500">Basic identity and access information.</p>
            </div>
            <div className="grid gap-5 lg:grid-cols-[180px_1fr]">
              <div>
                <span className="admin-field-label">Avatar</span>
                <div className="mt-2 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <AvatarPreview user={{ name: form.name, avatarUrl: form.avatarUrl }} size="large" />
                  {!isView && (
                    <>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="admin-secondary-button min-h-9 px-3 text-xs">
                        <Upload className="h-4 w-4" />
                        Upload
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="Name" name="name" value={form.name} onChange={onChange} required disabled={isView} helper="Full name used across users, teams and approvals." />
                <TextField label="Email" name="email" type="email" value={form.email} onChange={onChange} required disabled={isView} helper="Primary work email for login and notifications." />
                <TextField label={mode === 'edit' ? 'Password (optional)' : 'Password'} name="password" type="password" value={form.password} onChange={onChange} required={mode === 'create'} disabled={isView} helper={mode === 'edit' ? 'Leave blank to keep the current password.' : 'Set the initial password for the new user.'} />
                <SelectField label="Role" name="roleId" value={form.roleId} onChange={onChange} required disabled={isView} helper="Controls permissions and workspace visibility.">
                  <option value="">Select role</option>
                  {roles.map((role) => <option key={role._id} value={role._id}>{role.roleName}</option>)}
                </SelectField>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-extrabold text-slate-950">Reporting structure</p>
              <p className="text-sm text-slate-500">Assign the team, manager and compliance owner for this user.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField label="Team" name="teamId" value={form.teamId} onChange={onChange} required={mode !== 'create'} disabled={isView} helper="Select the team to auto-fill leadership where available.">
                <option value="">Select team</option>
                {teams.map((team) => <option key={team._id} value={team._id}>{team.departmentName}</option>)}
              </SelectField>
              <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700">
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} disabled={isView} className="h-4 w-4 accent-emerald-700" />
                <span>
                  <span className="block font-extrabold text-slate-950">Active user</span>
                  <span className="block text-xs font-medium text-slate-500">Inactive users cannot actively access the portal.</span>
                </span>
              </label>
              <SelectField label="Manager" name="managerId" value={form.managerId} onChange={onChange} required={mode !== 'create'} disabled={isView} helper="Primary reporting manager for daily ownership and approvals.">
                <option value="">Select manager</option>
                {managerOptions.map((user) => <option key={user._id} value={user._id}>{user.name}</option>)}
              </SelectField>
              <SelectField label="Compliance Manager" name="operationHeadId" value={form.operationHeadId} onChange={onChange} required={mode !== 'create'} disabled={isView} helper="Compliance owner for escalations, filings and audit review.">
                <option value="">Select compliance manager</option>
                {complianceManagerOptions.map((user) => <option key={user._id} value={user._id}>{user.name}</option>)}
              </SelectField>
            </div>
          </section>

          {error && <ValidationError message={error} />}
        </div>
        <ModalActions onClose={onClose} saving={saving} isView={isView} submitLabel={mode === 'edit' ? 'Update User' : 'Create User'} />
      </form>
    </ModalShell>
  );
}

function TeamModal({ form, users, error, saving, onChange, onClose, onSubmit }) {
  const managerOptions = getAssignableUsers(users, ['Manager', 'Admin', 'Super Admin']);
  const complianceManagerOptions = getAssignableUsers(users, ['Compliance', 'Operation', 'Admin', 'Super Admin']);

  return (
    <ModalShell title="Create New Team" subtitle="Set team details, assign leadership and select members." onClose={onClose}>
      <form onSubmit={onSubmit} className="flex h-full flex-col">
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <DrawerStat label="Manager" value={form.managerId ? 'Assigned' : 'Pending'} icon={<UserRound className="h-4 w-4" />} />
            <DrawerStat label="Compliance Manager" value={form.operationHeadId ? 'Assigned' : 'Pending'} icon={<ShieldCheck className="h-4 w-4" />} />
            <DrawerStat label="Members" value={`${form.members.length} selected`} icon={<UsersIcon className="h-4 w-4" />} />
          </div>

          <section className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
            <div className="mb-4">
              <p className="text-sm font-extrabold text-slate-950">Team details</p>
              <p className="text-sm text-slate-500">Define the team identity and supporting description.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Team Name" name="teamName" value={form.teamName} onChange={onChange} required helper="This appears in filters, user records and reporting views." />
              <TextField label="Description" name="description" value={form.description} onChange={onChange} helper="Optional context about the function of this team." />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-extrabold text-slate-950">Leadership</p>
              <p className="text-sm text-slate-500">Choose the reporting manager and compliance owner for this team.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField label="Manager" name="managerId" value={form.managerId} onChange={onChange} required helper="Team lead for people management and approvals.">
                <option value="">Select manager</option>
                {managerOptions.map((user) => <option key={user._id} value={user._id}>{user.name}</option>)}
              </SelectField>
              <SelectField label="Compliance Manager" name="operationHeadId" value={form.operationHeadId} onChange={onChange} required helper="Responsible for compliance review and escalation handling.">
                <option value="">Select compliance manager</option>
                {complianceManagerOptions.map((user) => <option key={user._id} value={user._id}>{user.name}</option>)}
              </SelectField>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-extrabold text-slate-950">Team members</p>
              <p className="text-sm text-slate-500">Select one or more users to assign into this team.</p>
            </div>
            <label className="block">
              <span className="admin-field-label">Members <span className="text-red-500">*</span></span>
              <select name="members" value={form.members} onChange={onChange} multiple className="admin-input mt-1 min-h-56">
                {users.map((user) => <option key={user._id} value={user._id}>{user.name} - {user.email}</option>)}
              </select>
              <span className="mt-2 block text-xs font-medium text-slate-500">Hold Ctrl to select multiple users.</span>
            </label>
          </section>

          {error && <ValidationError message={error} />}
        </div>
        <ModalActions onClose={onClose} saving={saving} submitLabel="Create Team" />
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, subtitle, children, onClose }) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute inset-y-0 right-0 flex w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl shadow-slate-950/10">
          <div className="flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
            <div className="pr-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-emerald-700">Drawer</p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-950">{title}</h2>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100" aria-label="Close modal">
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function DrawerStat({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-2 truncate text-sm font-extrabold text-slate-950">{value}</p>
    </div>
  );
}

function ModalActions({ onClose, saving, isView = false, submitLabel }) {
  return (
    <div className="border-t border-slate-200 bg-white px-6 py-4">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="admin-secondary-button justify-center">Cancel</button>
        {!isView && (
          <button type="submit" disabled={saving} className="admin-primary-button justify-center">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ user, saving, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Delete user?</h2>
            <p className="mt-1 text-sm text-slate-600">This will permanently remove <span className="font-semibold">{user.name}</span> from User Management.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="admin-secondary-button justify-center">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function TextField({ label, required, helper, ...props }) {
  return (
    <label className="block">
      <span className="admin-field-label">{label}{required && <span className="text-red-500"> *</span>}</span>
      <input className="admin-input mt-1 disabled:bg-slate-50 disabled:text-slate-500" {...props} />
      {helper && <span className="mt-1.5 block text-xs font-medium text-slate-500">{helper}</span>}
    </label>
  );
}

function SelectField({ label, required, helper, children, ...props }) {
  return (
    <label className="block">
      <span className="admin-field-label">{label}{required && <span className="text-red-500"> *</span>}</span>
      <select className="admin-input mt-1 disabled:bg-slate-50 disabled:text-slate-500" {...props}>{children}</select>
      {helper && <span className="mt-1.5 block text-xs font-medium text-slate-500">{helper}</span>}
    </label>
  );
}

function FilterSelect({ label, children, ...props }) {
  return (
    <label className="block">
      <span className="admin-field-label">{label}</span>
      <select className="admin-input mt-1" {...props}>{children}</select>
    </label>
  );
}

function StatusBadge({ status }) {
  const styles = status === 'active'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : 'bg-slate-100 text-slate-600 ring-slate-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${styles}`}>{status}</span>;
}

function IconButton({ label, tone = 'default', onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${tone === 'danger' ? 'border-red-100 text-red-600 hover:bg-red-50' : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`} aria-label={label} title={label}>
      {children}
    </button>
  );
}

function AvatarPreview({ user, size = 'normal' }) {
  const className = size === 'large'
    ? 'h-20 w-20 text-xl'
    : 'h-9 w-9 text-sm';
  const avatar = user.avatarUrl || user.avatar;
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-900 font-semibold text-white ${className}`}>
      {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : (user.name?.charAt(0)?.toUpperCase() || 'U')}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-8 text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      <p className="text-sm font-medium">Loading users...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="m-4 flex flex-col gap-3 rounded-lg border border-red-100 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-red-700">{message}</p>
      <button type="button" onClick={onRetry} className="admin-secondary-button justify-center">Retry</button>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <UserRound className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-950">No users found</h2>
      <p className="mt-1 max-w-md text-sm text-slate-500">Add a user or reset filters to view existing records.</p>
      <button type="button" onClick={onAdd} className="admin-primary-button mt-4"><Plus className="h-4 w-4" /> Add New User</button>
    </div>
  );
}

function ValidationError({ message }) {
  return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{message}</p>;
}

function validateUserForm(form, mode) {
  if (!normalizeName(form.name)) return 'Name is required.';
  if (!form.email.trim()) return 'Email is required.';
  if (!form.roleId) return 'Role is required.';
  if (mode !== 'create' && !form.teamId) return 'Team is required.';
  if (mode !== 'create' && !form.managerId) return 'Manager is required.';
  if (mode !== 'create' && !form.operationHeadId) return 'Operation head is required.';
  if (mode === 'create' && !form.password.trim()) return 'Password is required for a new user.';
  return '';
}

function validateTeamForm(form) {
  if (!normalizeName(form.teamName)) return 'Team name is required.';
  if (!form.managerId) return 'Manager is required.';
  if (!form.operationHeadId) return 'Operation head is required.';
  if (!form.members.length) return 'Select at least one member.';
  return '';
}

function normalizeItems(data) {
  if (Array.isArray(data)) return data;
  return data?.items || [];
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function getId(value) {
  return value?._id || value?.id || value || '';
}

function getUserStatus(user) {
  if (user.status) return user.status;
  return user.isActive ? 'active' : 'inactive';
}

function getRoleName(user) {
  return user?.roleId?.roleName || user?.designation || '';
}

function getAssignableUsers(users, allowedRoles) {
  return users.filter((user) => allowedRoles.includes(getRoleName(user)));
}

function getFormFromUser(user) {
  return {
    name: user.name || '',
    email: user.email || '',
    password: '',
    roleId: getId(user.roleId),
    teamId: getId(user.teamId || user.departmentId),
    managerId: getId(user.managerId),
    operationHeadId: getId(user.operationHeadId),
    isActive: getUserStatus(user) === 'active',
    avatarUrl: user.avatarUrl || user.avatar || '',
  };
}

export default Users;
