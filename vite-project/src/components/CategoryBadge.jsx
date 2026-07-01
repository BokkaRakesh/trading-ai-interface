import PropTypes from 'prop-types';
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from '../data/badgeStyles';

/**
 * Colored pill badge for a transaction category.
 *
 * @example
 *   <CategoryBadge category="Food & Tea" />
 *   // → orange pill with dot: "Food & Tea"
 */
export default function CategoryBadge({ category }) {
  const style = CATEGORY_STYLES[category] ?? DEFAULT_CATEGORY_STYLE;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${style.bg} ${style.text}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: style.dot }}
      />
      {category}
    </span>
  );
}

CategoryBadge.propTypes = {
  category: PropTypes.string.isRequired,
};
