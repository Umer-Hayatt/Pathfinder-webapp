import React, { useState, type KeyboardEvent } from 'react';

interface TagInputProps {
  id: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  maxTagLength?: number;
  placeholder?: string;
  ariaDescribedBy?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  id,
  tags,
  onChange,
  maxTags = 10,
  maxTagLength = 60,
  placeholder = 'Type and press Enter or comma...',
  ariaDescribedBy,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);

  const addTag = (text: string) => {
    const trimmed = text.trim();
    setInlineError(null);

    if (!trimmed) return;

    if (trimmed.length > maxTagLength) {
      setInlineError(`Each item must be ${maxTagLength} characters or fewer.`);
      return;
    }

    if (tags.length >= maxTags) {
      setInlineError(`Maximum ${maxTags} items allowed.`);
      return;
    }

    // Deduplication check (case-insensitive)
    const exists = tags.some((t) => t.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setInlineError(`"${trimmed}" is already added.`);
      return;
    }

    onChange([...tags, trimmed]);
    setInputVal('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
      // Remove last tag on backspace if input is empty
      e.preventDefault();
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove: number) => {
    setInlineError(null);
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div>
      <div className="tag-input-wrapper">
        {tags.map((tag, idx) => (
          <span key={`${tag}-${idx}`} className="tag-badge">
            <span>{tag}</span>
            <button
              type="button"
              className="tag-remove-btn"
              onClick={() => removeTag(idx)}
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        {tags.length < maxTags && (
          <input
            id={id}
            type="text"
            className="tag-input-field"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              if (inlineError) setInlineError(null);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputVal.trim()) addTag(inputVal);
            }}
            placeholder={tags.length === 0 ? placeholder : ''}
            aria-describedby={ariaDescribedBy}
          />
        )}
      </div>
      {inlineError && <div className="form-error-msg" style={{ marginTop: '4px' }}>{inlineError}</div>}
    </div>
  );
};
