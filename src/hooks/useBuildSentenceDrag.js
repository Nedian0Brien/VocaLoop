import { useCallback, useEffect, useRef, useState } from 'react';

export function useBuildSentenceDrag({
  currentQuestion,
  setArrangement,
  setBank,
  status,
}) {
  const dragInfoRef = useRef(null);
  const arrContainerRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const [dropAtIdx, setDropAtIdx] = useState(null);

  const handlePointerDown = useCallback((area, sourceIdx, wordIdx) => (event) => {
    if (status !== 'ready') return;
    if (event.button !== undefined && event.button !== 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    dragInfoRef.current = {
      area,
      sourceIdx,
      wordIdx,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      text: currentQuestion?.words?.[wordIdx] ?? '',
      hasMoved: false,
    };
  }, [currentQuestion, status]);

  useEffect(() => {
    const threshold = 6;

    const hitTest = (clientX, clientY) => {
      const arrEl = arrContainerRef.current;
      if (!arrEl) return null;
      const cr = arrEl.getBoundingClientRect();
      if (
        clientX < cr.left - 16 ||
        clientX > cr.right + 16 ||
        clientY < cr.top - 16 ||
        clientY > cr.bottom + 16
      ) {
        return null;
      }

      const slotEls = arrEl.querySelectorAll('[data-drop-slot]');
      for (let i = 0; i < slotEls.length; i += 1) {
        const rect = slotEls[i].getBoundingClientRect();
        if (
          clientX >= rect.left - 6 &&
          clientX <= rect.right + 6 &&
          clientY >= rect.top - 6 &&
          clientY <= rect.bottom + 6
        ) {
          return Number(slotEls[i].dataset.dropSlot);
        }
      }

      const wordEls = arrEl.querySelectorAll('[data-arr-word]');
      if (wordEls.length === 0) return 0;

      let closestIdx = 0;
      let closestDist = Infinity;
      let isLeft = false;
      for (let i = 0; i < wordEls.length; i += 1) {
        const rect = wordEls[i].getBoundingClientRect();
        const centerX = (rect.left + rect.right) / 2;
        const centerY = (rect.top + rect.bottom) / 2;
        const dist = Math.hypot(clientX - centerX, clientY - centerY);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
          isLeft = clientX < centerX;
        }
      }
      return isLeft ? closestIdx : closestIdx + 1;
    };

    const onMove = (event) => {
      const info = dragInfoRef.current;
      if (!info) return;

      if (!info.hasMoved) {
        const dx = event.clientX - info.startX;
        const dy = event.clientY - info.startY;
        if (Math.hypot(dx, dy) < threshold) return;
        info.hasMoved = true;
      }

      if (event.cancelable) event.preventDefault();

      setDrag({
        area: info.area,
        sourceIdx: info.sourceIdx,
        wordIdx: info.wordIdx,
        text: info.text,
        width: info.width,
        height: info.height,
        ghostX: event.clientX - info.offsetX,
        ghostY: event.clientY - info.offsetY,
      });
      setDropAtIdx(hitTest(event.clientX, event.clientY));
    };

    const onUp = () => {
      const info = dragInfoRef.current;
      dragInfoRef.current = null;

      if (!info || !info.hasMoved) return;

      setDropAtIdx((currentDrop) => {
        if (currentDrop !== null) {
          if (info.area === 'bank') {
            setBank((prev) => prev.filter((_, index) => index !== info.sourceIdx));
            setArrangement((prev) => [
              ...prev.slice(0, currentDrop),
              info.wordIdx,
              ...prev.slice(currentDrop),
            ]);
          } else if (info.area === 'arr') {
            setArrangement((prev) => {
              const next = [...prev];
              const [moved] = next.splice(info.sourceIdx, 1);
              const finalIdx = currentDrop > info.sourceIdx ? currentDrop - 1 : currentDrop;
              next.splice(finalIdx, 0, moved);
              return next;
            });
          }
        }
        return null;
      });
      setDrag(null);
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [setArrangement, setBank]);

  return {
    arrContainerRef,
    drag,
    dropAtIdx,
    handlePointerDown,
  };
}
