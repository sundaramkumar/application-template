import { useEffect } from 'react';

interface UseKeyboardNavigationOptions {
  onEnter?: () => void;
  onEscape?: () => void;
  disabled?: boolean;
}

export function useKeyboardNavigation(
  fieldRefs: React.RefObject<HTMLInputElement | HTMLSelectElement>[],
  options: UseKeyboardNavigationOptions = {}
) {
  const { onEnter, onEscape, disabled = false } = options;

  useEffect(() => {
    if (disabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Enter') {
        const activeElement = document.activeElement as HTMLInputElement;
        const currentIndex = fieldRefs.findIndex(ref => ref.current === activeElement);

        if (currentIndex !== -1) {
          event.preventDefault();
          const nextIndex = currentIndex + 1;

          if (nextIndex < fieldRefs.length) {
            // Move to next field
            fieldRefs[nextIndex].current?.focus();
          } else if (onEnter) {
            // Execute submit handler when reaching last field
            onEnter();
          }
        }
      } else if (event.key === 'Escape' && onEscape) {
        onEscape();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fieldRefs, onEnter, onEscape, disabled]);

  const focusField = (index: number) => {
    if (index >= 0 && index < fieldRefs.length) {
      fieldRefs[index].current?.focus();
    }
  };

  const focusFirstField = () => focusField(0);
  const focusLastField = () => focusField(fieldRefs.length - 1);

  return {
    focusField,
    focusFirstField,
    focusLastField,
  };
}