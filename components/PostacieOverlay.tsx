'use client'

import { motion } from 'framer-motion'
import { X, Lock, GraduationCap, FlaskConical, TreePine, Wand2, Star, Bird, Sparkles } from 'lucide-react'
import { HouseTheme, DEFAULT_THEME } from '@/lib/houseTheme'

export interface Character {
  id: string
  name: string
  title: string
  locked: boolean
  accentColor: string
  glowColor: string
  gradientFrom: string
  gradientTo: string
  Icon: React.ElementType
  /** Real portrait photo (already framed). When set, card chrome is suppressed. */
  photo?: string
}

export const CHARACTERS: Character[] = [
  {
    id: 'snape',
    name: 'Severus Snape',
    title: 'Profesor Eliksirów',
    locked: false,
    accentColor: '#4A7C6A',
    glowColor: 'rgba(74,124,106,0.35)',
    gradientFrom: '#080C10',
    gradientTo: '#0A1A12',
    Icon: FlaskConical,
    photo: '/postacie/snape.webp',
  },
  {
    id: 'hedwig',
    name: 'Hedwiga',
    title: 'Sowa Harrego Pottera',
    locked: false,
    accentColor: '#C8C0B0',
    glowColor: 'rgba(200,192,176,0.35)',
    gradientFrom: '#0C0C0E',
    gradientTo: '#18181C',
    Icon: Bird,
    photo: '/postacie/hedwiga.webp',
  },
  {
    id: 'dumbledore',
    name: 'Albus Dumbledore',
    title: 'Dyrektor Hogwartu',
    locked: true,
    accentColor: '#9B7EC8',
    glowColor: 'rgba(155,126,200,0.35)',
    gradientFrom: '#0A0810',
    gradientTo: '#160E22',
    Icon: Sparkles,
    photo: '/postacie/dumbledor.webp',
  },
  {
    id: 'hagrid',
    name: 'Rubeus Hagrid',
    title: 'Leśnik Hogwartu',
    locked: true,
    accentColor: '#7B5A2A',
    glowColor: 'rgba(123,90,42,0.35)',
    gradientFrom: '#0E0A06',
    gradientTo: '#1A1208',
    Icon: TreePine,
    photo: '/postacie/hagrid.webp',
  },
  {
    id: 'mcgonagall',
    name: 'Minerwa McGonagall',
    title: 'Profesor Transfiguracji',
    locked: true,
    accentColor: '#3A6B8A',
    glowColor: 'rgba(58,107,138,0.35)',
    gradientFrom: '#060D12',
    gradientTo: '#0C1820',
    Icon: Wand2,
    photo: '/postacie/mcgonagal.webp',
  },
  {
    id: 'lockhart',
    name: 'Gilderoy Lockhart',
    title: 'Profesor Obrony',
    locked: true,
    accentColor: '#6A7BA8',
    glowColor: 'rgba(106,123,168,0.35)',
    gradientFrom: '#080A12',
    gradientTo: '#101420',
    Icon: Star,
    photo: '/postacie/lockhard.webp',
  },
]

interface PostacieOverlayProps {
  onClose: () => void
  onSelectCharacter: (char: Character) => void
  theme?: HouseTheme
}

export function PostacieOverlay({
  onClose,
  onSelectCharacter,
  theme = DEFAULT_THEME,
}: PostacieOverlayProps) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{
        background: theme.sidebarBg ?? 'linear-gradient(180deg, #2C0F0A 0%, #1A0A06 100%)',
        transition: 'background 0.4s ease',
      }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.22 }}
    >
      {/* Header — identical to Overlay component pattern */}
      <div
        className="flex items-center justify-between px-5 pt-6 pb-4"
        style={{ borderBottom: `1px solid ${theme.borderColor}` }}
      >
        <div className="flex items-center gap-3">
          <GraduationCap size={16} className="md:w-5 md:h-5" style={{ color: theme.primary }} />
          <span
            className="text-[14px] md:text-[17px]"
            style={{
              fontFamily: "'Cinzel', serif",
              color: theme.primary,
              letterSpacing: '0.1em',
            }}
          >
            POSTACIE
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl transition-colors hover:bg-[rgba(201,153,63,0.08)]"
          style={{ color: `${theme.primary}80` }}
          aria-label="Zamknij"
        >
          <X size={18} />
        </button>
      </div>

      {/* Subtitle */}
      <p
        className="px-5 pt-4 pb-2 text-[13px] md:text-[15px]"
        style={{
          fontFamily: "'Lora', serif",
          color: 'rgba(201,153,63,0.65)',
          fontStyle: 'italic',
        }}
      >
        Wybierz postać i rozpocznij rozmowę
      </p>

      {/* Grid — 2 cols mobile, 4 cols desktop at 1.5× size */}
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-10">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:max-w-[720px] md:mx-auto">
          {CHARACTERS.map((char, i) => (
            <CharacterCard
              key={char.id}
              char={char}
              index={i}
              theme={theme}
              onSelect={() => !char.locked && onSelectCharacter(char)}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function CharacterCard({
  char,
  index,
  theme,
  onSelect,
}: {
  char: Character
  index: number
  theme: HouseTheme
  onSelect: () => void
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.28, ease: 'easeOut' }}
      onClick={onSelect}
      className="flex flex-col items-center transition-opacity duration-200 active:scale-[0.97] min-h-[44px]"
      style={{
        opacity: char.locked ? 0.5 : 1,
        cursor: char.locked ? 'default' : 'pointer',
        background: 'transparent',
        border: 'none',
        padding: 0,
      }}
    >
      {/* Portrait — no wrapping box, image carries its own frame */}
      <PortraitFrame char={char} theme={theme} />

      {/* Nameplate — floating below portrait, no border */}
      <div className="mt-2 px-1 flex flex-col items-center gap-1">
        <p
          className="text-[12px] md:text-[15px]"
          style={{
            fontFamily: "'Cinzel', serif",
            color: char.locked ? 'rgba(201,153,63,0.4)' : '#C9993F',
            letterSpacing: '0.05em',
            lineHeight: 1.3,
            textAlign: 'center',
          }}
        >
          {char.name}
        </p>
        <p
          className="text-[11px] md:text-[13px]"
          style={{
            fontFamily: "'Lora', serif",
            color: char.locked ? 'rgba(201,153,63,0.28)' : 'rgba(201,153,63,0.6)',
            fontStyle: 'italic',
            textAlign: 'center',
          }}
        >
          {char.locked ? 'Wkrótce' : char.title}
        </p>
      </div>
    </motion.button>
  )
}

function PortraitFrame({ char, theme }: { char: Character; theme: HouseTheme }) {
  // Photo characters carry their own frame — show just the image (dimmed if locked).
  if (char.photo) {
    return (
      <div
        style={{
          position: 'relative',
          aspectRatio: '3/4',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <img
          src={char.photo}
          alt={char.name}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: char.locked ? 'brightness(0.35) saturate(0.4)' : 'none',
          }}
        />
        {char.locked && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={22} style={{ color: `${theme.primary}50` }} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', aspectRatio: '3/4', width: '100%' }}>
      {/* Corner ornaments (unlocked only) */}
      {!char.locked && (
        <>
          <CornerOrnament position="top-left" color={`${theme.primary}AA`} />
          <CornerOrnament position="top-right" color={`${theme.primary}AA`} />
          <CornerOrnament position="bottom-left" color={`${theme.primary}AA`} />
          <CornerOrnament position="bottom-right" color={`${theme.primary}AA`} />
        </>
      )}

      {/* Portrait interior */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          background: `linear-gradient(180deg, ${char.gradientFrom} 0%, ${char.gradientTo} 100%)`,
        }}
      >
        {/* Atmospheric glow behind character */}
        {!char.locked && (
          <div
            style={{
              position: 'absolute',
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '70%',
              height: '50%',
              borderRadius: '50%',
              background: `radial-gradient(ellipse, ${char.glowColor} 0%, transparent 70%)`,
              filter: 'blur(16px)',
            }}
          />
        )}

        {/* Character art or lock */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {char.locked ? (
            <Lock size={22} style={{ color: `${theme.primary}25` }} />
          ) : (
            <CharacterArt char={char} />
          )}
        </div>

        {/* Bottom vignette */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '30%',
            background: 'linear-gradient(0deg, rgba(0,0,0,0.75) 0%, transparent 100%)',
          }}
        />

        {/* Inner frame bevel */}
        <div
          style={{
            position: 'absolute',
            inset: 4,
            borderRadius: 2,
            border: `1px solid ${char.locked ? `${theme.primary}10` : `${theme.primary}25`}`,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  )
}

function CharacterArt({ char }: { char: Character }) {
  // Other unlocked characters: large themed icon
  const IconComp = char.Icon
  return (
    <IconComp
      size={40}
      style={{
        color: char.accentColor,
        filter: `drop-shadow(0 0 10px ${char.glowColor})`,
        opacity: 0.85,
      }}
    />
  )
}

function CornerOrnament({
  position,
  color,
}: {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  color: string
}) {
  const isRight = position.includes('right')
  const isBottom = position.includes('bottom')
  const rotation = isRight && !isBottom ? 90 : isRight && isBottom ? 180 : isBottom ? 270 : 0

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 3,
        top: isBottom ? undefined : -1,
        bottom: isBottom ? -1 : undefined,
        left: isRight ? undefined : -1,
        right: isRight ? -1 : undefined,
        width: 11,
        height: 11,
        pointerEvents: 'none',
      }}
    >
      <svg viewBox="0 0 11 11" style={{ width: 11, height: 11, transform: `rotate(${rotation}deg)` }}>
        <path d="M0 0 L4.5 0 L4.5 1 L1 1 L1 4.5 L0 4.5 Z" fill={color} />
        <circle cx="4.5" cy="4.5" r="1.1" fill={color} />
      </svg>
    </div>
  )
}
