import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, ShuffleIcon, Cancel01Icon } from '@hugeicons/core-free-icons';

// ---- Emoji data organized by category ----

const EMOJI_CATEGORIES: { name: string; icon: string; emojis: string[] }[] = [
  {
    name: 'People',
    icon: '😀',
    emojis: [
      '😀','😃','😄','😁','😆','🤣','😂','🙂','😉','😊',
      '😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋',
      '😛','😜','🤪','😝','🤑','🤗','🤭','🫢','🫣','🤫',
      '🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒',
      '🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒',
      '🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳',
      '🥸','😎','🤓','🧐','😕','🫤','😟','🙁','☹️','😮',
      '😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥',
      '😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱',
      '😤','😡','😠','🤬','👿','💀','☠️','💩','🤡','👹',
      '👺','👻','👽','👾','🤖','😺','😸','😹','😻','😼',
      '😽','🙀','😿','😾','🙈','🙉','🙊',
    ],
  },
  {
    name: 'Gestures',
    icon: '👋',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌',
      '🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉',
      '👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛',
      '🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅',
      '🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠',
      '🫀','🫁','🦷','🦴','👀','👁️','👅','👄',
    ],
  },
  {
    name: 'Nature',
    icon: '🌿',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨',
      '🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦅',
      '🦉','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌',
      '🐞','🐜','🪰','🪲','🪳','🦗','🕷️','🦂','🐢','🐍',
      '🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠',
      '🐟','🐬','🐳','🐋','🦈','🪸','🐊','🐅','🐆','🦓',
      '🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬',
      '🌵','🎄','🌲','🌳','🌴','🪵','🌱','🌿','☘️','🍀',
      '🎍','🪴','🎋','🍃','🍂','🍁','🌾','🌺','🌻','🌹',
      '🥀','🌷','🌼','🏵️','🌸','💐','🍄','🌰','🐚',
    ],
  },
  {
    name: 'Food',
    icon: '🍕',
    emojis: [
      '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈',
      '🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦',
      '🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔',
      '🍠','🥐','🥖','🍞','🥨','🥯','🧀','🥚','🍳','🧈',
      '🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟',
      '🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘',
      '🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪',
      '🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍡','🧁','🍰',
      '🎂','🍮','🍭','🍬','🍫','🍩','🍪','🌰','🥜','🫘',
      '☕','🍵','🫖','🥛','🍼','🧋','🧃','🥤','🍶','🍺',
      '🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊',
    ],
  },
  {
    name: 'Activities',
    icon: '⚽',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱',
      '🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳',
      '🪁','🛝','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼',
      '🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤸','⛹️',
      '🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗',
      '🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️',
      '🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘',
      '🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟️','🎯','🎳',
      '🎮','🕹️','🧩',
    ],
  },
  {
    name: 'Travel',
    icon: '🚗',
    emojis: [
      '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐',
      '🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🛺','🚔',
      '🚍','🚘','🚖','✈️','🛫','🛬','🛩️','🚀','🛸','🚁',
      '🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','🪝','⛽',
      '🚧','🚦','🚥','🏁','🚏','🗿','🗼','🏰','🏯','🏟️',
      '🎡','🎢','🎠','⛲','⛱️','🏖️','🏝️','🏜️','🌋','⛰️',
      '🏔️','🗻','🧭','🏠','🏡','🏘️','🏚️','🏗️','🏢','🏬',
      '🏣','🏤','🏥','🏦','🏨','🏪','🏫','🏩','💒','🏛️',
      '⛪','🕌','🕍','🛕','🕋','⛩️','🗾','🎑','🏞️','🌅',
      '🌄','🌠','🎆','🎇','🌇','🌆','🏙️','🌃','🌌','🌉',
      '🌁',
    ],
  },
  {
    name: 'Objects',
    icon: '💡',
    emojis: [
      '⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💽','💾',
      '💿','📀','📼','📷','📸','📹','🎥','📽️','🎞️','📞',
      '☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','🧭','⏱️',
      '⏲️','⏰','🕰️','💡','🔦','🕯️','🪔','🧯','🛢️','💸',
      '💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜',
      '🧰','🪛','🔧','🔨','⚒️','🛠️','⛏️','🪚','🔩','⚙️',
      '🪤','🧱','⛓️','🧲','🔫','💣','🧨','🪓','🔪','🗡️',
      '⚔️','🛡️','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿',
      '🪬','💈','⚗️','🔭','🔬','🕳️','🩹','🩺','💊','💉',
      '🩸','🧬','🦠','🧫','🧪','🌡️','🧹','🪠','🧺','🧻',
      '🚽','🚰','🚿','🛁','🛀','🧼','🪥','🪒','🧽','🪣',
      '🔑','🗝️','🚪','🪑','🛋️','🛏️','🛌','🧸','🪆','🖼️',
      '🪞','🪟','🛍️','🛒','🎁','🎈','🎏','🎀','🪄','🪅',
      '🎊','🎉','🎎','🏮','🎐','🧧','✉️','📩','📨','📧',
      '💌','📥','📤','📦','🏷️','🪧',
    ],
  },
  {
    name: 'Symbols',
    icon: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
      '❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝',
      '💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️',
      '☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎',
      '♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️',
      '📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮',
      '🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎',
      '🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯',
      '💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭','❗',
      '❕','❓','❔','‼️','⁉️','🔅','🔆','〽️','⚠️','🚸',
      '🔱','⚜️','🔰','♻️','✅','🈯','💹','❇️','✳️','❎',
      '🌐','💠','Ⓜ️','🌀','💤','🏧','🚾','♿','🅿️','🛗',
      '🈳','🈂️','🛂','🛃','🛄','🛅','⬛','⬜','◼️','◻️',
      '◾','◽','▪️','▫️','🔶','🔷','🔸','🔹','🔺','🔻',
      '💎','🔘','🔳','🔲','🏳️','🏴','🚩','🏁','🏳️‍🌈',
    ],
  },
  {
    name: 'Flags',
    icon: '🏁',
    emojis: [
      '🏳️','🏴','🏁','🚩','🏳️‍🌈','🏳️‍⚧️','🇺🇸','🇬🇧','🇨🇦','🇦🇺',
      '🇩🇪','🇫🇷','🇮🇹','🇪🇸','🇯🇵','🇰🇷','🇨🇳','🇮🇳','🇧🇷','🇲🇽',
      '🇷🇺','🇿🇦','🇳🇱','🇧🇪','🇸🇪','🇳🇴','🇩🇰','🇫🇮','🇮🇪','🇵🇹',
      '🇬🇷','🇹🇷','🇦🇷','🇨🇱','🇨🇴','🇵🇪','🇪🇬','🇳🇬','🇰🇪','🇹🇭',
      '🇻🇳','🇵🇭','🇮🇩','🇲🇾','🇸🇬','🇳🇿','🇨🇭','🇦🇹','🇵🇱','🇨🇿',
      '🇭🇺','🇷🇴','🇺🇦','🇮🇱','🇸🇦','🇦🇪','🇶🇦','🇰🇼','🇵🇰','🇧🇩',
    ],
  },
];

// Flatten all emojis for random selection
const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onRemove, onClose }: EmojiPickerProps) {
  const [filter, setFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Focus filter on mount
  useEffect(() => {
    filterInputRef.current?.focus();
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filteredCategories = useMemo(() => {
    if (!filter) return EMOJI_CATEGORIES;

    const lower = filter.toLowerCase();
    // Simple name-based matching: search category names and emoji characters
    return EMOJI_CATEGORIES.map((cat) => ({
      ...cat,
      emojis: cat.emojis.filter(() => cat.name.toLowerCase().includes(lower)),
    })).filter((cat) => cat.emojis.length > 0);
  }, [filter]);

  // If filter is active, show flat filtered results
  const filteredFlat = useMemo(() => {
    if (!filter) return null;
    const lower = filter.toLowerCase();
    // Search by category name match — all emojis from matching categories
    const matched = EMOJI_CATEGORIES.filter((c) =>
      c.name.toLowerCase().includes(lower)
    ).flatMap((c) => c.emojis);
    // If no category matched, search all emojis (exact character match unlikely for text filter)
    return matched.length > 0 ? matched : ALL_EMOJIS.filter((e) => e.includes(lower));
  }, [filter]);

  const handleRandom = useCallback(() => {
    const emoji = ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)];
    onSelect(emoji);
  }, [onSelect]);

  const scrollToCategory = useCallback((index: number) => {
    setActiveCategory(index);
    setFilter('');
    const el = document.getElementById(`emoji-category-${index}`);
    if (el && gridRef.current) {
      gridRef.current.scrollTop = el.offsetTop - gridRef.current.offsetTop;
    }
  }, []);

  return (
    <div ref={pickerRef} className="emoji-picker">
      {/* Header tabs */}
      <div className="emoji-picker-header">
        <span className="emoji-picker-tab active">Emoji</span>
        <button className="emoji-picker-remove" onClick={onRemove}>
          Remove
        </button>
      </div>

      {/* Filter + random */}
      <div className="emoji-picker-filter-row">
        <div className="emoji-picker-filter">
          <HugeiconsIcon icon={Search01Icon} size={14} className="emoji-picker-filter-icon" />
          <input
            ref={filterInputRef}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter..."
            className="emoji-picker-filter-input"
          />
          {filter && (
            <button
              className="emoji-picker-filter-clear"
              onClick={() => setFilter('')}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={12} />
            </button>
          )}
        </div>
        <button className="emoji-picker-random" onClick={handleRandom} title="Random emoji">
          <HugeiconsIcon icon={ShuffleIcon} size={16} />
        </button>
      </div>

      {/* Emoji grid */}
      <div ref={gridRef} className="emoji-picker-grid">
        {filteredFlat ? (
          // Filtered view — flat list
          filteredFlat.length > 0 ? (
            <div className="emoji-picker-category">
              <div className="emoji-picker-category-name">Results</div>
              <div className="emoji-picker-emojis">
                {filteredFlat.map((emoji, i) => (
                  <button
                    key={`${emoji}-${i}`}
                    className="emoji-picker-emoji"
                    onClick={() => onSelect(emoji)}
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="emoji-picker-empty">No emoji found</div>
          )
        ) : (
          // Category view
          EMOJI_CATEGORIES.map((cat, catIdx) => (
            <div key={cat.name} id={`emoji-category-${catIdx}`} className="emoji-picker-category">
              <div className="emoji-picker-category-name">{cat.name}</div>
              <div className="emoji-picker-emojis">
                {cat.emojis.map((emoji, i) => (
                  <button
                    key={`${emoji}-${i}`}
                    className="emoji-picker-emoji"
                    onClick={() => onSelect(emoji)}
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Category bar at bottom */}
      <div className="emoji-picker-categories">
        {EMOJI_CATEGORIES.map((cat, idx) => (
          <button
            key={cat.name}
            className={`emoji-picker-category-btn ${idx === activeCategory && !filter ? 'active' : ''}`}
            onClick={() => scrollToCategory(idx)}
            title={cat.name}
          >
            {cat.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
