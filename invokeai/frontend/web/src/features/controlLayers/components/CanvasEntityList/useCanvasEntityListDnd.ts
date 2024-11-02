import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { CanvasEntityIdentifier } from 'features/controlLayers/store/types';
import { type DndListTargetState, idle } from 'features/dnd/types';
import type { ActionData, ActionSourceApi } from 'features/imageActions/actions';
import { buildGetData, buildTypeAndKey, buildTypeGuard } from 'features/imageActions/actions';
import type { RefObject } from 'react';
import { useEffect, useState } from 'react';

const _singleCanvasEntity = buildTypeAndKey('single-canvas-entity');
type SingleCanvasEntitySourceData = ActionData<
  typeof _singleCanvasEntity.type,
  typeof _singleCanvasEntity.key,
  { entityIdentifier: CanvasEntityIdentifier }
>;
export const singleCanvasEntity: ActionSourceApi<SingleCanvasEntitySourceData> = {
  ..._singleCanvasEntity,
  typeGuard: buildTypeGuard(_singleCanvasEntity.key),
  getData: buildGetData(_singleCanvasEntity.key, _singleCanvasEntity.type),
};

export const useCanvasEntityListDnd = (ref: RefObject<HTMLElement>, entityIdentifier: CanvasEntityIdentifier) => {
  const [dndListState, setDndListState] = useState<DndListTargetState>(idle);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    return combine(
      draggable({
        element,
        getInitialData() {
          return singleCanvasEntity.getData({ entityIdentifier });
        },
        onDragStart() {
          setDndListState({ type: 'is-dragging' });
          setIsDragging(true);
        },
        onDrop() {
          setDndListState(idle);
          setIsDragging(false);
        },
      }),
      dropTargetForElements({
        element,
        canDrop({ source }) {
          if (!singleCanvasEntity.typeGuard(source.data)) {
            return false;
          }
          if (source.data.payload.entityIdentifier.type !== entityIdentifier.type) {
            return false;
          }
          return true;
        },
        getData({ input }) {
          const data = singleCanvasEntity.getData({ entityIdentifier });
          return attachClosestEdge(data, {
            element,
            input,
            allowedEdges: ['top', 'bottom'],
          });
        },
        getIsSticky() {
          return true;
        },
        onDragEnter({ self }) {
          const closestEdge = extractClosestEdge(self.data);
          setDndListState({ type: 'is-dragging-over', closestEdge });
        },
        onDrag({ self }) {
          const closestEdge = extractClosestEdge(self.data);

          // Only need to update react state if nothing has changed.
          // Prevents re-rendering.
          setDndListState((current) => {
            if (current.type === 'is-dragging-over' && current.closestEdge === closestEdge) {
              return current;
            }
            return { type: 'is-dragging-over', closestEdge };
          });
        },
        onDragLeave() {
          setDndListState(idle);
        },
        onDrop() {
          setDndListState(idle);
        },
      })
    );
  }, [entityIdentifier, ref]);

  return [dndListState, isDragging] as const;
};