import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { searchTeams } from '../data/teams'
import TeamBadge from './TeamBadge'

const INPUT_CLASS =
  'w-full rounded border border-[#2a2e39] bg-[#131722] px-3 py-2 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none'
const LABEL_CLASS = 'mb-1 block text-xs font-semibold text-gray-400'

const createInitialForm = () => ({
  team1: '',
  team1Logo: '',
  team2: '',
  team2Logo: '',
  bet_type: 'simple',
  stake: '',
  odds: '',
  result: 'pending',
  bet_date: new Date().toISOString().slice(0, 10),
})

function TeamAutocomplete({ id, label, placeholder, value, logo, onChangeTeam }) {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const requestRef = useRef(0)
  const selectedNameRef = useRef('')
  const wrapperRef = useRef(null)
  const query = value.trim()

  useEffect(() => {
    if (query === selectedNameRef.current) {
      selectedNameRef.current = ''
      requestRef.current += 1
      return undefined
    }

    if (query.length < 2) {
      requestRef.current += 1
      return undefined
    }

    const requestId = ++requestRef.current
    const controller = new AbortController()

    const timer = window.setTimeout(async () => {
      try {
        const results = await searchTeams(query, controller.signal)
        if (requestId !== requestRef.current) return
        setSuggestions(results)
      } catch {
        if (controller.signal.aborted || requestId !== requestRef.current) return
        setSuggestions([])
      } finally {
        if (requestId === requestRef.current) setSearching(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleInputChange = (event) => {
    const nextValue = event.target.value
    onChangeTeam(nextValue, '')
    requestRef.current += 1

    if (nextValue.trim().length < 2) {
      setSuggestions([])
      setSearching(false)
    } else {
      setSearching(true)
    }

    setOpen(true)
  }

  const handleSelect = (team) => {
    selectedNameRef.current = team.name
    requestRef.current += 1
    onChangeTeam(team.name, team.logo)
    setSuggestions([])
    setSearching(false)
    setOpen(false)
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <label className={LABEL_CLASS} htmlFor={id}>
        {label}
      </label>

      <div className="relative flex items-center">
        <span className="pointer-events-none absolute left-2.5 z-10 flex h-6 w-6 items-center justify-center">
          <TeamBadge name={value} src={logo} className="h-6 w-6" />
        </span>

        <input
          id={id}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-suggestions`}
          placeholder={placeholder}
          value={value}
          onFocus={() => setOpen(true)}
          onChange={handleInputChange}
          required
          className={`${INPUT_CLASS} pl-10 ${
            searching && query.length >= 2 ? 'pr-9' : ''
          }`}
        />

        {searching && query.length >= 2 && (
          <span className="absolute right-3 text-xs text-gray-500">…</span>
        )}
      </div>

      {open && query.length >= 2 && (
        <ul
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-[#2a2e39] bg-[#181c26] py-1 shadow-xl"
        >
          {suggestions.length > 0 ? (
            suggestions.map((team) => (
              <li key={team.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={team.name === value}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    handleSelect(team)
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-200 transition-colors hover:bg-[#252a38]"
                >
                  <TeamBadge name={team.name} src={team.logo} className="h-6 w-6" />
                  <span className="min-w-0 flex-1 truncate">{team.name}</span>
                  <span className="max-w-[90px] truncate text-[11px] font-semibold text-gray-500">
                    {team.short}
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-xs text-gray-500">
              {searching
                ? 'Recherche…'
                : 'Aucune équipe trouvée · nom libre accepté'}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

function MatchPreview({ team1, team1Logo, team2, team2Logo }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border border-[#2a2e39] bg-[#131722] px-3 py-2.5">
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span
          className={`truncate text-xs font-semibold ${
            team1 ? 'text-gray-100' : 'text-gray-600'
          }`}
        >
          {team1 || 'Équipe 1'}
        </span>
        <TeamBadge name={team1} src={team1Logo} className="h-6 w-6" />
      </div>

      <span className="shrink-0 rounded bg-[#2a2e39] px-2 py-0.5 text-[10px] font-bold tracking-widest text-gray-400">
        VS
      </span>

      <div className="flex min-w-0 flex-1 items-center justify-start gap-2">
        <TeamBadge name={team2} src={team2Logo} className="h-6 w-6" />
        <span
          className={`truncate text-xs font-semibold ${
            team2 ? 'text-gray-100' : 'text-gray-600'
          }`}
        >
          {team2 || 'Équipe 2'}
        </span>
      </div>
    </div>
  )
}

export default function BetForm({ onSubmit }) {
  const [form, setForm] = useState(createInitialForm)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const team1 = form.team1.trim()
    const team2 = form.team2.trim()
    const stake = Number(form.stake)
    const odds = Number(form.odds)

    let profit = 0
    if (form.result === 'win') profit = stake * odds - stake
    else if (form.result === 'loss') profit = -stake

    onSubmit({
      match_name: `${team1} vs ${team2}`,
      ...(form.team1Logo ? { team1_logo: form.team1Logo } : {}),
      ...(form.team2Logo ? { team2_logo: form.team2Logo } : {}),
      bet_type: form.bet_type,
      stake,
      odds,
      result: form.result,
      profit,
      bet_date: form.bet_date,
    })

    setForm(createInitialForm())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TeamAutocomplete
        id="team1"
        label="ÉQUIPE 1"
        placeholder="Ex: Paris Saint-Germain"
        value={form.team1}
        logo={form.team1Logo}
        onChangeTeam={(name, logo) =>
          setForm((prev) => ({ ...prev, team1: name, team1Logo: logo }))
        }
      />

      <TeamAutocomplete
        id="team2"
        label="ÉQUIPE 2"
        placeholder="Ex: Marseille"
        value={form.team2}
        logo={form.team2Logo}
        onChangeTeam={(name, logo) =>
          setForm((prev) => ({ ...prev, team2: name, team2Logo: logo }))
        }
      />

      <MatchPreview
        team1={form.team1}
        team1Logo={form.team1Logo}
        team2={form.team2}
        team2Logo={form.team2Logo}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS} htmlFor="stake">
            MISE (€)
          </label>
          <input
            id="stake"
            name="stake"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="10.00"
            value={form.stake}
            onChange={handleChange}
            required
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="odds">
            COTE
          </label>
          <input
            id="odds"
            name="odds"
            type="number"
            step="0.01"
            min="1.01"
            placeholder="2.00"
            value={form.odds}
            onChange={handleChange}
            required
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="bet_type">
          TYPE
        </label>
        <select
          id="bet_type"
          name="bet_type"
          value={form.bet_type}
          onChange={handleChange}
          className={INPUT_CLASS}
        >
          <option value="simple">Simple</option>
          <option value="combiné">Combiné</option>
          <option value="système">Système</option>
        </select>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="result">
          RÉSULTAT
        </label>
        <select
          id="result"
          name="result"
          value={form.result}
          onChange={handleChange}
          className={INPUT_CLASS}
        >
          <option value="pending">En attente</option>
          <option value="win">Gagné</option>
          <option value="loss">Perdu</option>
        </select>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="bet_date">
          DATE
        </label>
        <input
          id="bet_date"
          name="bet_date"
          type="date"
          value={form.bet_date}
          onChange={handleChange}
          required
          className={INPUT_CLASS}
        />
      </div>

      <button
        type="submit"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
      >
        <Plus size={16} /> AJOUTER
      </button>
    </form>
  )
}
