'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, GraduationCap, FlaskConical, TreePine, Wand2, Star, Bird, Sparkles, ShoppingBag, Check, ShoppingCart } from 'lucide-react'
import { HouseTheme, DEFAULT_THEME } from '@/lib/houseTheme'
import { isPaidAgent, agentPriceLabel, AGENT_PRICE } from '@/lib/agents'

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
  /** Wywołane gdy user potwierdza zakup (jednego lub wielu agentów). */
  onBuyAgents?: (agentIds: string[]) => void
  /** Id płatnych agentów, które user już posiada (z tabeli entitlements). */
  owned?: string[]
  theme?: HouseTheme
  /** 'browse' = Postacie (wybór do chatu); 'shop' = Sklep (zakup). */
  mode?: 'browse' | 'shop'
  /** Id agentów odblokowanych właśnie po zakupie — świecą przez chwilę. */
  highlightAgents?: string[]
}

export function PostacieOverlay({
  onClose,
  onSelectCharacter,
  onBuyAgents,
  owned = [],
  theme = DEFAULT_THEME,
  mode = 'browse',
  highlightAgents = [],
}: PostacieOverlayProps) {
  const [cart, setCart] = useState<Set<string>>(new Set())

  const toggleCart = (id: string) => {
    setCart(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const cartTotal = Array.from(cart).reduce((sum, id) => {
    return sum + (AGENT_PRICE[id]?.amount ?? 0)
  }, 0)

  const cartTotalLabel = cartTotal > 0
    ? `${(cartTotal / 100).toFixed(0)} zł`
    : ''

  const isShop = mode === 'shop'

  const paidChars = CHARACTERS.filter(c => isPaidAgent(c.id))
  const freeChars  = CHARACTERS.filter(c => !isPaidAgent(c.id))

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
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 pt-6 pb-4"
        style={{ borderBottom: `1px solid ${theme.borderColor}` }}
      >
        <div className="flex items-center gap-3">
          {isShop
            ? <ShoppingBag size={16} className="md:w-5 md:h-5" style={{ color: theme.primary }} />
            : <GraduationCap size={16} className="md:w-5 md:h-5" style={{ color: theme.primary }} />
          }
          <span
            className="text-[14px] md:text-[17px]"
            style={{
              fontFamily: "'Cinzel', serif",
              color: theme.primary,
              letterSpacing: '0.1em',
            }}
          >
            {isShop ? 'SKLEP MAGICZNY' : 'POSTACIE'}
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
        {isShop
          ? 'Odblokuj nauczycieli, aby z nimi rozmawiać'
          : 'Wybierz postać i rozpocznij rozmowę'
        }
      </p>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-24">
        {isShop ? (
          /* ── SKLEP: do kupienia na górze, posiadane (darmowe + zakupione) na dole ── */
          <>
            {/* Locked paid — do kupienia */}
            {paidChars.some(c => !owned.includes(c.id)) && (
              <div className="mb-6">
                <SectionLabel label="Płatni nauczyciele" theme={theme} />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:max-w-[720px] md:mx-auto">
                  {paidChars
                    .filter(c => !owned.includes(c.id))
                    .map((char, i) => {
                      const inCart = cart.has(char.id)
                      const highlighted = highlightAgents.includes(char.id)
                      return (
                        <ShopCard
                          key={char.id}
                          char={char}
                          index={i}
                          theme={theme}
                          locked={true}
                          inCart={inCart}
                          highlighted={highlighted}
                          onToggle={() => toggleCart(char.id)}
                        />
                      )
                    })}
                </div>
              </div>
            )}

            {/* Posiadane — darmowe + już zakupione płatne */}
            <div>
              <SectionLabel label="Posiadane" theme={theme} />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:max-w-[720px] md:mx-auto">
                {[
                  ...freeChars.map(c => ({ char: c, isFree: true })),
                  ...paidChars.filter(c => owned.includes(c.id)).map(c => ({ char: c, isFree: false })),
                ].map(({ char, isFree }, i) => {
                  const highlighted = highlightAgents.includes(char.id)
                  return (
                    <ShopCard
                      key={char.id}
                      char={char}
                      index={(paidChars.filter(c => !owned.includes(c.id)).length) + i}
                      theme={theme}
                      locked={false}
                      inCart={false}
                      highlighted={highlighted}
                      onToggle={() => onSelectCharacter(char)}
                      isFree={isFree}
                    />
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          /* ── POSTACIE: wszystkie razem ── */
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:max-w-[720px] md:mx-auto">
            {CHARACTERS.map((char, i) => {
              const locked = isPaidAgent(char.id) ? !owned.includes(char.id) : false
              const highlighted = highlightAgents.includes(char.id)
              return (
                <BrowseCard
                  key={char.id}
                  char={char}
                  index={i}
                  theme={theme}
                  locked={locked}
                  highlighted={highlighted}
                  onSelect={() => { if (!locked) onSelectCharacter(char) }}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Sticky footer — shop only, appears when cart has items */}
      <AnimatePresence>
        {isShop && cart.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-4"
            style={{
              background: `linear-gradient(0deg, ${theme.sidebarBg ?? '#1A0A06'} 70%, transparent 100%)`,
            }}
          >
            <button
              onClick={() => onBuyAgents?.(Array.from(cart))}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
              style={{
                background: theme.primary,
                color: '#0a0806',
                fontFamily: "'Cinzel', serif",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.08em',
                boxShadow: `0 4px 24px ${theme.primary}50`,
              }}
            >
              <ShoppingCart size={16} />
              KUP WYBRANE ({cart.size}) · {cartTotalLabel}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function SectionLabel({ label, theme }: { label: string; theme: HouseTheme }) {
  return (
    <p
      className="text-[10px] md:text-[11px] uppercase mb-3 mt-1"
      style={{
        fontFamily: "'Cinzel', serif",
        color: `${theme.primary}60`,
        letterSpacing: '0.15em',
      }}
    >
      {label}
    </p>
  )
}

/** Karta w trybie SKLEP */
function ShopCard({
  char,
  index,
  theme,
  locked,
  inCart,
  highlighted,
  onToggle,
  isFree = false,
}: {
  char: Character
  index: number
  theme: HouseTheme
  locked: boolean
  inCart: boolean
  highlighted: boolean
  onToggle: () => void
  isFree?: boolean
}) {
  const priceLabel = agentPriceLabel(char.id)

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.28, ease: 'easeOut' }}
      onClick={onToggle}
      className="flex flex-col items-center transition-opacity duration-200 active:scale-[0.97] min-h-[44px]"
      style={{
        opacity: locked && !inCart ? 0.7 : 1,
        cursor: 'pointer',
        background: 'transparent',
        border: 'none',
        padding: 0,
        outline: 'none',
      }}
      aria-label={locked ? `Dodaj ${char.name} do koszyka` : char.name}
    >
      {/* Portrait */}
      <PortraitFrame
        char={char}
        theme={theme}
        locked={locked}
        inCart={inCart}
        highlighted={highlighted}
      />

      {/* Nameplate */}
      <div className="mt-2 px-1 flex flex-col items-center gap-1">
        <p
          className="text-[12px] md:text-[15px]"
          style={{
            fontFamily: "'Cinzel', serif",
            color: highlighted ? theme.primary : locked ? 'rgba(201,153,63,0.55)' : '#C9993F',
            letterSpacing: '0.05em',
            lineHeight: 1.3,
            textAlign: 'center',
          }}
        >
          {char.name}
        </p>
        {highlighted ? (
          <span
            className="text-[10px] md:text-[12px] mt-0.5 flex items-center gap-1"
            style={{
              fontFamily: "'Cinzel', serif",
              color: theme.primary,
              letterSpacing: '0.08em',
              fontWeight: 700,
              border: `1px solid ${theme.primary}`,
              borderRadius: 999,
              padding: '2px 10px',
              background: `${theme.primary}22`,
            }}
          >
            <Check size={10} /> ODBLOKOWANO
          </span>
        ) : locked && priceLabel ? (
          <span
            className="text-[10px] md:text-[12px] mt-0.5"
            style={{
              fontFamily: "'Cinzel', serif",
              color: inCart ? '#0a0806' : theme.primary,
              letterSpacing: '0.08em',
              fontWeight: 700,
              border: `1px solid ${inCart ? theme.primary : `${theme.primary}55`}`,
              borderRadius: 999,
              padding: '2px 10px',
              background: inCart ? theme.primary : theme.primaryDim,
            }}
          >
            {inCart ? '✓ W KOSZYKU' : `KUP · ${priceLabel}`}
          </span>
        ) : isFree ? (
          <span
            className="text-[10px] md:text-[12px] mt-0.5 flex items-center gap-1"
            style={{
              fontFamily: "'Cinzel', serif",
              color: `${theme.primary}80`,
              letterSpacing: '0.06em',
              fontSize: 10,
            }}
          >
            <Check size={9} /> POSIADASZ
          </span>
        ) : (
          <span
            className="text-[10px] md:text-[12px] mt-0.5 flex items-center gap-1"
            style={{
              fontFamily: "'Cinzel', serif",
              color: `${theme.primary}60`,
              letterSpacing: '0.06em',
              fontSize: 10,
            }}
          >
            <Check size={9} /> zakupione
          </span>
        )}
      </div>
    </motion.button>
  )
}

/** Karta w trybie POSTACIE (browse) */
function BrowseCard({
  char,
  index,
  theme,
  locked,
  highlighted,
  onSelect,
}: {
  char: Character
  index: number
  theme: HouseTheme
  locked: boolean
  highlighted: boolean
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
        opacity: locked ? 0.62 : 1,
        cursor: locked ? 'default' : 'pointer',
        background: 'transparent',
        border: 'none',
        padding: 0,
        outline: 'none',
      }}
      aria-label={char.name}
    >
      <PortraitFrame
        char={char}
        theme={theme}
        locked={locked}
        inCart={false}
        highlighted={highlighted}
      />

      <div className="mt-2 px-1 flex flex-col items-center gap-1">
        <p
          className="text-[12px] md:text-[15px]"
          style={{
            fontFamily: "'Cinzel', serif",
            color: highlighted ? theme.primary : locked ? 'rgba(201,153,63,0.55)' : '#C9993F',
            letterSpacing: '0.05em',
            lineHeight: 1.3,
            textAlign: 'center',
          }}
        >
          {char.name}
        </p>
        {highlighted ? (
          <span
            className="text-[10px] md:text-[12px] mt-0.5 flex items-center gap-1"
            style={{
              fontFamily: "'Cinzel', serif",
              color: theme.primary,
              letterSpacing: '0.08em',
              fontWeight: 700,
              border: `1px solid ${theme.primary}`,
              borderRadius: 999,
              padding: '2px 10px',
              background: `${theme.primary}22`,
            }}
          >
            <Check size={10} /> ODBLOKOWANO
          </span>
        ) : locked ? (
          <p
            className="text-[11px] md:text-[13px]"
            style={{
              fontFamily: "'Lora', serif",
              color: 'rgba(201,153,63,0.28)',
              fontStyle: 'italic',
              textAlign: 'center',
            }}
          >
            Kup w Sklepie
          </p>
        ) : (
          <p
            className="text-[11px] md:text-[13px]"
            style={{
              fontFamily: "'Lora', serif",
              color: 'rgba(201,153,63,0.6)',
              fontStyle: 'italic',
              textAlign: 'center',
            }}
          >
            {char.title}
          </p>
        )}
      </div>
    </motion.button>
  )
}

function PortraitFrame({
  char,
  theme,
  locked,
  inCart,
  highlighted,
}: {
  char: Character
  theme: HouseTheme
  locked: boolean
  inCart: boolean
  highlighted: boolean
}) {
  const borderColor = highlighted
    ? theme.primary
    : inCart
    ? `${theme.primary}CC`
    : 'transparent'

  const boxShadow = highlighted
    ? `0 0 20px ${theme.primary}70, 0 0 40px ${theme.primary}30`
    : inCart
    ? `0 0 12px ${theme.primary}50`
    : 'none'

  if (char.photo) {
    return (
      <div
        style={{
          position: 'relative',
          aspectRatio: '3/4.3',
          width: '100%',
          overflow: 'hidden',
          borderRadius: 4,
          border: `2px solid ${borderColor}`,
          boxShadow,
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      >
        <img
          src={char.photo}
          alt={char.name}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: char.id === 'hedwig' ? 'calc(100% - 5px)' : '100%',
            objectFit: 'cover',
            filter: locked && !inCart && !highlighted ? 'brightness(0.35) saturate(0.4)' : 'none',
            transition: 'filter 0.3s',
          }}
        />
        {locked && !inCart && (
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
        {inCart && (
          <div
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: theme.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={13} style={{ color: '#0a0806' }} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '3/4',
        width: '100%',
        borderRadius: 4,
        border: `2px solid ${borderColor}`,
        boxShadow,
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {!locked && (
        <>
          <CornerOrnament position="top-left" color={`${theme.primary}AA`} />
          <CornerOrnament position="top-right" color={`${theme.primary}AA`} />
          <CornerOrnament position="bottom-left" color={`${theme.primary}AA`} />
          <CornerOrnament position="bottom-right" color={`${theme.primary}AA`} />
        </>
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          background: `linear-gradient(180deg, ${char.gradientFrom} 0%, ${char.gradientTo} 100%)`,
        }}
      >
        {!locked && (
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

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {locked && !inCart ? (
            <Lock size={22} style={{ color: `${theme.primary}25` }} />
          ) : (
            <CharacterArt char={char} />
          )}
        </div>

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

        <div
          style={{
            position: 'absolute',
            inset: 4,
            borderRadius: 2,
            border: `1px solid ${locked && !inCart ? `${theme.primary}10` : `${theme.primary}25`}`,
            pointerEvents: 'none',
          }}
        />
      </div>

      {inCart && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: theme.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 4,
          }}
        >
          <Check size={13} style={{ color: '#0a0806' }} />
        </div>
      )}
    </div>
  )
}

function CharacterArt({ char }: { char: Character }) {
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
