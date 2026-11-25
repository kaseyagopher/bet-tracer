import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import BetForm from './components/BetForm'
import BetList from './components/BetList'
import BetChart from './components/BetChart'
import {
  Activity,
  LayoutDashboard,
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  Percent,
  Menu,
  X,
} from 'lucide-react'

const money = (value) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#2a2e39] bg-[#1e222d] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-400">{title}</p>
        <Icon size={18} className={color} />
      </div>
      <p className={`mt-3 break-words text-xl font-bold sm:text-2xl ${color}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
    </div>
  )
}

export default function App() {
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadBets = async () => {
      const { data, error: fetchError } = await supabase
        .from('bets')
        .select('*')
        .order('bet_date', { ascending: true })

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setBets(data || [])
        setError('')
      }

      setLoading(false)
    }

    loadBets()
    return () => {
      cancelled = true
    }
  }, [])

  const addBet = async (bet) => {
    const { data, error: insertError } = await supabase
      .from('bets')
      .insert([bet])
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      return
    }

    setError('')
    setBets((current) =>
      [...current, data].sort((a, b) =>
        String(a.bet_date).localeCompare(String(b.bet_date)),
      ),
    )
    setShowForm(false)
  }

  const updateBetResult = async (bet, nextResult) => {
    const stake = Number(bet.stake) || 0
    const odds = Number(bet.odds) || 0

    let profit = 0
    if (nextResult === 'win') profit = stake * odds - stake
    else if (nextResult === 'loss') profit = -stake

    const { data, error: updateError } = await supabase
      .from('bets')
      .update({ result: nextResult, profit })
      .eq('id', bet.id)
      .select()
      .single()

    if (updateError) {
      setError(updateError.message)
      return
    }

    setError('')
    const updatedBet = data || { ...bet, result: nextResult, profit }
    setBets((current) =>
      current.map((item) => (item.id === bet.id ? updatedBet : item)),
    )
  }

  const deleteBet = async (id) => {
    const { error: deleteError } = await supabase
      .from('bets')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setError('')
    setBets((current) => current.filter((item) => item.id !== id))
  }

  const stats = useMemo(() => {
    const settled = bets.filter((b) => b.result !== 'pending')
    const wins = settled.filter((b) => b.result === 'win')
    const losses = settled.filter((b) => b.result === 'loss')

    const netProfit = settled.reduce((sum, b) => sum + Number(b.profit || 0), 0)
    const totalStakes = settled.reduce((sum, b) => sum + Number(b.stake || 0), 0)
    const grossWins = wins.reduce((sum, b) => sum + Number(b.profit || 0), 0)
    const totalLosses = Math.abs(
      losses.reduce((sum, b) => sum + Number(b.profit || 0), 0)
    )

    const winRate = settled.length ? (wins.length / settled.length) * 100 : 0
    const roi = totalStakes ? (netProfit / totalStakes) * 100 : 0
    const averageProfit = settled.length ? netProfit / settled.length : 0
    const averageOdds = settled.length
      ? settled.reduce((sum, b) => sum + Number(b.odds || 0), 0) / settled.length
      : 0

    return {
      netProfit,
      totalStakes,
      grossWins,
      totalLosses,
      winRate,
      roi,
      averageProfit,
      averageOdds,
      wins: wins.length,
      losses: losses.length,
      settled: settled.length,
      pending: bets.filter((b) => b.result === 'pending').length,
    }
  }, [bets])

  return (
    <div className="min-h-screen bg-[#131722] text-white">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#2a2e39] bg-[#1e222d] px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Activity className="text-blue-500" size={25} />
          <div>
            <h1 className="text-lg font-bold tracking-wide">BET TERMINAL</h1>
            <p className="text-[10px] text-gray-500">
              SPORTS PERFORMANCE ANALYTICS
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm lg:hidden"
        >
          {showForm ? <X size={16} /> : <Menu size={16} />}
          {showForm ? 'Fermer' : 'Nouveau pari'}
        </button>

        <div className="hidden items-center gap-2 text-sm text-gray-400 lg:flex">
          <LayoutDashboard size={17} />
          Dashboard
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        <aside
          className={`lg:min-h-[calc(100vh-64px)] lg:w-80 lg:flex-shrink-0 lg:border-r lg:border-[#2a2e39] lg:bg-[#1e222d] ${
            showForm ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="sticky top-16 p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-300">
              Enregistrer un pari
            </h2>
            <BetForm onSubmit={addBet} />
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-5 p-3 sm:p-5 lg:p-6">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* P&L CUMULÉ */}
          <section className="rounded-xl border border-[#2a2e39] bg-[#1e222d] p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wider text-gray-400">
              Performance nette (P&amp;L cumulé)
            </p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2
                  className={`text-3xl font-bold sm:text-4xl ${
                    stats.netProfit >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                  }`}
                >
                  {stats.netProfit >= 0 ? '+' : ''}
                  {money(stats.netProfit)}
                </h2>
                <p className="mt-2 text-xs text-gray-500">
                  Mises réglées : {money(stats.totalStakes)}
                </p>
              </div>
              <div
                className={`flex items-center gap-2 text-sm font-medium ${
                  stats.netProfit >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                }`}
              >
                {stats.netProfit >= 0 ? (
                  <TrendingUp size={18} />
                ) : (
                  <TrendingDown size={18} />
                )}
                {stats.roi.toFixed(2)} % ROI
              </div>
            </div>
          </section>

          {/* KPI CARDS */}
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            <StatCard
              title="Profit net"
              value={`${stats.netProfit >= 0 ? '+' : ''}${money(stats.netProfit)}`}
              subtitle="Gains - pertes"
              icon={TrendingUp}
              color={stats.netProfit >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}
            />

            <StatCard
              title="Gains réalisés"
              value={money(stats.grossWins)}
              subtitle="Profit des paris gagnés"
              icon={Wallet}
              color="text-[#089981]"
            />

            <StatCard
              title="Pertes totales"
              value={money(stats.totalLosses)}
              subtitle="Montants perdus"
              icon={TrendingDown}
              color="text-[#f23645]"
            />

            <StatCard
              title="Taux de réussite"
              value={`${stats.winRate.toFixed(1)} %`}
              subtitle={`${stats.wins} gagnés / ${stats.settled} terminés`}
              icon={Target}
              color="text-blue-400"
            />

            <StatCard
              title="ROI"
              value={`${stats.roi.toFixed(2)} %`}
              subtitle="Profit net / mises réglées"
              icon={Percent}
              color={stats.roi >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}
            />

            <StatCard
              title="Profit moyen"
              value={`${stats.averageProfit >= 0 ? '+' : ''}${money(stats.averageProfit)}`}
              subtitle={`Cote moyenne : ${stats.averageOdds.toFixed(2)}`}
              icon={Activity}
              color={
                stats.averageProfit >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
              }
            />
          </section>

          {/* SECONDARY STATS */}
          <section className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-[#2a2e39] bg-[#1e222d] p-3">
              <p className="text-xs text-gray-500">Gagnés</p>
              <p className="mt-1 text-xl font-bold text-[#089981]">{stats.wins}</p>
            </div>
            <div className="rounded-lg border border-[#2a2e39] bg-[#1e222d] p-3">
              <p className="text-xs text-gray-500">Perdus</p>
              <p className="mt-1 text-xl font-bold text-[#f23645]">{stats.losses}</p>
            </div>
            <div className="rounded-lg border border-[#2a2e39] bg-[#1e222d] p-3">
              <p className="text-xs text-gray-500">En attente</p>
              <p className="mt-1 text-xl font-bold text-yellow-500">
                {stats.pending}
              </p>
            </div>
          </section>

          {/* TRADING EQUITY CURVE */}
          <section className="overflow-hidden rounded-xl border border-[#2a2e39] bg-[#1e222d]">
            <div className="flex items-center justify-between border-b border-[#2a2e39] p-4">
              <div>
                <h2 className="text-sm font-bold">Courbe de performance (P&amp;L)</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Évolution cumulée des gains et pertes sur vos mises réglées
                </p>
              </div>
              <span className="rounded bg-[#2a2e39] px-2 py-1 text-xs text-gray-300">
                P&amp;L Net
              </span>
            </div>
            <div className="p-2 sm:p-4">
              <BetChart bets={bets} />
            </div>
          </section>

          {/* HISTORY & SETTLEMENT */}
          <section>
            <BetList
              bets={bets}
              onUpdateResult={updateBetResult}
              onDelete={deleteBet}
              loading={loading}
            />
          </section>

          <footer className="py-4 text-center text-xs text-gray-600">
            BET TERMINAL · Performance tracking
          </footer>
        </main>
      </div>
    </div>
  )
}