import loginGreenBackground from '../../assets/login-green-bg.jpg';
import { FiCheck as Check, FiShield as ShieldCheck } from 'react-icons/fi';

function AuthLayout({ children }) {
  return (
    <div className="auth-page auth-reference-page">
      <main className="auth-shell auth-reference-shell">
        <section
          className="auth-art auth-image-art"
          style={{ backgroundImage: `url(${loginGreenBackground})` }}
        >
          <div className="auth-brand-top">
            <span className="auth-brand-icon"><ShieldCheck className="h-6 w-6" /></span>
            <span>
              <strong>COMPLIANCE SYSTEM</strong>
              <small>Compliance Management Platform</small>
            </span>
          </div>

          <div className="auth-brand-copy">
            <span className="auth-brand-kicker">Secure digital workspace</span>
            <h2>One workspace.<br />Complete control.</h2>
            <p>Manage clients, filings, portal uploads and approval workflows securely from one place.</p>
            <div className="auth-brand-points">
              <span><Check className="h-4 w-4" /> Role-based access</span>
              <span><Check className="h-4 w-4" /> Audit ready</span>
            </div>
          </div>
        </section>

        <section className="auth-form-panel auth-reference-form">
          <div className="w-full max-w-[500px]">{children}</div>
        </section>
      </main>
    </div>
  );
}

export default AuthLayout;
