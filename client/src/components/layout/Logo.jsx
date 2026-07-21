// Shared brand mark — the icon graphic already carries its own colors, so it
// renders directly with no colored badge/background behind it.
export default function LogoMark({ className = 'h-9 w-9' }) {
  return <img src="/logo-icon.png" alt="EduMaster" className={`${className} object-contain shrink-0`} />;
}
