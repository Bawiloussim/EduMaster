import { Link } from 'react-router-dom';
import { GraduationCap, Mail } from 'lucide-react';
import { CLASSES } from '../../utils/schoolData';

export default function Footer() {
  return (
    <footer className="bg-primary text-brand-light">
      <div className="max-w-7xl mx-auto px-4 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 bg-white/10 rounded-lg flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-brand" />
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-white text-lg leading-none block">Edu</span>
              <span className="font-extrabold text-brand text-lg leading-none block -mt-1">Master</span>
            </div>
          </Link>
          <p className="text-sm leading-relaxed">
            La plateforme scolaire du secondaire, gratuite et accessible partout dans le monde.
          </p>
        </div>

        <div>
          <h3 className="text-white font-bold text-sm mb-4">Navigation</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/home" className="hover:text-brand transition-colors">Accueil</Link></li>
            <li><Link to="/catalog" className="hover:text-brand transition-colors">Catalogue des cours</Link></li>
            <li><Link to="/login" className="hover:text-brand transition-colors">Connexion</Link></li>
            <li><Link to="/register" className="hover:text-brand transition-colors">S'inscrire gratuitement</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-bold text-sm mb-4">Classes</h3>
          <ul className="space-y-2 text-sm">
            {CLASSES.map(c => (
              <li key={c}>
                <Link to={`/home?classe=${encodeURIComponent(c)}`} className="hover:text-brand transition-colors">{c}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-white font-bold text-sm mb-4">Contact</h3>
          <a href="mailto:contact@edumaster.app" className="flex items-center gap-2 text-sm hover:text-brand transition-colors">
            <Mail className="h-4 w-4" /> contact@edumaster.app
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-white/40 text-center">
          © {new Date().getFullYear()} EduMaster · Cours du secondaire gratuits · Accessible partout dans le monde
        </div>
      </div>
    </footer>
  );
}
