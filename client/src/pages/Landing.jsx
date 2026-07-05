import { Link } from 'react-router-dom';
import { GraduationCap, BookOpen, Award, Users, CheckCircle, Globe, ChevronRight, Play } from 'lucide-react';
import { CLASSES } from '../utils/schoolData';

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
      <div className="text-blue-200 text-sm">{label}</div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Minimal header ───────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 bg-[#003580] rounded-lg flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-[#0ea5e9]" />
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-[#003580] text-lg leading-none block">Edu</span>
              <span className="font-extrabold text-[#0ea5e9] text-lg leading-none block -mt-1">Master</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-[#003580] px-3 py-1.5 rounded-lg transition-colors">
              Connexion
            </Link>
            <Link to="/register" className="text-sm font-bold bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-5 py-2 rounded-sm transition-colors">
              S'inscrire gratuitement
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-[#003580] overflow-hidden" style={{ minHeight: '520px' }}>
        <EduPattern opacity="0.07" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 py-20 flex flex-col items-center text-center">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 bg-[#0ea5e9]/20 border border-[#0ea5e9]/40 text-[#7dd3fc] text-xs font-bold px-4 py-1.5 rounded-full mb-6">
            <Globe className="h-3.5 w-3.5" /> 100% gratuit · Accessible partout dans le monde
          </span>

          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">
            La plateforme scolaire<br />
            <span className="text-[#0ea5e9]">du secondaire gratuite</span>
          </h1>

          <p className="text-blue-200 text-lg mb-8 max-w-xl leading-relaxed">
            Cours en ligne, bulletins trimestriels et attestations — sans rien payer.
            Seconde, Première, Terminale · Séries A4 et D.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-12">
            <Link to="/register"
              className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold px-8 py-3.5 rounded-sm text-sm transition-colors flex items-center gap-2">
              Commencer gratuitement <ChevronRight className="h-4 w-4" />
            </Link>
            <Link to="/home"
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
      <section className="bg-[#002060] border-b border-[#0ea5e9]/20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-blue-300 mr-2">Parcourir :</span>
          {CLASSES.map(c => (
            <Link key={c} to={`/home?classe=${encodeURIComponent(c)}`}
              className="text-sm px-4 py-1.5 rounded-full bg-white/10 hover:bg-[#0ea5e9] text-white transition-colors font-medium">
              {c}
            </Link>
          ))}
          <span className="mx-1 text-white/20">|</span>
          <Link to="/home?serie=D" className="text-sm px-4 py-1.5 rounded-full bg-[#0ea5e9]/20 hover:bg-[#0ea5e9] border border-[#0ea5e9]/50 text-[#7dd3fc] hover:text-white transition-colors font-medium">
            Série D — Scientifique
          </Link>
          <Link to="/home?serie=A4" className="text-sm px-4 py-1.5 rounded-full bg-purple-500/20 hover:bg-purple-500 border border-purple-400/50 text-purple-300 hover:text-white transition-colors font-medium">
            Série A4 — Littéraire
          </Link>
        </div>
      </section>

      {/* ── Why EduMaster ───────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Pourquoi choisir EduMaster ?</h2>
          <p className="text-gray-500 text-sm">Une plateforme pensée pour les élèves et les professeurs du secondaire</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Feature icon={BookOpen} color="bg-[#003580]"
            title="Cours complets & structurés"
            desc="Vidéos, PDF et exercices par leçon. Progressez à votre rythme, où que vous soyez." />
          <Feature icon={Award} color="bg-[#0ea5e9]"
            title="Attestations gratuites"
            desc="Obtenez une attestation de réussite à la fin de chaque cours, sans frais." />
          <Feature icon={CheckCircle} color="bg-green-500"
            title="Bulletins automatiques"
            desc="Interrogations, devoirs et compositions générés automatiquement chaque trimestre." />
          <Feature icon={Users} color="bg-purple-600"
            title="Suivi par le professeur"
            desc="Le formateur note, corrige et suit la progression de chaque élève en temps réel." />
          <Feature icon={Globe} color="bg-orange-500"
            title="Accessible partout"
            desc="Aucune limite géographique. Apprenez depuis n'importe quel pays, sur mobile ou PC." />
          <Feature icon={GraduationCap} color="bg-rose-500"
            title="100% gratuit pour toujours"
            desc="Pas d'abonnement, pas de carte bancaire. Tous les cours, bulletins et attestations sont gratuits." />
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-10">Comment ça marche ?</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Créez votre compte', desc: 'Inscription gratuite en 30 secondes. Aucune carte bancaire requise.' },
              { step: '2', title: 'Choisissez vos cours', desc: 'Parcourez les cours par classe et série. Inscrivez-vous en un clic.' },
              { step: '3', title: 'Apprenez & progressez', desc: 'Suivez les leçons, faites les exercices et obtenez votre attestation.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center">
                <div className="h-14 w-14 rounded-full bg-[#003580] text-white text-xl font-extrabold flex items-center justify-center mb-4 shadow-lg">
                  {step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="relative bg-[#003580] overflow-hidden">
        <EduPattern opacity="0.05" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-3">Prêt à commencer ?</h2>
          <p className="text-blue-200 mb-8">Rejoignez EduMaster gratuitement et accédez à tous les cours dès aujourd'hui.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register?role=student"
              className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold px-10 py-3.5 rounded-sm text-sm transition-colors">
              Je suis élève — S'inscrire
            </Link>
            <Link to="/register?role=instructor"
              className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-10 py-3.5 rounded-sm text-sm transition-colors">
              Je suis professeur — Créer mon espace
            </Link>
          </div>
          <p className="mt-6 text-blue-300 text-xs">
            Déjà inscrit ?{' '}
            <Link to="/login" className="text-[#0ea5e9] hover:underline font-semibold">Se connecter</Link>
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-500 text-center py-4 text-xs">
        © 2026 EduMaster · Cours du secondaire gratuits · Accessible partout dans le monde
      </footer>
    </div>
  );
}
