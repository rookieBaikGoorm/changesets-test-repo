import './Footer.css'

export function Footer() {
  const version = '0.4.2'
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-content">
        <p className="footer-text">
          Changesets Test Repo v{version}
        </p>
        <p className="footer-text">
          © {year} All rights reserved
        </p>
      </div>
    </footer>
  )
}
