import { useEffect, useMemo, useRef } from 'react'
import { AreaSeries, ColorType, createChart, CrosshairMode } from 'lightweight-charts'

export default function BetChart({ bets }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const zeroLineRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 340,
      layout: {
        background: { type: ColorType.Solid, color: '#1e222d' },
        textColor: '#9ca3af',
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: '#2a2e39', style: 1 },
        horzLines: { color: '#2a2e39', style: 1 },
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        scaleMargins: { top: 0.15, bottom: 0.15 },
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#4b5563',
          width: 1,
          style: 3,
          labelBackgroundColor: '#2a2e39',
        },
        horzLine: {
          color: '#4b5563',
          width: 1,
          style: 3,
          labelBackgroundColor: '#2a2e39',
        },
      },
    })

    const series = chart.addSeries(AreaSeries, {
      lineColor: '#089981',
      topColor: 'rgba(8, 153, 129, 0.28)',
      bottomColor: 'rgba(8, 153, 129, 0.0)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
    })

    const zeroLine = series.createPriceLine({
      price: 0,
      color: '#6b7280',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'Break-even',
    })

    chartRef.current = chart
    seriesRef.current = series
    zeroLineRef.current = zeroLine

    const resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect || !chartRef.current) return
      if (rect.width <= 0 || rect.height <= 0) return

      chartRef.current.applyOptions({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      })
      chartRef.current.timeScale().fitContent()
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      zeroLineRef.current = null
    }
  }, [])

  const { points, finalPnl } = useMemo(() => {
    const dailyProfits = new Map()

    bets
      .filter((bet) => bet.result !== 'pending')
      .forEach((bet) => {
        const rawDate = String(bet.bet_date || '')
        let dayKey = rawDate.slice(0, 10)

        if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
          const parsed = new Date(rawDate)
          if (Number.isNaN(parsed.getTime())) return
          dayKey = parsed.toISOString().slice(0, 10)
        }

        const timestamp = Date.parse(`${dayKey}T00:00:00Z`)
        if (Number.isNaN(timestamp)) return

        const day = Math.floor(timestamp / 1000)
        const profit = Number(bet.profit) || 0
        dailyProfits.set(day, (dailyProfits.get(day) || 0) + profit)
      })

    const sortedEntries = Array.from(dailyProfits.entries()).sort(
      ([a], [b]) => a - b
    )

    const cumulative = sortedEntries.reduce(
      (acc, [time, dailyProfit]) => {
        const total = acc.total + dailyProfit
        return {
          total,
          points: [
            ...acc.points,
            { time, value: Number(total.toFixed(2)) },
          ],
        }
      },
      { total: 0, points: [] },
    )

    return {
      points: cumulative.points,
      finalPnl: cumulative.total,
    }
  }, [bets])

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return

    const isPositive = finalPnl >= 0
    seriesRef.current.applyOptions({
      lineColor: isPositive ? '#089981' : '#f23645',
      topColor: isPositive
        ? 'rgba(8, 153, 129, 0.28)'
        : 'rgba(242, 54, 69, 0.28)',
      bottomColor: isPositive
        ? 'rgba(8, 153, 129, 0.0)'
        : 'rgba(242, 54, 69, 0.0)',
    })

    seriesRef.current.setData(points)
    chartRef.current.timeScale().fitContent()
  }, [points, finalPnl])

  return (
    <div className="relative w-full min-w-0" style={{ height: 340 }}>
      {!points.length && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-xs text-gray-500">
          Aucun pari réglé pour tracer la courbe P&amp;L.
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}