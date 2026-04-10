import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'

const SESSION_KEY = 'awo_session'
const TOKEN_KEY = 'awo_token'
const API_BASE = 'http://localhost:5000/api'

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
          <ProtectedRoute session={session}>
            <PortalRouter session={session} onLogout={auth.logout} />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function ProtectedRoute({ session, children }) {
  if (!session) return <Navigate to="/login" replace />
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
      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Signup</h2>
        <p>Create a new account.</p>
        <input placeholder="Full Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
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
    <PortalLayout title="AWO Staff Portal" onLogout={onLogout} navItems={[
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
    <PortalLayout title="AWO User Portal" onLogout={onLogout} navItems={[
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

function PortalLayout({ title, onLogout, navItems, children }) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>{title}</h1>
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
  }, [endpoint, key])

  return { items, loading, error }
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
          <article key={s.key} className="card">
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
      {canManage && showHistory && (
        <>
          <h3 style={{ marginTop: '1rem' }}>Adoptions History</h3>
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

  const markResolved = async (reportId) => {
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
        body: JSON.stringify({ status: 'Resolved' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update rescue report.')
      setActionMsg(data.message || 'Rescue report updated.')
      setRescues((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: 'Resolved' } : r)))
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
                    {r.status !== 'Resolved' ? (
                      <button className="btn-success" onClick={() => markResolved(r.id)}>Mark Resolved</button>
                    ) : (
                      'Done'
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canManage && showHistory && (
        <>
          <h3 style={{ marginTop: '1rem' }}>Rescue History</h3>
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
        </>
      )}
    </section>
  )
}

function UserAdoptionsPage() {
  const { items: adoptions, loading, error } = useProtectedList('adoptions/mine', 'adoptions')
  if (loading) return <section className="card"><h2>My Adoptions</h2><p>Loading your adoptions...</p></section>
  if (error) return <section className="card"><h2>My Adoptions</h2><p className="error">{error}</p></section>
  return (
    <section className="card">
      <h2>My Adoptions</h2>
      <Table
        headers={['Animal', 'Status']}
        rows={adoptions.map((a) => [a.animal, a.status])}
      />
    </section>
  )
}

function UserLicensesPage() {
  const { items: licenses, loading, error } = useProtectedList('licenses/mine', 'licenses')
  if (loading) return <section className="card"><h2>My Pet Licenses</h2><p>Loading your licenses...</p></section>
  if (error) return <section className="card"><h2>My Pet Licenses</h2><p className="error">{error}</p></section>
  return (
    <section className="card">
      <h2>My Pet Licenses</h2>
      <Table
        headers={['Animal', 'Status', 'Issue Date', 'Expiry Date']}
        rows={licenses.map((l) => [l.animal, l.status, l.issueDate, l.expiryDate])}
      />
    </section>
  )
}

function UserRescuesPage() {
  const { items: fetchedRescues, loading, error } = useProtectedList('rescues/mine', 'rescues')
  const [rescues, setRescues] = useState([])
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState('Medium')
  const [submitMsg, setSubmitMsg] = useState('')
  const [submitErr, setSubmitErr] = useState('')

  useEffect(() => {
    setRescues(fetchedRescues)
  }, [fetchedRescues])

  const submitReport = async (e) => {
    e.preventDefault()
    setSubmitMsg('')
    setSubmitErr('')
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const res = await fetch(`${API_BASE}/rescues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ location, description, urgency }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to submit report.')
      setSubmitMsg('Rescue report submitted.')
      setLocation('')
      setDescription('')
      setUrgency('Medium')
      setRescues((prev) => [
        ...prev,
        {
          id: `new-${Date.now()}`,
          area: location,
          description: description || '',
          urgency,
          status: 'Pending',
        },
      ])
    } catch (err) {
      setSubmitErr(err.message)
    }
  }

  return (
    <>
      <section className="card">
        <h2>Report Rescue</h2>
        <form className="inline-form" onSubmit={submitReport}>
          <input
            placeholder="Rescue location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
          <input
            placeholder="Short description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <button type="submit">Submit Report</button>
        </form>
        {submitMsg && <p className="success">{submitMsg}</p>}
        {submitErr && <p className="error">{submitErr}</p>}
      </section>

      {loading && <section className="card"><h2>My Rescue Reports</h2><p>Loading your reports...</p></section>}
      {error && <section className="card"><h2>My Rescue Reports</h2><p className="error">{error}</p></section>}
      {!loading && !error && (
        <section className="card">
          <h2>My Rescue Reports</h2>
          <Table
            headers={['Report ID', 'Location', 'Description', 'Urgency', 'Status']}
            rows={rescues.map((r, idx) => [idx + 1, r.area, r.description || '-', r.urgency, r.status])}
          />
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
      <section className="card">
        <h2>Browse Animals by Shelter</h2>
        <p>Select a shelter from the list:</p>
        <div className="shelter-list">
          {shelters.map((s) => (
            <button
              key={s.id}
              className={`shelter-item ${String(s.id) === String(selectedShelter) ? 'active' : ''}`}
              onClick={() => setSelectedShelter(String(s.id))}
            >
              {s.name} ({s.location})
            </button>
          ))}
        </div>
      </section>

      {selectedShelter && loadingAnimals && <section className="card"><p>Loading animals...</p></section>}
      {animalsError && <section className="card"><p className="error">{animalsError}</p></section>}
      {selectedShelter && !loadingAnimals && !animalsError && (
        <section className="card">
          <h2>Animals in Selected Shelter</h2>
          {adoptMsg && <p className="success">{adoptMsg}</p>}
          {adoptErr && <p className="error">{adoptErr}</p>}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Species</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {animals.map((a, idx) => (
                  <tr key={a.id}>
                    <td>{idx + 1}</td>
                    <td>{a.name}</td>
                    <td>{a.species}</td>
                    <td>{a.status}</td>
                    <td>
                      {a.status === 'Available' ? (
                        <button onClick={() => requestAdoption(a.id)}>Adopt</button>
                      ) : (
                        'N/A'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      />
    </section>
  )
}

function Table({ headers, rows }) {
  const statusValues = new Set(['Pending', 'Ongoing', 'Resolved', 'Approved', 'Rejected', 'Available', 'Adopted', 'Medical Care', 'Quarantined', 'Expired', 'Valid'])

  const renderCell = (cell) => {
    if (typeof cell === 'string' && statusValues.has(cell)) {
      const cls = cell.toLowerCase().replace(/\s+/g, '-')
      return <span className={`status-pill ${cls}`}>{cell}</span>
    }
    return cell
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
