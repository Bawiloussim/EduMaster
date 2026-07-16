import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, BookOpen, Award, Users, CheckCircle, Globe, ChevronRight, Play, LayoutDashboard, Video, ClipboardCheck, BarChart3, UserPlus, Megaphone, Menu, X, LogIn, Search, FileText, UploadCloud, Building2, Layers } from 'lucide-react';
import { CLASSES } from '../utils/schoolData';
import { useAuthStore } from '../store/useAuthStore';
import Footer from '../components/layout/Footer';

/* ── Per-role usage guide ────────────────────────────────────────────────
   Detailed enough that someone who has never seen the site (or knows
   nothing about web apps) can follow it unassisted, from registration to
   the last thing they'd do in their space. */
const ROLE_GUIDES = {
  student: {
    label: 'Élève',
    emoji: '📚',
    color: 'bg-primary',
    registerRole: 'student',
    tagline: "De l'inscription à l'attestation : tout ce qu'un élève peut faire sur EduMaster.",
    steps: [
      { icon: LogIn, title: 'Créer votre compte', desc: 'Cliquez sur « S\'inscrire gratuitement » en haut de cette page, choisissez le profil « Apprenant », puis indiquez votre établissement (déjà inscrit sur EduMaster), votre classe et votre série si besoin.' },
      { icon: LogIn, title: 'Vous connecter la prochaine fois', desc: 'Revenez sur cette page et cliquez sur « Connexion », entrez votre email et votre mot de passe (ou utilisez le bouton Google si votre établissement l\'a activé).' },
      { icon: LayoutDashboard, title: 'Découvrir votre espace', desc: 'Une fois connecté, cliquez sur « Mon espace » en haut à droite : vous y retrouvez vos cours, vos notes et vos attestations en un seul endroit.' },
      { icon: Search, title: 'Choisir vos cours', desc: 'Ouvrez le « Catalogue », parcourez les cours proposés pour votre classe et cliquez sur « S\'inscrire » pour ajouter un cours à votre espace.' },
      { icon: Play, title: 'Suivre les leçons', desc: 'Dans un cours, ouvrez chaque leçon : vidéo à regarder, support PDF à consulter et exercices à faire, dans l\'ordre proposé par votre professeur.' },
      { icon: FileText, title: 'Consulter le sujet d\'une évaluation', desc: 'Quand votre professeur publie une interrogation, un devoir ou une composition, ouvrez d\'abord le sujet PDF envoyé pour savoir ce qui est demandé.' },
      { icon: UploadCloud, title: 'Envoyer votre copie', desc: 'Une fois le sujet lu, cliquez sur « Envoyer ma copie », choisissez votre réponse au format PDF sur votre appareil et validez avant la date limite.' },
      { icon: Award, title: 'Suivre vos résultats', desc: 'Dès que votre professeur a corrigé, retrouvez vos notes, votre bulletin trimestriel et téléchargez votre attestation de réussite en fin de cours.' },
    ],
  },
  instructor: {
    label: 'Formateur',
    emoji: '🎓',
    color: 'bg-brand',
    registerRole: 'instructor',
    tagline: "De l'inscription à la correction des copies : le parcours complet d'un formateur.",
    steps: [
      { icon: LogIn, title: 'Créer votre compte', desc: 'Cliquez sur « S\'inscrire gratuitement », choisissez le profil « Formateur » et sélectionnez l\'établissement qui vous a communiqué son nom.' },
      { icon: LogIn, title: 'Vous connecter', desc: 'Revenez ensuite sur cette page et cliquez sur « Connexion » avec votre email et votre mot de passe pour retrouver votre espace à tout moment.' },
      { icon: Users, title: 'Retrouver vos classes et matières', desc: 'Le chef d\'établissement vous affecte une ou plusieurs matières sur une ou plusieurs classes ; elles apparaissent automatiquement dans votre espace, sans rien à configurer.' },
      { icon: Video, title: 'Créer un cours', desc: 'Pour chaque matière/classe affectée, créez un cours et ajoutez vos leçons : vidéo, support PDF, et exercices que l\'IA peut générer automatiquement pour vous.' },
      { icon: CheckCircle, title: 'Publier le cours', desc: 'Quand votre cours est prêt, cliquez sur « Publier » pour le rendre visible aux élèves de la classe concernée.' },
      { icon: ClipboardCheck, title: 'Créer une évaluation', desc: 'Ajoutez une interrogation, un devoir ou une composition, déposez le sujet en PDF : vos élèves doivent le consulter avant de pouvoir répondre.' },
      { icon: FileText, title: 'Corriger les copies', desc: 'Consultez les copies PDF envoyées par vos élèves, attribuez une note et déposez la correction pour qu\'ils la consultent.' },
      { icon: BarChart3, title: 'Suivre la progression', desc: 'Visualisez à tout moment les statistiques de réussite et l\'avancement de chacune de vos classes.' },
    ],
  },
  admin: {
    label: "Chef d'établissement",
    emoji: '🏫',
    color: 'bg-purple-600',
    registerRole: 'admin',
    tagline: "De l'inscription à la gestion quotidienne : le parcours complet d'un chef d'établissement.",
    steps: [
      { icon: LogIn, title: 'Créer votre compte', desc: 'Cliquez sur « S\'inscrire gratuitement », choisissez le profil « Chef d\'établissement » et remplissez vos informations personnelles — aucune école n\'est requise à cette étape.' },
      { icon: Building2, title: 'Renseigner votre établissement', desc: 'Un assistant pas à pas s\'ouvre automatiquement : indiquez le nom de votre école, son logo et ses coordonnées, puis l\'année scolaire en cours.' },
      { icon: Layers, title: 'Créer vos classes', desc: 'Toujours dans l\'assistant, cochez d\'un clic toutes les classes de votre établissement (collège et lycée, avec leurs séries si besoin) : elles sont créées d\'un coup.' },
      { icon: UserPlus, title: 'Ajouter enseignants et élèves', desc: 'Ajoutez-les un par un avec un formulaire simple, ou importez toute une liste en une fois grâce à un fichier CSV.' },
      { icon: BookOpen, title: 'Créer les matières et les affecter', desc: 'Ajoutez les matières enseignées, puis pour chaque enseignant, sélectionnez la matière et cochez toutes les classes où il enseigne : l\'affectation se fait pour toutes ces classes en un seul clic.' },
      { icon: LayoutDashboard, title: 'Terminer l\'assistant', desc: 'Une fois ces étapes faites, cliquez sur « Terminer » pour accéder à votre tableau de bord complet — vous pourrez toujours revenir modifier chaque élément plus tard.' },
      { icon: BarChart3, title: 'Suivre le palmarès et les statistiques', desc: 'Consultez à tout moment le classement des élèves et les statistiques de réussite de chaque classe.' },
      { icon: Megaphone, title: 'Publier des annonces et régler les paramètres', desc: 'Informez toute l\'école d\'un événement en un message, et ajustez à tout moment le logo, les couleurs ou la devise de l\'établissement dans « Paramètres ».' },
    ],
  },
};

function RoleGuide() {
  const [active, setActive] = useState('student');
  const guide = ROLE_GUIDES[active];

  return (
    <section id="guide" className="max-w-7xl mx-auto px-4 py-16 scroll-mt-16">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Guide d'utilisation</h2>
        <p className="text-gray-500 text-sm">Trois profils, chacun avec son propre espace</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-8 flex-wrap">
        {Object.entries(ROLE_GUIDES).map(([key, r]) => (
          <button key={key} type="button" onClick={() => setActive(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold border transition-colors ${active === key
              ? `${r.color} text-white border-transparent`
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            <span>{r.emoji}</span> {r.label}
          </button>
        ))}
      </div>

      {/* Active role content — vertical numbered walkthrough */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 sm:p-8 max-w-3xl mx-auto">
        <p className="text-center text-gray-600 font-medium mb-8">{guide.tagline}</p>
        <ol className="relative border-l-2 border-gray-200 ml-4 space-y-7">
          {guide.steps.map(({ icon: Icon, title, desc }, i) => (
            <li key={title} className="relative pl-8">
              <span className={`absolute left-[-1.15rem] top-0 h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-gray-50 ${guide.color}`}>
                <Icon className="h-4 w-4 text-white" />
              </span>
              <div className="text-xs font-bold text-gray-400 mb-0.5">Étape {i + 1}</div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </li>
          ))}
        </ol>
        <div className="text-center mt-9">
          <Link to={`/register?role=${guide.registerRole}`}
            className={`inline-flex items-center gap-2 text-white font-bold px-8 py-3 rounded-sm text-sm transition-colors ${guide.color} hover:opacity-90`}>
            Créer mon compte {guide.label} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Diamond education pattern (same as Home) ───────────────────── */
function EduPattern({ opacity = '0.06' }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{
        opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M30 5L5 20v10l25 15 25-15V20L30 5zm0 4l21 12.5v8L30 41.5 9 29.5v-8L30 9zm0 4L13 22.5v4L30 37l17-10.5v-4L30 13z'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: '60px 60px',
      }} />
  );
}

/* ── Feature card ────────────────────────────────────────────────── */
function Feature({ icon: Icon, color, title, desc }) {
  return (
    <div className="flex gap-4 p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <h3 className="font-bold text-gray-900 text-sm mb-1">{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

/* ── Stat ────────────────────────────────────────────────────────── */
function Stat({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-extrabold text-white mb-1">{value}</div>
      <div className="text-brand-light text-sm">{label}</div>
    </div>
  );
}

const NAV_LINKS = [
  { href: '#pourquoi', label: 'Pourquoi EduMaster' },
  { href: '#comment-ca-marche', label: 'Comment ça marche' },
  { href: '#guide', label: "Guide d'utilisation" },
  { href: '/home', label: 'Catalogue des cours', isRoute: true },
];

export default function Landing() {
  const { user } = useAuthStore();
  const dashLink = user?.role === 'superadmin' ? '/superadmin' : user?.role === 'admin' ? '/admin' : user?.role === 'instructor' ? '/instructor' : '/student';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Header with navigation menu ─────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="h-9 w-9 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-brand" />
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-primary text-lg leading-none block">Edu</span>
              <span className="font-extrabold text-brand text-lg leading-none block -mt-1">Master</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => l.isRoute ? (
              <Link key={l.href} to={l.href}
                className="text-sm font-medium text-gray-600 hover:text-primary px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                {l.label}
              </Link>
            ) : (
              <a key={l.href} href={l.href}
                className="text-sm font-medium text-gray-600 hover:text-primary px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-3">
              {user ? (
                <Link to={dashLink} className="flex items-center gap-2 text-sm font-bold bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded-sm transition-colors">
                  <LayoutDashboard className="h-4 w-4" /> Mon espace
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-primary px-3 py-1.5 rounded-lg transition-colors">
                    Connexion
                  </Link>
                  <Link to="/register" className="text-sm font-bold bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded-sm transition-colors">
                    S'inscrire gratuitement
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button type="button" onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors" aria-label="Menu">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav panel */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {NAV_LINKS.map((l) => l.isRoute ? (
              <Link key={l.href} to={l.href} onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium text-gray-700 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                {l.label}
              </Link>
            ) : (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium text-gray-700 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                {l.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2 mt-2 border-t border-gray-100">
              {user ? (
                <Link to={dashLink} onClick={() => setMenuOpen(false)} className="flex items-center justify-center gap-2 text-sm font-bold bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-sm transition-colors">
                  <LayoutDashboard className="h-4 w-4" /> Mon espace
                </Link>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="text-center text-sm font-medium text-gray-700 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 transition-colors">
                    Connexion
                  </Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)} className="text-center text-sm font-bold bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-sm transition-colors">
                    S'inscrire gratuitement
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-primary overflow-hidden" style={{ minHeight: '520px' }}>
        <EduPattern opacity="0.07" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 py-20 flex flex-col items-center text-center">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 bg-brand/20 border border-brand/40 text-brand-light text-xs font-bold px-4 py-1.5 rounded-full mb-6">
            <Globe className="h-3.5 w-3.5" /> 100% gratuit · Accessible partout dans le monde
          </span>

          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">
            La plateforme scolaire<br />
            <span className="text-brand">du secondaire gratuite</span>
          </h1>

          <p className="text-brand-light text-lg mb-8 max-w-xl leading-relaxed">
            Cours en ligne, bulletins trimestriels et attestations — sans rien payer.
            Seconde, Première, Terminale · Séries A4 et D.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-12">
            {user ? (
              <Link to={dashLink}
                className="bg-brand hover:bg-brand-dark text-white font-bold px-8 py-3.5 rounded-sm text-sm transition-colors flex items-center gap-2">
                Accéder à mon espace <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link to="/register"
                className="bg-brand hover:bg-brand-dark text-white font-bold px-8 py-3.5 rounded-sm text-sm transition-colors flex items-center gap-2">
                Commencer gratuitement <ChevronRight className="h-4 w-4" />
              </Link>
            )}
            <Link to={user ? '/catalog' : '/home'}
              className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-8 py-3.5 rounded-sm text-sm transition-colors flex items-center gap-2">
              <Play className="h-4 w-4" /> Voir les cours
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-8 w-full max-w-md">
            <Stat value="100%" label="Gratuit" />
            <Stat value="3" label="Classes" />
            <Stat value="2" label="Séries" />
          </div>
        </div>
      </section>

      {/* ── Classes navigation ───────────────────────────────────────── */}
      <section className="bg-primary-dark border-b border-brand/20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-brand-light mr-2">Parcourir :</span>
          {CLASSES.map(c => (
            <Link key={c} to={`/home?classe=${encodeURIComponent(c)}`}
              className="text-sm px-4 py-1.5 rounded-full bg-white/10 hover:bg-brand text-white transition-colors font-medium">
              {c}
            </Link>
          ))}
          <span className="mx-1 text-white/20">|</span>
          <Link to="/home?serie=D" className="text-sm px-4 py-1.5 rounded-full bg-brand/20 hover:bg-brand border border-brand/50 text-brand-light hover:text-white transition-colors font-medium">
            Série D — Scientifique
          </Link>
          <Link to="/home?serie=A4" className="text-sm px-4 py-1.5 rounded-full bg-purple-500/20 hover:bg-purple-500 border border-purple-400/50 text-purple-300 hover:text-white transition-colors font-medium">
            Série A4 — Littéraire
          </Link>
        </div>
      </section>

      {/* ── Why EduMaster ───────────────────────────────────────────── */}
      <section id="pourquoi" className="max-w-7xl mx-auto px-4 py-16 scroll-mt-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Pourquoi choisir EduMaster ?</h2>
          <p className="text-gray-500 text-sm">Une plateforme pensée pour les élèves et les professeurs du secondaire</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Feature icon={BookOpen} color="bg-primary"
            title="Cours complets & structurés"
            desc="Vidéos, PDF et exercices par leçon. Progressez à votre rythme, où que vous soyez." />
          <Feature icon={Award} color="bg-brand"
            title="Attestations gratuites"
            desc="Obtenez une attestation de réussite à la fin de chaque cours, sans frais." />
          <Feature icon={CheckCircle} color="bg-success"
            title="Bulletins automatiques"
            desc="Interrogations, devoirs et compositions générés automatiquement chaque trimestre." />
          <Feature icon={Users} color="bg-purple-600"
            title="Suivi par le professeur"
            desc="Le formateur note, corrige et suit la progression de chaque élève en temps réel." />
          <Feature icon={Globe} color="bg-warning"
            title="Accessible partout"
            desc="Aucune limite géographique. Apprenez depuis n'importe quel pays, sur mobile ou PC." />
          <Feature icon={GraduationCap} color="bg-rose-500"
            title="100% gratuit pour toujours"
            desc="Pas d'abonnement, pas de carte bancaire. Tous les cours, bulletins et attestations sont gratuits." />
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="comment-ca-marche" className="bg-gray-50 py-14 scroll-mt-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-10">Comment ça marche ?</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Créez votre compte', desc: 'Inscription gratuite en 30 secondes. Aucune carte bancaire requise.' },
              { step: '2', title: 'Choisissez vos cours', desc: 'Parcourez les cours par classe et série. Inscrivez-vous en un clic.' },
              { step: '3', title: 'Apprenez & progressez', desc: 'Suivez les leçons, faites les exercices et obtenez votre attestation.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center">
                <div className="h-14 w-14 rounded-full bg-primary text-white text-xl font-extrabold flex items-center justify-center mb-4 shadow-lg">
                  {step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Usage guide by profile ───────────────────────────────────── */}
      <RoleGuide />

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="relative bg-primary overflow-hidden">
        <EduPattern opacity="0.05" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-16 text-center">
          {user ? (
            <>
              <h2 className="text-3xl font-extrabold text-white mb-3">Content de vous revoir, {user.name} !</h2>
              <p className="text-brand-light mb-8">Retrouvez vos cours, bulletins et attestations dans votre espace.</p>
              <Link to={dashLink}
                className="inline-block bg-brand hover:bg-brand-dark text-white font-bold px-10 py-3.5 rounded-sm text-sm transition-colors">
                Accéder à mon espace
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-extrabold text-white mb-3">Prêt à commencer ?</h2>
              <p className="text-brand-light mb-8">Rejoignez EduMaster gratuitement et accédez à tous les cours dès aujourd'hui.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/register?role=student"
                  className="bg-brand hover:bg-brand-dark text-white font-bold px-10 py-3.5 rounded-sm text-sm transition-colors">
                  Je suis élève — S'inscrire
                </Link>
                <Link to="/register?role=admin"
                  className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-10 py-3.5 rounded-sm text-sm transition-colors">
                  Je suis un établissement — Inscrire mon école
                </Link>
              </div>
              <p className="mt-6 text-brand-light text-xs">
                Déjà inscrit ?{' '}
                <Link to="/login" className="text-brand hover:underline font-semibold">Se connecter</Link>
              </p>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
