import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiArrowLeft as ArrowLeft,
  FiImage as ImagePlus,
  FiPlus as Plus,
  FiUser as UserRound,
  FiX as X,
} from 'react-icons/fi';
import api from '../services/api.js';

const roleOrder = ['Admin', 'Operation', 'Manager', 'Compliance', 'Account', 'Super Admin'];

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  roleId: '',
  status: 'active',
  departmentId: '',
};

function UserRegister() {
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(emptyForm);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [avatar, setAvatar] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchOptions();
  }, []);

  const orderedRoles = useMemo(() => {
    return roles.filter((role) => roleOrder.includes(role.roleName)).sort((a, b) => {
      const aIndex = roleOrder.indexOf(a.roleName);
      const bIndex = roleOrder.indexOf(b.roleName);
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
  }, [roles]);

  const selectedInitial = `${form.firstName || form.email || 'U'}`.trim().charAt(0).toUpperCase() || 'U';

  const fetchOptions = async () => {
    try {
      const [roleResponse, departmentResponse] = await Promise.all([
        api.get('/roles'),
        api.get('/departments'),
      ]);
      const roleItems = Array.isArray(roleResponse.data) ? roleResponse.data : roleResponse.data.items || [];
      const departmentItems = Array.isArray(departmentResponse.data)
        ? departmentResponse.data
        : departmentResponse.data.items || [];

      setRoles(roleItems);
      setDepartments(departmentItems);

      const operationRole = roleItems.find((role) => role.roleName === 'Operation') || roleItems[0];
      if (operationRole) {
        setForm((current) => ({ ...current, roleId: current.roleId || operationRole._id }));
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Could not load roles and teams.' });
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Upload PNG, JPG, JPEG, or WEBP only.' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Profile image must be under 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const createTeam = async () => {
    const departmentName = window.prompt('Team name');
    if (!departmentName?.trim()) return;

    try {
      const response = await api.post('/departments', {
        departmentName: departmentName.trim(),
        description: `${departmentName.trim()} team`,
      });
      const created = response.data;
      setDepartments((current) => [...current, created]);
      setForm((current) => ({ ...current, departmentId: created._id }));
      setMessage({ type: 'success', text: 'Team created successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Could not create team.' });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password || !form.roleId) {
      setMessage({ type: 'error', text: 'Fill first name, last name, email, password, and role.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/users', {
        employeeCode: `USR${Date.now()}`,
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        roleId: form.roleId,
        departmentId: form.departmentId || undefined,
        designation: orderedRoles.find((role) => role._id === form.roleId)?.roleName || 'User',
        avatar,
        status: form.status,
        isActive: form.status === 'active',
      });

      setForm((current) => ({ ...emptyForm, roleId: current.roleId }));
      setAvatar('');
      setMessage({ type: 'success', text: 'User registered and saved to database.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Could not register user.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-emerald-50/50 p-3 sm:p-6">
      <div className="mx-auto max-w-5xl rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-100 bg-white text-emerald-700 shadow-sm transition hover:bg-emerald-50"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700">User Master</p>
              <h1 className="mt-1 text-3xl font-black tracking-normal text-slate-950">User Register</h1>
              <p className="mt-2 text-sm font-medium text-slate-500">Create user access with admin-set password login.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm((current) => ({ ...emptyForm, roleId: current.roleId }));
              setAvatar('');
              setMessage({ type: '', text: '' });
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50"
            aria-label="Clear form"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="register-label">Profile Image</label>
            <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-gradient-to-br from-emerald-700 to-sky-700 text-4xl font-black text-white shadow-lg">
                {avatar ? <img src={avatar} alt="Profile preview" className="h-full w-full object-cover" /> : selectedInitial}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-600">Upload PNG, JPG, JPEG, or WEBP under 2MB.</p>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800"
                >
                  <ImagePlus className="h-5 w-5" />
                  Upload Image
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="First Name" name="firstName" value={form.firstName} onChange={handleChange} />
            <Field label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} />
          </div>

          <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} />

          <div>
            <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Admin set password" />
            <p className="mt-2 text-xs font-semibold text-slate-500">User will login with this password.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="register-label" htmlFor="roleId">Role</label>
              <select id="roleId" name="roleId" value={form.roleId} onChange={handleChange} className="register-input mt-2">
                <option value="">Select role</option>
                {orderedRoles.map((role) => (
                  <option key={role._id} value={role._id}>{role.roleName}</option>
                ))}
              </select>
            </div>

            <div>
              <span className="register-label">Status</span>
              <div className="mt-7 flex h-12 items-center gap-7">
                <Radio name="status" value="active" checked={form.status === 'active'} onChange={handleChange} label="Active" />
                <Radio name="status" value="inactive" checked={form.status === 'inactive'} onChange={handleChange} label="InActive" />
              </div>
            </div>
          </div>

          <div>
            <label className="register-label" htmlFor="departmentId">Team</label>
            <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto]">
              <select id="departmentId" name="departmentId" value={form.departmentId} onChange={handleChange} className="register-input">
                <option value="">No team assigned</option>
                {departments.map((department) => (
                  <option key={department._id} value={department._id}>{department.departmentName}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={createTeam}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-6 text-sm font-black text-emerald-700 transition hover:bg-emerald-50"
              >
                <Plus className="h-4 w-4" />
                Create Team
              </button>
            </div>
          </div>

          {message.text && (
            <div className={`rounded-xl px-4 py-3 text-sm font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {message.text}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-7 text-sm font-black text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserRound className="h-5 w-5" />
              {isSubmitting ? 'Saving User...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, className = '', ...props }) {
  return (
    <div className={className}>
      <label className="register-label" htmlFor={props.name}>{label}</label>
      <input id={props.name} className="register-input mt-2" {...props} />
    </div>
  );
}

function Radio({ label, ...props }) {
  return (
    <label className="flex items-center gap-2 text-base font-bold text-slate-800">
      <input type="radio" className="h-4 w-4 accent-emerald-700" {...props} />
      {label}
    </label>
  );
}

export default UserRegister;
