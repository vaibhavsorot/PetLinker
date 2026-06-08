import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'

const SESSION_KEY = 'petlinker_session'
const TOKEN_KEY = 'petlinker_token'
const API_BASE = 'http://localhost:5000/api/v1'

const initialStats = [
  { label: 'Animals in Shelters', key: 'animalsInShelters', value: 0 },
  { label: 'Pending Adoptions', key: 'pendingAdoptions', value: 0 },
  { label: 'Active Rescue Reports', key: 'activeRescues', value: 0 },
  { label: 'This Month Donations', key: 'monthDonations', value: '$0.00' },
]

function App() {
  const navigate = useNavigate()
  const [session, setSession] = useState(() => {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  })

  const auth = useMemo(
    () => ({
      session,
      login: ({ email, role, name }) => {
        const newSession = { email, role, name }
        localStorage.setItem(SESSION_KEY, JSON.stringify(newSession))
        setSession(newSession)
      },
      signup: async ({ name, email, password, role }) => {
        const res = await fetch(`${API_BASE}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role }),
        })
        const data = await res.json()
        if (!res.ok) {
          return { ok: false, message: data.message || 'Signup failed.' }
        }
        return { ok: true, message: data.message || 'Signup successful. Please login.' }
      },
      validateLogin: async ({ email, password, role }) => {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role }),
        })
        const data = await res.json()
        if (!res.ok) {
          return { ok: false, message: data.message || 'Invalid credentials or role.' }
        }
        localStorage.setItem(TOKEN_KEY, data.token)
        return { ok: true, user: data.user }
      },
      logout: () => {
        localStorage.removeItem(SESSION_KEY)
        localStorage.removeItem(TOKEN_KEY)
        setSession(null)
        navigate('/login')
      },
    }),
    [navigate, session],
  )

  return (
    <Routes>
      <Route path="/" element={<Navigate to={session ? '/portal' : '/login'} replace />} />
      <Route path="/login" element={session ? <Navigate to="/portal" replace /> : <LoginPage auth={auth} />} />
      <Route path="/signup" element={session ? <Navigate to="/portal" replace /> : <SignupPage auth={auth} />} />
      <Route
        path="/portal/*"
        element={
          <ProtectedRoute>
            <PortalRouter session={session} onLogout={auth.logout} />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const sessionRaw = localStorage.getItem(SESSION_KEY)
    if (!token || !sessionRaw) {
      setStatus('fail')
      return
    }
    fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error('Invalid token')
        return res.json()
      })
      .then(() => setStatus('ok'))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(SESSION_KEY)
        setStatus('fail')
      })
  }, [])

  if (status === 'checking') {
    return (
      <section className="auth-wrap">
        <div className="auth-card"><p>Verifying session...</p></div>
      </section>
    )
  }
  if (status === 'fail') return <Navigate to="/login" replace />
  return children
}

function PortalRouter({ session, onLogout }) {
  if (session.role === 'staff') {
    return <StaffPortal onLogout={onLogout} />
  }
  return <UserPortal onLogout={onLogout} />
}

function LoginPage({ auth }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', role: 'user' })
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    const result = await auth.validateLogin(form)
    if (!result.ok) {
      setError(result.message)
      return
    }
    auth.login({ email: result.user.email, role: result.user.role, name: result.user.name })
    navigate('/portal')
  }

  return (
    <section className="auth-wrap">
      <div className="auth-brand">
        <span className="brand-icon" aria-hidden>🐾</span>
        <h1>PetLinker</h1>
        <p>Animal welfare, connected.</p>
      </div>
      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Login</h2>
        <p>Access User or Staff portal.</p>
        <input placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="user">User</option>
          <option value="staff">Staff</option>
        </select>
        {error && <p className="error">{error}</p>}
        <button type="submit">Login</button>
        <p>
          New here? <NavLink to="/signup">Create account</NavLink>
        </p>
      </form>
    </section>
  )
}

function SignupPage({ auth }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    const result = await auth.signup(form)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setMessage(result.message)
    setTimeout(() => navigate('/login'), 600)
  }

  return (
    <section className="auth-wrap">
      <div className="auth-brand">
        <span className="brand-icon" aria-hidden>🐾</span>
        <h1>PetLinker</h1>
        <p>Join the rescue network.</p>
      </div>
      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Signup</h2>
        <p>Create a new account.</p>
        <input placeholder="Full Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="user">User</option>
          <option value="staff">Staff</option>
        </select>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
        <button type="submit">Signup</button>
        <p>
          Already have an account? <NavLink to="/login">Login</NavLink>
        </p>
      </form>
    </section>
  )
}

function StaffPortal({ onLogout }) {
  return (
    <PortalLayout portalType="staff" onLogout={onLogout} navItems={[
      { to: '/portal/dashboard', label: 'Dashboard' },
      { to: '/portal/animals', label: 'Animals' },
      { to: '/portal/adoptions', label: 'Adoptions Review' },
      { to: '/portal/rescues', label: 'Rescue Reports' },
      { to: '/portal/medical', label: 'Medical Records' },
      { to: '/portal/shelters', label: 'Shelters' },
      { to: '/portal/staff', label: 'Staff Tasks' },
      { to: '/portal/donations', label: 'Donations' },
      { to: '/portal/licenses', label: 'Licenses' },
    ]}>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="animals" element={<AnimalsPage />} />
        <Route path="adoptions" element={<AdoptionsPage canManage />} />
        <Route path="rescues" element={<RescuesPage canManage />} />
        <Route path="medical" element={<MedicalPage />} />
        <Route path="shelters" element={<SheltersPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="licenses" element={<LicensesPage />} />
        <Route path="donations" element={<DonationsPage allowDonate={false} />} />
      </Routes>
    </PortalLayout>
  )
}

function UserPortal({ onLogout }) {
  return (
    <PortalLayout portalType="user" onLogout={onLogout} navItems={[
      { to: '/portal/animals', label: 'Browse Animals' },
      { to: '/portal/adoptions', label: 'My Adoptions' },
      { to: '/portal/rescues', label: 'Report Rescue' },
      { to: '/portal/licenses', label: 'Pet License' },
    ]}>
      <Routes>
        <Route path="/" element={<Navigate to="animals" replace />} />
        <Route path="dashboard" element={<Navigate to="/portal/animals" replace />} />
        <Route path="animals" element={<UserAnimalsPage />} />
        <Route path="adoptions" element={<UserAdoptionsPage />} />
        <Route path="rescues" element={<UserRescuesPage />} />
        <Route path="licenses" element={<UserLicensesPage />} />
        <Route path="donations" element={<Navigate to="/portal/animals" replace />} />
      </Routes>
    </PortalLayout>
  )
}

function PortalLayout({ portalType, onLogout, navItems, children }) {
  const isStaff = portalType === 'staff'
  return (
    <div className={`layout ${isStaff ? 'layout-staff' : 'layout-user'}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon" aria-hidden>🐾</span>
          <div>
            <h1>PetLinker</h1>
            <p className="sidebar-subtitle">{isStaff ? 'Staff Portal' : 'User Portal'}</p>
          </div>
        </div>
        <span className={`role-badge ${isStaff ? 'role-staff' : 'role-user'}`}>
          {isStaff ? 'Staff' : 'User'}
        </span>
        <nav>
          {navItems.map((item) => (
            <NavItem key={item.to} to={item.to} label={item.label} />
          ))}
        </nav>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </aside>
      <main className="content">{children}</main>
    </div>
  )
}

function NavItem({ to, label }) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      {label}
    </NavLink>
  )
}

function useProtectedList(endpoint, key) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true)
        setError('')
        const token = localStorage.getItem(TOKEN_KEY)
        const res = await fetch(`${API_BASE}/${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || `Could not load ${endpoint}.`)
        setItems(data[key] || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [endpoint, key, tick])

  const reload = () => setTick((n) => n + 1)
  return { items, loading, error, reload }
}

function DashboardPage() {
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError('')
        const token = localStorage.getItem(TOKEN_KEY)
        const res = await fetch(`${API_BASE}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Could not load dashboard stats.')
        const s = data.stats || {}
        setStats([
          { label: 'Animals in Shelters', key: 'animalsInShelters', value: s.animalsInShelters ?? 0 },
          { label: 'Pending Adoptions', key: 'pendingAdoptions', value: s.pendingAdoptions ?? 0 },
          { label: 'Active Rescue Reports', key: 'activeRescues', value: s.activeRescues ?? 0 },
          {
            label: 'This Month Donations',
            key: 'monthDonations',
            value: `$${Number(s.monthDonations ?? 0).toFixed(2)}`,
          },
        ])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <>
      <header className="page-header">
        <h2>Animal Welfare Dashboard</h2>
        <p>Operational snapshot from shelters, rescues, and adoptions.</p>
      </header>
      {error && <section className="card"><p className="error">{error}</p></section>}
      <section className="stats-grid">
        {stats.map((s) => (
          <article key={s.key} className={`card stat-card stat-${s.key}`}>
            <p className="label">{s.label}</p>
            <p className="value">{loading ? '...' : s.value}</p>
          </article>
        ))}
      </section>
      <section className="stats-grid">
        <article className="card">
          <h3>Daily Overview</h3>
          <p>Track active rescue operations and pending adoption decisions in real time.</p>
        </article>
        <article className="card">
          <h3>Shelter Operations</h3>
          <p>Monitor shelter occupancy, medical load, and response coordination across locations.</p>
        </article>
        <article className="card">
          <h3>Compliance Alerts</h3>
          <p>Review expiring licenses and unresolved field reports from your current work queue.</p>
        </article>
      </section>
    </>
  )
}

function AnimalsPage() {
  const { items: animals, loading, error } = useProtectedList('animals', 'animals')

  if (loading) {
    return (
      <section className="card">
        <h2>Animals</h2>
        <p>Loading animals...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="card">
        <h2>Animals</h2>
        <p className="error">{error}</p>
      </section>
    )
  }

  return (
    <section className="card">
      <h2>Animals</h2>
      <Table
        headers={['ID', 'Name', 'Species', 'Shelter', 'Status']}
        rows={animals.map((a) => [a.id, a.name, a.species, a.shelter, a.status])}
        emptyMessage="No animals registered in the system yet."
        emptyIcon="🐾"
      />
    </section>
  )
}

function AdoptionsPage({ canManage = false }) {
  const { items: fetchedAdoptions, loading, error } = useProtectedList('adoptions', 'adoptions')
  const [adoptions, setAdoptions] = useState([])
  const [actionMsg, setActionMsg] = useState('')
  const [actionErr, setActionErr] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    setAdoptions(fetchedAdoptions)
  }, [fetchedAdoptions])

  const updateStatus = async (adoptionId, status) => {
    setActionMsg('')
    setActionErr('')
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const res = await fetch(`${API_BASE}/adoptions/${adoptionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update request.')
      setActionMsg(data.message || 'Request updated.')
      setAdoptions((prev) => prev.map((a) => (a.id === adoptionId ? { ...a, status } : a)))
    } catch (err) {
      setActionErr(err.message)
    }
  }

  if (loading) {
    return (
      <section className="card">
        <h2>Adoption Requests</h2>
        <p>Loading adoptions...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="card">
        <h2>Adoption Requests</h2>
        <p className="error">{error}</p>
      </section>
    )
  }

  const activeAdoptions = canManage ? adoptions.filter((a) => a.status === 'Pending') : adoptions
  const historyAdoptions = canManage
    ? adoptions.filter((a) => a.status === 'Approved' || a.status === 'Rejected')
    : []

  return (
    <section className="card">
      <h2>Adoption Requests</h2>
      {actionMsg && <p className="success">{actionMsg}</p>}
      {actionErr && <p className="error">{actionErr}</p>}
      {canManage && (
        <button className="btn-secondary" onClick={() => setShowHistory((prev) => !prev)}>
          {showHistory ? 'Hide History' : 'View History'}
        </button>
      )}
      {activeAdoptions.length === 0 ? (
        <EmptyState
          icon="🐾"
          message={canManage ? 'No pending adoption requests right now.' : 'Adopt a pet from Browse Animals to see your requests here.'}
        />
      ) : (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Animal</th>
              <th>Adopter</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {activeAdoptions.map((a) => (
              <tr key={a.id}>
                <td>{a.animal}</td>
                <td>{a.adopter}</td>
                <td>{a.status}</td>
                <td>
                  {a.status === 'Pending' ? (
                    <div className="actions">
                      <button className="btn-success" onClick={() => updateStatus(a.id, 'Approved')}>Accept</button>
                      <button className="btn-danger" onClick={() => updateStatus(a.id, 'Rejected')}>Reject</button>
                    </div>
                  ) : (
                    'Done'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
      {canManage && showHistory && (
        <>
          <h3 style={{ marginTop: '1rem' }}>Adoptions History</h3>
          {historyAdoptions.length === 0 ? (
            <EmptyState icon="📋" message="No completed adoption history yet." />
          ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Adopter</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {historyAdoptions.map((a) => (
                  <tr key={`history-${a.id}`}>
                    <td>{a.animal}</td>
                    <td>{a.adopter}</td>
                    <td>{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </>
      )}
    </section>
  )
}

function RescuesPage({ canManage = false }) {
  const { items: fetchedRescues, loading, error } = useProtectedList('rescues', 'rescues')
  const [rescues, setRescues] = useState([])
  const [actionMsg, setActionMsg] = useState('')
  const [actionErr, setActionErr] = useState('')
  const [selectedDescription, setSelectedDescription] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    setRescues(fetchedRescues)
  }, [fetchedRescues])

  const updateStatus = async (reportId, status) => {
    setActionMsg('')
    setActionErr('')
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const res = await fetch(`${API_BASE}/rescues/${reportId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update rescue report.')
      setActionMsg(data.message || 'Rescue report updated.')
      setRescues((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)))
    } catch (err) {
      setActionErr(err.message)
    }
  }

  const deleteReport = async (reportId) => {
    setActionMsg('')
    setActionErr('')
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const res = await fetch(`${API_BASE}/rescues/${reportId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to delete rescue report.')
      setActionMsg(data.message || 'Rescue report deleted.')
      setRescues((prev) => prev.filter((r) => r.id !== reportId))
    } catch (err) {
      setActionErr(err.message)
    }
  }

  if (loading) {
    return (
      <section className="card">
        <h2>Rescue Reports</h2>
        <p>Loading rescue reports...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="card">
        <h2>Rescue Reports</h2>
        <p className="error">{error}</p>
      </section>
    )
  }

  const activeRescues = canManage ? rescues.filter((r) => r.status !== 'Resolved') : rescues
  const historyRescues = canManage ? rescues.filter((r) => r.status === 'Resolved') : []

  return (
    <section className="card">
      <h2>Rescue Reports</h2>
      {actionMsg && <p className="success">{actionMsg}</p>}
      {actionErr && <p className="error">{actionErr}</p>}
      {canManage && (
        <button className="btn-secondary" onClick={() => setShowHistory((prev) => !prev)}>
          {showHistory ? 'Hide History' : 'View History'}
        </button>
      )}
      {canManage && selectedDescription && (
        <section className="card" style={{ marginBottom: '1rem' }}>
          <h3>Report Description</h3>
          <p>{selectedDescription}</p>
        </section>
      )}
      {activeRescues.length === 0 ? (
        <EmptyState
          icon="🆘"
          message={canManage ? 'No active rescue reports at the moment.' : 'Submit a rescue report to see it listed here.'}
        />
      ) : (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Reporter</th>
              <th>Location</th>
              <th>Description</th>
              <th>Urgency</th>
              <th>Status</th>
              {canManage && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {activeRescues.map((r) => (
              <tr key={r.id ?? `${r.reporter}-${r.area}-${r.status}`}>
                <td>{r.reporter}</td>
                <td>{r.area}</td>
                <td>
                  {canManage ? (
                    <button className="btn-secondary" onClick={() => setSelectedDescription(r.description || 'No description provided.')}>
                      View Description
                    </button>
                  ) : (
                    r.description || '-'
                  )}
                </td>
                <td>{r.urgency}</td>
                <td>{r.status}</td>
                {canManage && (
                  <td>
                    {r.status === 'Pending' && (
                      <button className="btn-secondary" onClick={() => updateStatus(r.id, 'Ongoing')}>Start</button>
                    )}
                    {r.status !== 'Resolved' && (
                      <button className="btn-success" onClick={() => updateStatus(r.id, 'Resolved')}>Resolve</button>
                    )}
                    <button className="btn-danger" onClick={() => deleteReport(r.id)}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
      {canManage && showHistory && (
        <>
          <h3 style={{ marginTop: '1rem' }}>Rescue History</h3>
          {historyRescues.length === 0 ? (
            <EmptyState icon="📋" message="No resolved rescue reports in history yet." />
          ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reporter</th>
                  <th>Location</th>
                  <th>Description</th>
                  <th>Urgency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {historyRescues.map((r) => (
                  <tr key={`history-${r.id ?? `${r.reporter}-${r.area}`}`}>
                    <td>{r.reporter}</td>
                    <td>{r.area}</td>
                    <td>{r.description || '-'}</td>
                    <td>{r.urgency}</td>
                    <td>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </>
      )}
    </section>
  )
}

function UserAdoptionsPage() {
  const { items: adoptions, loading, error } = useProtectedList('adoptions/mine', 'adoptions')
  if (loading) return <>
    <header className="page-header"><h2>My Adoptions</h2><p>View your adoption requests and their status.</p></header>
    <section className="card"><h2>My Adoptions</h2><p>Loading your adoptions...</p></section>
  </>
  if (error) return <>
    <header className="page-header"><h2>My Adoptions</h2><p>View your adoption requests and their status.</p></header>
    <section className="card"><h2>My Adoptions</h2><p className="error">{error}</p></section>
  </>
  return (
    <>
      <header className="page-header">
        <h2>My Adoptions</h2>
        <p>View your adoption requests and their status.</p>
      </header>
      <section className="card">
        <h2>My Adoptions</h2>
        <Table
          headers={['Animal', 'Status']}
          rows={adoptions.map((a) => [a.animal, a.status])}
          emptyMessage="Adopt a pet from Browse Animals to see your requests here."
          emptyIcon="🐶"
        />
      </section>
    </>
  )
}

function UserLicensesPage() {
  const { items: licenses, loading, error } = useProtectedList('licenses/mine', 'licenses')
  if (loading) return <>
    <header className="page-header"><h2>My Pet Licenses</h2><p>Manage your pet licenses.</p></header>
    <section className="card"><h2>My Pet Licenses</h2><p>Loading your licenses...</p></section>
  </>
  if (error) return <>
    <header className="page-header"><h2>My Pet Licenses</h2><p>Manage your pet licenses.</p></header>
    <section className="card"><h2>My Pet Licenses</h2><p className="error">{error}</p></section>
  </>
  return (
    <>
      <header className="page-header">
        <h2>My Pet Licenses</h2>
        <p>Manage your pet licenses.</p>
      </header>
      <section className="card">
        <h2>My Pet Licenses</h2>
        <Table
          headers={['Animal', 'Status', 'Issue Date', 'Expiry Date']}
          rows={licenses.map((l) => [l.animal, l.status, l.issueDate, l.expiryDate])}
          emptyMessage="No pet licenses on file yet. Licenses appear here after registration."
          emptyIcon="📄"
        />
      </section>
    </>
  )
}

function UserDashboardPage() {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  const { items: rescues, loading, error } = useProtectedList('rescues/mine', 'rescues')

  return (
    <section className="card">
      <h2>User Dashboard</h2>
      <p>Welcome, {session?.name || 'User'}. JWT-protected area.</p>
      {loading && <p>Loading your stats...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        <ul>
          <li>Your rescue reports: <strong>{rescues.length}</strong></li>
          <li>Pending: <strong>{rescues.filter((r) => r.status === 'Pending').length}</strong></li>
        </ul>
      )}
    </section>
  )
}

function UserRescuesPage() {
  const { items: fetchedRescues, loading, error, reload } = useProtectedList('rescues/mine', 'rescues')
  const [rescues, setRescues] = useState([])
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState('Medium')
  const [submitMsg, setSubmitMsg] = useState('')
  const [submitErr, setSubmitErr] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ location: '', description: '', urgency: 'Medium' })
  const [actionMsg, setActionMsg] = useState('')
  const [actionErr, setActionErr] = useState('')

  useEffect(() => {
    setRescues(fetchedRescues)
  }, [fetchedRescues])

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
  })

  const submitReport = async (e) => {
    e.preventDefault()
    setSubmitMsg('')
    setSubmitErr('')
    try {
      const res = await fetch(`${API_BASE}/rescues`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ location, description, urgency }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to submit report.')
      setSubmitMsg(data.message || 'Rescue report submitted.')
      setLocation('')
      setDescription('')
      setUrgency('Medium')
      if (data.rescue) setRescues((prev) => [...prev, data.rescue])
      else reload?.()
    } catch (err) {
      setSubmitErr(err.message)
    }
  }

  const startEdit = (report) => {
    setEditingId(report.id)
    setEditForm({
      location: report.area,
      description: report.description || '',
      urgency: report.urgency,
    })
    setActionMsg('')
    setActionErr('')
  }

  const saveEdit = async (reportId) => {
    setActionMsg('')
    setActionErr('')
    try {
      const res = await fetch(`${API_BASE}/rescues/${reportId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update report.')
      setActionMsg(data.message || 'Report updated.')
      setEditingId(null)
      setRescues((prev) => prev.map((r) => (r.id === reportId ? (data.rescue || { ...r, area: editForm.location, description: editForm.description, urgency: editForm.urgency }) : r)))
    } catch (err) {
      setActionErr(err.message)
    }
  }

  const deleteReport = async (reportId) => {
    setActionMsg('')
    setActionErr('')
    try {
      const res = await fetch(`${API_BASE}/rescues/${reportId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to delete report.')
      setActionMsg(data.message || 'Report deleted.')
      setRescues((prev) => prev.filter((r) => r.id !== reportId))
    } catch (err) {
      setActionErr(err.message)
    }
  }

  return (
    <>
      <header className="page-header">
        <h2>Report Rescue</h2>
        <p>Help animals in need by reporting rescue operations.</p>
      </header>
      <section className="card">
        <h2>Create Rescue Report</h2>
        <form className="inline-form" onSubmit={submitReport}>
          <input placeholder="Rescue location" value={location} onChange={(e) => setLocation(e.target.value)} required />
          <input placeholder="Short description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <button type="submit">Create</button>
        </form>
        {submitMsg && <p className="success">{submitMsg}</p>}
        {submitErr && <p className="error">{submitErr}</p>}
      </section>

      {loading && <section className="card"><h2>My Rescue Reports</h2><p>Loading...</p></section>}
      {error && <section className="card"><h2>My Rescue Reports</h2><p className="error">{error}</p></section>}
      {!loading && !error && (
        <section className="card">
          <h2>My Rescue Reports (Read / Update / Delete)</h2>
          {actionMsg && <p className="success">{actionMsg}</p>}
          {actionErr && <p className="error">{actionErr}</p>}
          {rescues.length === 0 ? (
            <EmptyState
              icon="🆘"
              message="No rescue reports yet. Submit one using the form above."
            />
          ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Location</th>
                  <th>Description</th>
                  <th>Urgency</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rescues.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{editingId === r.id ? <input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} /> : r.area}</td>
                    <td>{editingId === r.id ? <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /> : (r.description || '-')}</td>
                    <td>
                      {editingId === r.id ? (
                        <select value={editForm.urgency} onChange={(e) => setEditForm({ ...editForm, urgency: e.target.value })}>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      ) : r.urgency}
                    </td>
                    <td>{r.status}</td>
                    <td>
                      {r.status === 'Pending' && editingId !== r.id && (
                        <>
                          <button className="btn-secondary" type="button" onClick={() => startEdit(r)}>Edit</button>
                          <button className="btn-danger" type="button" onClick={() => deleteReport(r.id)}>Delete</button>
                        </>
                      )}
                      {editingId === r.id && (
                        <>
                          <button className="btn-success" type="button" onClick={() => saveEdit(r.id)}>Save</button>
                          <button className="btn-secondary" type="button" onClick={() => setEditingId(null)}>Cancel</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </section>
      )}
    </>
  )
}

function UserAnimalsPage() {
  const { items: shelters, loading: sheltersLoading, error: sheltersError } = useProtectedList('shelters', 'shelters')
  const [selectedShelter, setSelectedShelter] = useState('')
  const [animals, setAnimals] = useState([])
  const [loadingAnimals, setLoadingAnimals] = useState(false)
  const [animalsError, setAnimalsError] = useState('')
  const [adoptMsg, setAdoptMsg] = useState('')
  const [adoptErr, setAdoptErr] = useState('')

  useEffect(() => {
    const fetchAnimalsByShelter = async () => {
      if (!selectedShelter) {
        setAnimals([])
        return
      }
      try {
        setLoadingAnimals(true)
        setAnimalsError('')
        const token = localStorage.getItem(TOKEN_KEY)
        const res = await fetch(`${API_BASE}/animals?shelterId=${selectedShelter}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Could not load animals for shelter.')
        setAnimals(data.animals || [])
      } catch (err) {
        setAnimalsError(err.message)
      } finally {
        setLoadingAnimals(false)
      }
    }
    fetchAnimalsByShelter()
  }, [selectedShelter])

  if (sheltersLoading) return <section className="card"><h2>Browse Animals</h2><p>Loading shelters...</p></section>
  if (sheltersError) return <section className="card"><h2>Browse Animals</h2><p className="error">{sheltersError}</p></section>

  const requestAdoption = async (animalId) => {
    setAdoptMsg('')
    setAdoptErr('')
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const res = await fetch(`${API_BASE}/adoptions/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ animalId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to submit adoption request.')
      setAdoptMsg(data.message || 'Adoption request submitted.')
    } catch (err) {
      setAdoptErr(err.message)
    }
  }

  return (
    <>
      <header className="page-header">
        <h2>Browse Animals</h2>
        <p>Find your perfect companion from shelters near you.</p>
      </header>
      <section className="card">
        <h2>Browse Animals</h2>
        <p className="page-desc">Pick a shelter below to see pets available for adoption.</p>

        {shelters.length === 0 ? (
          <EmptyState icon="🏠" message="No shelters are listed yet. Check back soon." />
        ) : (
          <div className="shelter-picker-vertical">
            {shelters.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`shelter-option ${String(s.id) === String(selectedShelter) ? 'active' : ''}`}
                onClick={() => setSelectedShelter(String(s.id))}
              >
                <span className="shelter-option-name">{s.name}</span>
                <span className="shelter-option-meta">
                  {s.location || 'Location not set'} · {s.occupancy ?? 0} animal{(s.occupancy ?? 0) === 1 ? '' : 's'}
                </span>
              </button>
            ))}
          </div>
        )}

        {!selectedShelter && shelters.length > 0 && (
          <EmptyState icon="🐾" message="Select a shelter above to browse animals available for adoption." />
        )}
      </section>

      {selectedShelter && loadingAnimals && (
        <section className="card"><p className="muted-loading">Loading animals...</p></section>
      )}
      {animalsError && <section className="card"><p className="error">{animalsError}</p></section>}

      {selectedShelter && !loadingAnimals && !animalsError && (
        <section className="card">
          <h2>Available Pets</h2>
          {adoptMsg && <p className="success">{adoptMsg}</p>}
          {adoptErr && <p className="error">{adoptErr}</p>}
          {animals.length === 0 ? (
            <EmptyState icon="🐕" message="No animals in this shelter right now. Try another shelter." />
          ) : (
            <div className="animal-list-vertical">
              {animals.map((a) => (
                <article key={a.id} className="animal-card">
                  <div className="animal-card-info">
                    <h3>{a.name}</h3>
                    <p className="animal-card-meta">{a.species} · {a.status}</p>
                  </div>
                  {a.status === 'Available' ? (
                    <button className="btn-success adopt-btn" type="button" onClick={() => requestAdoption(a.id)}>
                      Request Adoption
                    </button>
                  ) : (
                    <span className="empty-state-inline">Not available</span>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  )
}

function DonationsPage({ mineOnly = false, allowDonate = true }) {
  const { items: shelters } = useProtectedList('shelters', 'shelters')
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [amount, setAmount] = useState('')
  const [shelterId, setShelterId] = useState('')
  const [submitMsg, setSubmitMsg] = useState('')
  const [submitErr, setSubmitErr] = useState('')

  const loadDonations = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem(TOKEN_KEY)
      const endpoint = mineOnly ? 'donations/mine' : 'donations'
      const res = await fetch(`${API_BASE}/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Could not load donations.')
      setDonations(data.donations || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDonations()
  }, [mineOnly])

  const submitDonation = async (e) => {
    e.preventDefault()
    setSubmitMsg('')
    setSubmitErr('')
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const res = await fetch(`${API_BASE}/donations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, shelterId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to submit donation.')
      setSubmitMsg(data.message || 'Donation submitted successfully.')
      setAmount('')
      setShelterId('')
      await loadDonations()
    } catch (err) {
      setSubmitErr(err.message)
    }
  }

  if (loading) {
    return (
      <section className="card">
        <h2>Donations</h2>
        <p>Loading donations...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="card">
        <h2>Donations</h2>
        <p className="error">{error}</p>
      </section>
    )
  }

  return (
    <>
      {allowDonate && (
        <section className="card">
          <h2>Donate to Shelter</h2>
          <form className="inline-form" onSubmit={submitDonation}>
            <input
              type="number"
              min="1"
              step="0.01"
              placeholder="Donation amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <select value={shelterId} onChange={(e) => setShelterId(e.target.value)} required>
              <option value="">Select shelter</option>
              {shelters.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button type="submit">Donate</button>
          </form>
          {submitMsg && <p className="success">{submitMsg}</p>}
          {submitErr && <p className="error">{submitErr}</p>}
        </section>
      )}

      <section className="card">
        <h2>{mineOnly ? 'My Donations' : 'Donations'}</h2>
        <Table
          headers={['Donor', 'Amount', 'Date', 'Shelter']}
          rows={donations.map((d) => [d.donor, `$${d.amount}`, d.date, d.shelter])}
          emptyMessage="No donations recorded yet."
          emptyIcon="💝"
        />
      </section>
    </>
  )
}

function SheltersPage() {
  const { items: shelters, loading, error } = useProtectedList('shelters', 'shelters')
  if (loading) return <section className="card"><h2>Shelters</h2><p>Loading shelters...</p></section>
  if (error) return <section className="card"><h2>Shelters</h2><p className="error">{error}</p></section>
  return (
    <section className="card">
      <h2>Shelters</h2>
      <Table
        headers={['ID', 'Name', 'Location', 'Capacity', 'Occupancy']}
        rows={shelters.map((s) => [s.id, s.name, s.location, s.capacity, s.occupancy])}
        emptyMessage="No shelters registered yet."
        emptyIcon="🏠"
      />
    </section>
  )
}

function StaffPage() {
  const { items: staff, loading, error } = useProtectedList('staff', 'staff')
  if (loading) return <section className="card"><h2>Staff</h2><p>Loading staff...</p></section>
  if (error) return <section className="card"><h2>Staff</h2><p className="error">{error}</p></section>
  return (
    <section className="card">
      <h2>Staff</h2>
      <Table
        headers={['ID', 'Name', 'Role', 'Contact', 'Shelter']}
        rows={staff.map((s) => [s.id, s.name, s.role, s.contact, s.shelter])}
        emptyMessage="No staff members listed yet."
        emptyIcon="👥"
      />
    </section>
  )
}

function LicensesPage() {
  const { items: licenses, loading, error } = useProtectedList('licenses', 'licenses')
  if (loading) return <section className="card"><h2>Pet Licenses</h2><p>Loading licenses...</p></section>
  if (error) return <section className="card"><h2>Pet Licenses</h2><p className="error">{error}</p></section>
  return (
    <section className="card">
      <h2>Pet Licenses</h2>
      <Table
        headers={['ID', 'Owner', 'Animal', 'Status', 'Issue Date', 'Expiry Date']}
        rows={licenses.map((l) => [l.id, l.ownername, l.animal, l.status, l.issueDate, l.expiryDate])}
        emptyMessage="No pet licenses on record yet."
        emptyIcon="📄"
      />
    </section>
  )
}

function MedicalPage() {
  const { items: records, loading, error } = useProtectedList('medical', 'medicalRecords')
  if (loading) return <section className="card"><h2>Medical Records</h2><p>Loading medical records...</p></section>
  if (error) return <section className="card"><h2>Medical Records</h2><p className="error">{error}</p></section>
  return (
    <section className="card">
      <h2>Medical Records</h2>
      <Table
        headers={['Record ID', 'Animal', 'Treatment', 'Vaccination Date', 'Next Checkup', 'Vet']}
        rows={records.map((r) => [r.id, r.animal, r.treatment, r.vaccinationDate, r.nextCheckupDate, r.vet])}
        emptyMessage="No medical records added yet."
        emptyIcon="🩺"
      />
    </section>
  )
}

function EmptyState({ message, icon = '📋' }) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden>{icon}</span>
      <p>{message}</p>
    </div>
  )
}

function Table({ headers, rows, emptyMessage, emptyIcon }) {
  const statusValues = new Set(['Pending', 'Ongoing', 'Resolved', 'Approved', 'Rejected', 'Available', 'Adopted', 'Medical Care', 'Quarantined', 'Expired', 'Valid', 'Active', 'Low', 'Medium', 'High'])

  const renderCell = (cell) => {
    if (typeof cell === 'string' && statusValues.has(cell)) {
      const cls = cell.toLowerCase().replace(/\s+/g, '-')
      return <span className={`status-pill ${cls}`}>{cell}</span>
    }
    return cell
  }

  if (!rows.length && emptyMessage) {
    return <EmptyState message={emptyMessage} icon={emptyIcon} />
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {row.map((cell, cellIdx) => (
                <td key={`${idx}-${cellIdx}`}>{renderCell(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default App
