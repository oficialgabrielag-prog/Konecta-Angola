import React from 'react';
import { ShieldCheck, Check, Sparkles, Building2 } from 'lucide-react';
import { Profile, Organization } from '../types';

interface UserBadgeProps {
  profile?: Partial<Profile> | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showPlan?: boolean;
  showLabel?: boolean;
  className?: string;
}

/**
 * Checks whether personal verification is currently active and unexpired.
 */
export function isUserVerified(profile?: Partial<Profile> | null): boolean {
  if (!profile) return false;
  const isFlagged = Boolean(profile.is_verified || profile.badge_type === 'verified');
  if (!isFlagged) return false;

  if (profile.verified_until) {
    const expiry = new Date(profile.verified_until).getTime();
    if (!isNaN(expiry) && expiry <= Date.now()) {
      return false; // Expired
    }
  }
  return true;
}

/**
 * Checks whether organization verification is currently active and unexpired.
 */
export function isOrgVerified(organization?: Partial<Organization> | null): boolean {
  if (!organization) return false;
  const isFlagged = Boolean(
    organization.verification_status === 'verified' ||
    organization.verified === true
  );
  if (!isFlagged) return false;

  if (organization.verified_until) {
    const expiry = new Date(organization.verified_until).getTime();
    if (!isNaN(expiry) && expiry <= Date.now()) {
      return false; // Expired
    }
  }
  return true;
}

export const UserBadge: React.FC<UserBadgeProps> = ({
  profile,
  size = 'sm',
  showPlan = false,
  showLabel = false,
  className = ''
}) => {
  const verified = isUserVerified(profile);
  const planName = profile?.active_plan_name;

  if (!verified && (!showPlan || !planName)) {
    return null;
  }

  const sizeClasses = {
    xs: { icon: 'w-3 h-3', text: 'text-[9px]', pad: 'px-1 py-0.2' },
    sm: { icon: 'w-3.5 h-3.5', text: 'text-[10px]', pad: 'px-1.5 py-0.5' },
    md: { icon: 'w-4 h-4', text: 'text-xs', pad: 'px-2 py-0.5' },
    lg: { icon: 'w-5 h-5', text: 'text-sm', pad: 'px-2.5 py-1' }
  }[size];

  const expiryText = profile?.verified_until
    ? ` (Válido até ${new Date(profile.verified_until).toLocaleDateString('pt-AO')})`
    : '';

  return (
    <span className={`inline-flex items-center gap-1 shrink-0 align-middle ${className}`}>
      {verified && (
        <span
          title={`Conta Pessoal Verificada${expiryText}`}
          className={`inline-flex items-center justify-center rounded-full bg-blue-600 text-white shadow-xs ${sizeClasses.pad}`}
          style={{ lineHeight: 1 }}
        >
          <svg
            className={`${sizeClasses.icon} fill-current`}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.2 14.6l-4.2-4.2 1.41-1.41 2.79 2.79 7.09-7.09 1.41 1.41-8.5 8.5z" />
          </svg>
          {showLabel && (
            <span className={`ml-1 font-bold ${sizeClasses.text}`}>Verificado</span>
          )}
        </span>
      )}

      {showPlan && planName && (
        <span
          title={`Plano Ativo: ${planName}`}
          className={`inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-black border border-amber-500/25 ${sizeClasses.text} ${sizeClasses.pad}`}
        >
          <Sparkles className="w-2.5 h-2.5" />
          <span>{planName}</span>
        </span>
      )}
    </span>
  );
};

interface OrgBadgeProps {
  organization?: Partial<Organization> | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const OrgBadge: React.FC<OrgBadgeProps> = ({
  organization,
  size = 'sm',
  showLabel = false,
  className = ''
}) => {
  const verified = isOrgVerified(organization);

  if (!verified) {
    return null;
  }

  const sizeClasses = {
    xs: { icon: 'w-3 h-3', text: 'text-[9px]', pad: 'px-1.5 py-0.5' },
    sm: { icon: 'w-3.5 h-3.5', text: 'text-[10px]', pad: 'px-2 py-0.5' },
    md: { icon: 'w-4 h-4', text: 'text-xs', pad: 'px-2.5 py-0.5' },
    lg: { icon: 'w-5 h-5', text: 'text-sm', pad: 'px-3 py-1' }
  }[size];

  const expiryText = organization?.verified_until
    ? ` (Válido até ${new Date(organization.verified_until).toLocaleDateString('pt-AO')})`
    : '';

  return (
    <span
      title={`Organização Institucional Verificada${expiryText}`}
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-xs shrink-0 align-middle ${sizeClasses.text} ${sizeClasses.pad} ${className}`}
    >
      <ShieldCheck className={`${sizeClasses.icon} shrink-0`} />
      {showLabel ? (
        <span>Instituição Oficial</span>
      ) : (
        <span className="sr-only">Verificada</span>
      )}
    </span>
  );
};
