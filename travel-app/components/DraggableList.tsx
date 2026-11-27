import { useMemo, useRef, useState, type ReactNode } from 'react';
import { PanResponder, View, type ViewStyle } from 'react-native';

/**
 * 끌어서 순서 바꾸기 — 앱·웹 공통 (추가 네이티브 라이브러리 없이 PanResponder로 구현).
 * 모든 행은 같은 높이(rowHeight)라서 손가락이 움직인 거리로 새 자리를 계산한다.
 * 손잡이(handle)를 잡았을 때만 끌리고, 나머지 영역은 평소처럼 누를 수 있다.
 */
type HandleProps = ReturnType<typeof PanResponder.create>['panHandlers'] & { style: ViewStyle };

export function DraggableList<T>({ items, keyOf, rowHeight, renderRow, onReorder, onDragChange }: {
  items: T[];
  keyOf: (item: T) => string;
  rowHeight: number; // 행 높이 + 행 사이 간격
  renderRow: (item: T, index: number, handle: HandleProps, dragging: boolean) => ReactNode;
  onReorder: (from: number, to: number) => void;
  onDragChange?: (dragging: boolean) => void;
}) {
  const [drag, setDrag] = useState<{ from: number; dy: number } | null>(null);
  const n = items.length;
  const target = drag ? Math.max(0, Math.min(n - 1, drag.from + Math.round(drag.dy / rowHeight))) : -1;

  return (
    <View>
      {items.map((item, i) => {
        let shift = 0;
        if (drag && i !== drag.from) {
          if (i > drag.from && i <= target) shift = -rowHeight;
          if (i < drag.from && i >= target) shift = rowHeight;
        }
        const isDragged = drag?.from === i;
        return (
          <View
            key={keyOf(item)}
            style={{
              height: rowHeight,
              transform: [{ translateY: isDragged ? drag!.dy : shift }],
              zIndex: isDragged ? 10 : 0,
              opacity: isDragged ? 0.95 : 1,
            }}
          >
            <Row index={i} count={n} rowHeight={rowHeight} setDrag={setDrag} onReorder={onReorder} onDragChange={onDragChange}>
              {(handle) => renderRow(item, i, handle, isDragged)}
            </Row>
          </View>
        );
      })}
    </View>
  );
}

function Row({ index, count, rowHeight, setDrag, onReorder, onDragChange, children }: {
  index: number; count: number; rowHeight: number;
  setDrag: (d: { from: number; dy: number } | null) => void;
  onReorder: (from: number, to: number) => void;
  onDragChange?: (dragging: boolean) => void;
  children: (handle: HandleProps) => ReactNode;
}) {
  // 최신 값을 제스처 콜백에서 읽기 위한 ref
  const live = useRef({ index, count, rowHeight, onReorder, onDragChange });
  live.current = { index, count, rowHeight, onReorder, onDragChange };

  const responder = useMemo(() => {
    const finish = (dy: number) => {
      const { index: from, count: n, rowHeight: h, onReorder: done, onDragChange: changed } = live.current;
      const to = Math.max(0, Math.min(n - 1, from + Math.round(dy / h)));
      setDrag(null);
      changed?.(false);
      if (to !== from) done(from, to);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { setDrag({ from: live.current.index, dy: 0 }); live.current.onDragChange?.(true); },
      onPanResponderMove: (_e, g) => setDrag({ from: live.current.index, dy: g.dy }),
      onPanResponderRelease: (_e, g) => finish(g.dy),
      onPanResponderTerminate: (_e, g) => finish(g.dy),
    });
  }, [setDrag]);

  // 웹: 끄는 동안 글자 선택·페이지 스크롤이 일어나지 않게
  const style = { cursor: 'grab', touchAction: 'none', userSelect: 'none' } as unknown as ViewStyle;
  return <>{children({ ...responder.panHandlers, style })}</>;
}
