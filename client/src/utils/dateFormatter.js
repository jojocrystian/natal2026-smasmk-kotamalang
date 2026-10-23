/**
 * Indonesian Date & Time Utilities
 * Guarantees proper date parsing without UTC day-shifting issues.
 * Formats using Intl.DateTimeFormat (id-ID) in Asia/Jakarta timezone.
 */

export function formatIndonesianDate(dateStr) {
  if (!dateStr) return 'Rabu, 28 Januari 2026';

  try {
    const trimmed = String(dateStr).trim();

    // If it's already an Indonesian verbal date starting with a day name
    if (/^(senin|selasa|rabu|kamis|jumat|sabtu|minggu)/i.test(trimmed)) {
      return trimmed;
    }

    let year, month, day;

    // Check if string starts with YYYY-MM-DD
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      year = parseInt(ymdMatch[1], 10);
      month = parseInt(ymdMatch[2], 10) - 1; // 0-indexed
      day = parseInt(ymdMatch[3], 10);
    } else {
      // Check if it's DD/MM/YYYY or DD-MM-YYYY
      const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (dmyMatch) {
        day = parseInt(dmyMatch[1], 10);
        month = parseInt(dmyMatch[2], 10) - 1;
        year = parseInt(dmyMatch[3], 10);
      }
    }

    let dateObj;
    if (year && !isNaN(month) && day) {
      // Create local noon date to avoid any timezone boundary slips
      dateObj = new Date(year, month, day, 12, 0, 0);
    } else {
      dateObj = new Date(trimmed);
    }

    if (isNaN(dateObj.getTime())) {
      return trimmed;
    }

    const formatter = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
    });

    return formatter.format(dateObj);
  } catch (err) {
    console.warn('Error formatting date:', err);
    return String(dateStr);
  }
}

/**
 * Format registration status and capacity
 */
export function getRegistrationStatus(event) {
  if (!event) {
    return {
      status: 'open',
      badgeText: 'Pendaftaran Acara Resmi Dibuka',
      badgeColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      canRegister: true,
      buttonText: 'Daftar Sekarang'
    };
  }

  const registered = Number(event.registered_count || 0);
  const quota = Number(event.quota || 500);
  const rawStatus = (event.registration_status || 'open').toLowerCase();

  if (rawStatus === 'closed') {
    return {
      status: 'closed',
      badgeText: 'Pendaftaran Ditutup',
      badgeColor: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      canRegister: false,
      buttonText: 'Pendaftaran Ditutup'
    };
  }

  if (rawStatus === 'upcoming') {
    return {
      status: 'upcoming',
      badgeText: 'Pendaftaran Segera Dibuka',
      badgeColor: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
      canRegister: false,
      buttonText: 'Segera Dibuka'
    };
  }

  if (quota > 0 && registered >= quota) {
    return {
      status: 'full',
      badgeText: 'Kuota Pendaftaran Penuh (500/500)',
      badgeColor: 'bg-red-500/10 border-red-500/30 text-red-400',
      canRegister: false,
      buttonText: 'Kuota Penuh'
    };
  }

  if (quota > 0 && registered >= quota * 0.8) {
    const remaining = quota - registered;
    return {
      status: 'almost_full',
      badgeText: `Kuota Hampir Penuh (Sisa ${remaining} Kursi)`,
      badgeColor: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      canRegister: true,
      buttonText: 'Daftar Sekarang (Sisa Sedikit)'
    };
  }

  return {
    status: 'open',
    badgeText: 'Pendaftaran Acara Resmi Dibuka',
    badgeColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    canRegister: true,
    buttonText: 'Daftar Sekarang'
  };
}
