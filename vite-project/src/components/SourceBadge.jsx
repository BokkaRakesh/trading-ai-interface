import PropTypes from 'prop-types';
import { SOURCE_STYLES, DEFAULT_SOURCE_STYLE } from '../data/badgeStyles';

/**
 * Source-of-funds badge.
 * Strips " Credit Card" / " Debit Card" suffixes for compact display.
 *
 * @example
 *   <SourceBadge source="GPay" />
 *   // → blue-tinted pill: "GPay"
 *
 *   <SourceBadge source="ICICI Credit Card" />
 *   // → orange-tinted pill: "ICICI"
 */
export default function SourceBadge({ source }) {
  const style = SOURCE_STYLES[source] ?? DEFAULT_SOURCE_STYLE;
  const label = source.replace(/ Credit Card| Debit Card/, '');
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${style.bg} ${style.text}`}
    >
      {label}
    </span>
  );
}

SourceBadge.propTypes = {
  source: PropTypes.string.isRequired,
};
