import { Trash2 } from 'lucide-react'
import TeamBadge from './TeamBadge'
import { splitMatchName } from '../data/teams'

const RESULT_LABELS = {
  win: 'GAGNÉ',
  loss: 'PERDU',
  pending: 'ATTENTE',
}

const resultClass = (result) => {
  if (result === 'win') return 'border-[#089981]/40 bg-[#089981]/20 text-[#089981]'
  if (result === 'loss') return 'border-[#f23645]/40 bg-[#f23645]/20 text-[#f23645]'
  return 'border-yellow-500/40 bg-yellow-500/20 text-yellow-500'
}

export default function BetList({ bets, onUpdateResult, onDelete, loading }) {
  if (loading) {
    return <div className="p-6 text-gray-400">Chargement...</div>
  }

  if (!bets.length) {
    return (
      <div className="p-6 text-center text-gray-400">
        Aucun pari. Remplissez le formulaire à gauche.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#2a2e39] bg-[#1e222d]">
      <div className="border-b border-[#2a2e39] px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
          Position / Historique
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#2a2e39] text-xs text-gray-400">
            <tr>
              <th className="px-4 py-3 font-normal">DATE</th>
              <th className="px-4 py-3 font-normal">MATCH</th>
              <th className="px-4 py-3 text-right font-normal">MISE</th>
              <th className="px-4 py-3 text-right font-normal">COTE</th>
              <th className="px-4 py-3 text-center font-normal">STATUT</th>
              <th className="px-4 py-3 text-right font-normal">P&amp;L</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>

          <tbody className="divide-y divide-[#2a2e39]">
            {[...bets].reverse().map((bet) => {
              const result = bet.result || 'pending'
              const { team1, team2 } = splitMatchName(bet.match_name)
              const profit = Number(bet.profit) || 0

              return (
                <tr
                  key={bet.id}
                  className="transition-colors hover:bg-[#2a2e39]/50"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400">
                    {bet.bet_date}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <TeamBadge
                        name={team1}
                        src={bet.team1_logo}
                        className="h-6 w-6"
                        lookup
                      />
                      <span className="font-medium text-white">
                        {team1 || bet.match_name || '—'}
                      </span>
                      <span className="text-xs text-gray-500">vs</span>
                      <TeamBadge
                        name={team2}
                        src={bet.team2_logo}
                        className="h-6 w-6"
                        lookup
                      />
                      <span className="font-medium text-white">
                        {team2 || '—'}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-right text-gray-300">
                    {Number(bet.stake).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {bet.odds}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <select
                      aria-label={`Statut du pari ${bet.match_name || bet.id}`}
                      value={result}
                      onChange={(event) =>
                        onUpdateResult?.(bet, event.target.value)
                      }
                      className={`rounded border bg-[#131722] px-2 py-1 text-[11px] font-bold outline-none transition-colors ${resultClass(
                        result,
                      )}`}
                    >
                      <option value="pending">En attente</option>
                      <option value="win">Gagné</option>
                      <option value="loss">Perdu</option>
                    </select>
                    <span className="sr-only">{RESULT_LABELS[result]}</span>
                  </td>

                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      profit >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                    }`}
                  >
                    {result === 'pending'
                      ? '—'
                      : `${profit >= 0 ? '+' : ''}${profit.toFixed(2)}`}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(bet.id)}
                      className="text-gray-500 transition-colors hover:text-[#f23645]"
                      aria-label="Supprimer le pari"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
