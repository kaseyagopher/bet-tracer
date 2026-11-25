// La clé historique "3" est désactivée par TheSportsDB (403).
// Utiliser une clé personnalisée via VITE_SPORTSDB_API_KEY si besoin.
const SPORTSDB_API_KEY = import.meta.env.VITE_SPORTSDB_API_KEY || '123'
const SPORTSDB_SEARCH_URL = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/searchteams.php`

const BADGE_COLORS = [
  '#1d4ed8',
  '#0284c7',
  '#dc2626',
  '#e11d48',
  '#7c3aed',
  '#0f766e',
  '#b45309',
  '#4338ca',
]

const NAME_ALIASES = {
  psg: 'Paris Saint Germain',
  'paris saint-germain': 'Paris Saint Germain',
  om: 'Marseille',
  'olympique de marseille': 'Marseille',
  ol: 'Lyon',
  'olympique lyonnais': 'Lyon',
  losc: 'Lille',
  rcl: 'Lens',
  'rc lens': 'Lens',
  'real madrid': 'Real Madrid',
  'fc barcelona': 'Barcelona',
  barca: 'Barcelona',
  'atletico madrid': 'Atletico Madrid',
  'manchester city': 'Manchester City',
  'man city': 'Manchester City',
  'aston vill': 'Aston Villa',
}

const KNOWN_LOGOS = {
  'paris saint germain':
    'https://r2.thesportsdb.com/images/media/team/badge/rwqrrq1473504808.png/tiny',
  marseille:
    'https://r2.thesportsdb.com/images/media/team/badge/c6bazh1779212287.png/tiny',
  lyon: 'https://r2.thesportsdb.com/images/media/team/badge/blk9771656932845.png/tiny',
  monaco:
    'https://r2.thesportsdb.com/images/media/team/badge/exjf5l1678808044.png/tiny',
  lens: 'https://r2.thesportsdb.com/images/media/team/badge/3pxoum1598797195.png/tiny',
  'real madrid':
    'https://r2.thesportsdb.com/images/media/team/badge/vwvwrw1473502969.png/tiny',
  barcelona:
    'https://r2.thesportsdb.com/images/media/team/badge/wq9sir1639406443.png/tiny',
  arsenal:
    'https://r2.thesportsdb.com/images/media/team/badge/uyhbfe1612467038.png/tiny',
  galatasaray:
    'https://r2.thesportsdb.com/images/media/team/badge/io7jk21767941298.png/tiny',
  'aston villa':
    'https://r2.thesportsdb.com/images/media/team/badge/uwzw561787679026.png/tiny',
}

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const getInitials = (name) => {
  const initials = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

  return initials || '?'
}

const hashString = (value) => {
  let hash = 0
  for (const char of String(value || '')) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0
  }
  return Math.abs(hash)
}

const normalizeName = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const toApiQuery = (value) => {
  const normalized = normalizeName(value)
  if (NAME_ALIASES[normalized]) return NAME_ALIASES[normalized]
  return String(value || '')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const logoCache = new Map()
Object.entries(KNOWN_LOGOS).forEach(([name, logo]) => {
  logoCache.set(normalizeName(name), Promise.resolve(logo))
})
Object.entries(NAME_ALIASES).forEach(([alias, canonical]) => {
  const logo = KNOWN_LOGOS[normalizeName(canonical)]
  if (logo) logoCache.set(alias, Promise.resolve(logo))
})

/** Icône de repli propre (initiales) pour un nom saisi librement. */
export function getTeamFallbackBadge(name) {
  const color = BADGE_COLORS[hashString(name) % BADGE_COLORS.length]
  const initials = escapeXml(getInitials(name))

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${color}"/><text x="16" y="21" text-anchor="middle" fill="#ffffff" font-family="Arial,sans-serif" font-size="12" font-weight="bold">${initials}</text></svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** Extrait "Équipe 1" et "Équipe 2" d'un match_name, même pour les anciennes données. */
export function splitMatchName(matchName) {
  const raw = String(matchName || '').trim()
  const separator = raw.match(/\s+(?:vs\.?|[-–—])\s+/i)

  if (!separator) {
    return { team1: raw, team2: '' }
  }

  const endOfSeparator = separator.index + separator[0].length
  return {
    team1: raw.slice(0, separator.index).trim(),
    team2: raw.slice(endOfSeparator).trim(),
  }
}

/** Suggestions TheSportsDB (miniatures `/tiny` quand disponibles). */
export async function searchTeams(query, signal) {
  const search = toApiQuery(query)
  if (search.length < 2) return []

  const response = await fetch(
    `${SPORTSDB_SEARCH_URL}?t=${encodeURIComponent(search)}`,
    { signal },
  )

  if (!response.ok) {
    throw new Error(`TheSportsDB: ${response.status}`)
  }

  const payload = await response.json()
  const teams = Array.isArray(payload?.teams) ? payload.teams : []
  const uniqueTeams = new Map()

  teams.forEach((team, index) => {
    if (!team?.strTeam) return

    const name = String(team.strTeam).trim()
    const key = normalizeName(name)
    if (uniqueTeams.has(key)) return

    uniqueTeams.set(key, {
      id: team.idTeam || `${key}-${index}`,
      name,
      short: String(team.strTeamShort || '').trim() || name,
      league: String(team.strLeague || '').trim(),
      sport: String(team.strSport || '').trim(),
      logo: team.strTeamBadge ? `${team.strTeamBadge}/tiny` : '',
    })
  })

  return Array.from(uniqueTeams.values()).slice(0, 8)
}

/** Logo TheSportsDB d'une équipe déjà enregistrée, avec cache et repli silencieux. */
export function lookupTeamLogo(name) {
  const normalized = normalizeName(name)
  if (normalized.length < 3) return Promise.resolve('')
  if (logoCache.has(normalized)) return logoCache.get(normalized)

  const promise = searchTeams(name)
    .then((teams) => {
      const exact = teams.find((team) => normalizeName(team.name) === normalized)
      const partial = teams.find(
        (team) =>
          normalizeName(team.name).includes(normalized) ||
          normalized.includes(normalizeName(team.name)),
      )
      const soccerTeam = teams.find((team) => team.sport === 'Soccer')
      const logo = (exact || partial || soccerTeam || teams[0])?.logo || ''
      if (!logo) logoCache.delete(normalized)
      return logo
    })
    .catch(() => {
      logoCache.delete(normalized)
      return ''
    })

  logoCache.set(normalized, promise)
  return promise
}
