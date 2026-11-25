import { useEffect, useState } from 'react'
import { getTeamFallbackBadge, lookupTeamLogo } from '../data/teams'

export default function TeamBadge({
  name,
  src = '',
  className = 'h-6 w-6',
  title,
  lookup = false,
}) {
  const fallbackSrc = getTeamFallbackBadge(name)
  const [failedSrc, setFailedSrc] = useState('')
  const [resolved, setResolved] = useState({ name: '', logo: '' })

  useEffect(() => {
    if (src || !lookup) return undefined

    let active = true
    lookupTeamLogo(name).then((logo) => {
      if (active && logo) setResolved({ name, logo })
    })

    return () => {
      active = false
    }
  }, [src, lookup, name])

  const remoteSrc = resolved.name === name ? resolved.logo : ''
  const chosenSrc = src || remoteSrc || fallbackSrc
  const imageSrc = chosenSrc !== failedSrc ? chosenSrc : fallbackSrc

  return (
    <img
      src={imageSrc}
      alt={name || 'Équipe'}
      title={title || name || 'Équipe'}
      className={`${className} flex-shrink-0 rounded bg-[#2a2e39] object-cover`}
      onError={() => {
        if (chosenSrc) setFailedSrc(chosenSrc)
      }}
    />
  )
}
