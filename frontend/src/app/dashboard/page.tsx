import { auth } from '@/auth';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name ?? session?.user?.email ?? 'User';
  const userEmail = session?.user?.email;

  return (
    <div className="dashboard">
      <h1>Waves Dashboard</h1>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Welcome, {userName}
      </p>

      <div className="dashboard__grid">
        {/* Forms Card */}
        <Link href="/forms" className="card dashboard__card" style={{ display: 'block', padding: '1.5rem', textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>My Forms</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            View and fill your assigned forms.
          </p>
        </Link>

        {/* Admin Card - shown only if user might be admin */}
        <Link href="/admin" className="card dashboard__card" style={{ display: 'block', padding: '1.5rem', textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Administration</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Manage collections, forms, sections, and questions.
          </p>
        </Link>
      </div>

      {/* Session Info */}
      <div className="card" style={{ marginTop: '1.5rem', padding: '1rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Session Info</h3>
        <dl style={{ fontSize: '0.875rem', color: '#374151' }}>
          <dt style={{ fontWeight: 500 }}>Name</dt>
          <dd style={{ marginLeft: 0, marginBottom: '0.5rem' }}>{userName}</dd>
          {userEmail && (
            <>
              <dt style={{ fontWeight: 500 }}>Email</dt>
              <dd style={{ marginLeft: 0, marginBottom: '0.5rem' }}>{userEmail}</dd>
            </>
          )}
          <dt style={{ fontWeight: 500 }}>Organisation ID</dt>
          <dd style={{ marginLeft: 0 }}>{session?.organisationId ?? 'N/A'}</dd>
        </dl>
      </div>
    </div>
  );
}
