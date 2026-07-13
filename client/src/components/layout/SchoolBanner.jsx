import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { School, BadgeCheck, ArrowRight } from 'lucide-react';

const fadeIn = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
};

/**
 * Shown at the top of a user's own space so they always know which
 * établissement their account (and everything they see) belongs to.
 */
export default function SchoolBanner({ school }) {
  if (!school) {
    return (
      <motion.div
        {...fadeIn}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-6"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <School className="h-5 w-5 text-gray-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Mon établissement</p>
            <p className="text-sm text-gray-500 mt-0.5">Aucun établissement associé.</p>
          </div>
        </div>
        <Link
          to="/register"
          className="shrink-0 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg transition-colors"
        >
          Rejoindre un établissement <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    );
  }

  const verified = school.status === 'active';

  return (
    <motion.div
      {...fadeIn}
      whileHover={{ y: -2 }}
      className="group relative flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md px-5 py-4 mb-6 overflow-hidden transition-shadow duration-300"
    >
      {/* Subtle brand wash on hover — kept behind the content */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand/[0.04] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative h-12 w-12 rounded-xl bg-primary flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
        <School className="h-6 w-6 text-brand" />
      </div>

      <div className="relative min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Mon établissement</p>
        <p className="text-lg sm:text-xl font-bold text-gray-900 truncate mt-0.5">{school.name}</p>
      </div>

      {verified && (
        <span className="relative shrink-0 hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-success bg-success-light px-3 py-1.5 rounded-full">
          <BadgeCheck className="h-3.5 w-3.5" /> Établissement vérifié
        </span>
      )}
    </motion.div>
  );
}
