# Plan: Visual Wiring System for Wokwi Clone (Incremental Implementation)

## Vision

Implement a complete visual wiring system similar to Wokwi, with draggable connections, automatic colors based on signal type, electrical connection validation, and intelligent routing that avoids components.

## User Requirements (from Q&A)

1. **Wire Colors**: Automatic based on signal type (Red=VCC, Black=GND, Blue=Analog, etc.)
2. **Connection Validation**: Strict validation - prevents electrically invalid connections
3. **Routing**: Intelligent automatic with A* algorithm to avoid components
4. **Implementation**: Incremental phases (Phase 1: Basic rendering → Phase 2: Editing → Phase 3: Validation)

## Architecture Overview

### Current State
- React + TypeScript + Vite + Zustand
- Canvas: Absolute positioning, 20px grid, coordinates in pixels
- Components: wokwi-elements web components (LED, Arduino, Resistor, etc.)
- **NO** wiring infrastructure currently exists

### Key Discovery: Pin Information API

All wokwi-elements expose `pinInfo: ElementPin[]`:

```typescript
interface ElementPin {
  name: string;        // e.g., 'A', 'C', 'GND.1', '13'
  x: number;           // X coordinate in millimeters (relative to element origin)
  y: number;           // Y coordinate in millimeters
  signals: PinSignalInfo[];  // Signal types (power, analog, i2c, etc.)
}
```

Example - LED pins:
```typescript
get pinInfo(): ElementPin[] {
  return [
    { name: 'A', x: 25, y: 42, signals: [], description: 'Anode' },
    { name: 'C', x: 15, y: 42, signals: [], description: 'Cathode' },
  ];
}
```

### Critical Challenge: Coordinate Systems

There are 3 coordinate systems:

1. **Element Space (mm)**: `pinInfo` uses millimeters relative to element origin
2. **SVG Viewport**: wokwi-elements use SVG with internal viewBox
3. **Canvas Space (pixels)**: Absolute positioning on canvas

**Required conversion**: `1mm = 3.7795275591 pixels` (standard 96 DPI)

---

## PHASE 1: Basic Wire Rendering (MVP)

### Objetivos
- Dibujar cables estáticos en el canvas
- Colores automáticos según tipo de señal
- Paths SVG simples (forma de L)
- Crear cables manualmente via interfaz

### Data Model

**Archivo nuevo**: `frontend/src/types/wire.ts`

```typescript
export interface WireEndpoint {
  componentId: string;  // ID del componente (e.g., 'led-123', 'arduino-uno')
  pinName: string;      // Nombre del pin (e.g., 'A', 'GND.1', '13')
  x: number;            // Posición absoluta en canvas (pixels)
  y: number;
}

export interface Wire {
  id: string;
  start: WireEndpoint;
  end: WireEndpoint;
  controlPoints: { x: number; y: number; id: string }[];
  color: string;        // Calculado automáticamente del tipo de señal
  signalType: WireSignalType | null;
  isValid: boolean;
}

export type WireSignalType =
  | 'power-vcc' | 'power-gnd' | 'analog' | 'digital'
  | 'pwm' | 'i2c' | 'spi' | 'usart';
```

### Zustand Store Extension

**Modificar**: `frontend/src/store/useSimulatorStore.ts`

Agregar al `SimulatorState`:
```typescript
interface SimulatorState {
  // ... existing properties ...

  wires: Wire[];
  selectedWireId: string | null;
  wireInProgress: WireInProgress | null;

  addWire: (wire: Wire) => void;
  removeWire: (wireId: string) => void;
  updateWire: (wireId: string, updates: Partial<Wire>) => void;
  setSelectedWire: (wireId: string | null) => void;
  startWireCreation: (endpoint: WireEndpoint) => void;
  finishWireCreation: (endpoint: WireEndpoint) => void;
  cancelWireCreation: () => void;
  updateWirePositions: (componentId: string) => void;
}
```

### Pin Position Calculator (CRÍTICO)

**Archivo nuevo**: `frontend/src/utils/pinPositionCalculator.ts`

Esta es la pieza MÁS IMPORTANTE - convierte coordenadas de pines (mm) a coordenadas de canvas (pixels):

```typescript
const MM_TO_PX = 3.7795275591;  // Conversión estándar 96 DPI

export function calculatePinPosition(
  componentId: string,
  pinName: string,
  componentX: number,  // Posición del componente en canvas
  componentY: number
): { x: number; y: number } | null {
  const element = document.getElementById(componentId);
  if (!element) return null;

  const pinInfo = (element as any).pinInfo as ElementPin[];
  const pin = pinInfo.find(p => p.name === pinName);
  if (!pin) return null;

  // Convertir mm a pixels y sumar posición del componente
  return {
    x: componentX + (pin.x * MM_TO_PX),
    y: componentY + (pin.y * MM_TO_PX),
  };
}

export function getAllPinPositions(
  componentId: string,
  componentX: number,
  componentY: number
): Array<{ name: string; x: number; y: number; signals: PinSignalInfo[] }> {
  // Retorna todos los pines con posiciones absolutas
}

export function findClosestPin(
  componentId: string,
  componentX: number,
  componentY: number,
  targetX: number,
  targetY: number,
  maxDistance: number = 20
): { name: string; x: number; y: number } | null {
  // Encuentra el pin más cercano a una posición (para snapping)
}
```

### Wire Colors

**Archivo nuevo**: `frontend/src/utils/wireColors.ts`

```typescript
export const WIRE_COLORS = {
  'power-vcc': '#ff0000',    // Rojo
  'power-gnd': '#000000',    // Negro
  'analog': '#4169e1',       // Azul
  'digital': '#00ff00',      // Verde
  'pwm': '#8b5cf6',          // Morado
  'i2c': '#ffd700',          // Amarillo
  'spi': '#ff8c00',          // Naranja
  'usart': '#00ced1',        // Cyan
};

export function determineSignalType(signals: PinSignalInfo[]): WireSignalType | null {
  // Prioridad: power > protocolos especializados > PWM > analog > digital
  if (signals.find(s => s.type === 'power' && s.signal === 'VCC')) return 'power-vcc';
  if (signals.find(s => s.type === 'power' && s.signal === 'GND')) return 'power-gnd';
  if (signals.find(s => s.type === 'i2c')) return 'i2c';
  // ... etc
  return 'digital';
}

export function getWireColor(signalType: WireSignalType | null): string {
  return signalType ? WIRE_COLORS[signalType] : '#00ff00';
}
```

### Wire Path Generation (Phase 1: Simple)

**Archivo nuevo**: `frontend/src/utils/wirePathGenerator.ts`

```typescript
export function generateWirePath(wire: Wire): string {
  const { start, end, controlPoints } = wire;

  if (controlPoints.length === 0) {
    // Phase 1: Forma de L simple
    return generateSimplePath(start.x, start.y, end.x, end.y);
  }
  // Phase 2 y 3 usarán controlPoints
}

function generateSimplePath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = x1 + (x2 - x1) / 2;

  // L-shape: horizontal primero, luego vertical
  return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
}
```

### Wire Rendering Components

**Archivo nuevo**: `frontend/src/components/simulator/WireLayer.tsx`

```typescript
export const WireLayer: React.FC = () => {
  const { wires, wireInProgress, selectedWireId } = useSimulatorStore();

  return (
    <svg
      className="wire-layer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,  // Debajo de componentes
      }}
    >
      {wires.map(wire => (
        <WireRenderer
          key={wire.id}
          wire={wire}
          isSelected={wire.id === selectedWireId}
        />
      ))}

      {wireInProgress && (
        <WireInProgressRenderer wireInProgress={wireInProgress} />
      )}
    </svg>
  );
};
```

**Archivo nuevo**: `frontend/src/components/simulator/WireRenderer.tsx`

```typescript
export const WireRenderer: React.FC<{ wire: Wire; isSelected: boolean }> = ({ wire, isSelected }) => {
  const { setSelectedWire } = useSimulatorStore();

  const path = useMemo(() => generateWirePath(wire), [wire]);

  return (
    <g className="wire-group">
      {/* Path invisible para click fácil */}
      <path
        d={path}
        stroke="transparent"
        strokeWidth="10"
        fill="none"
        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
        onClick={() => setSelectedWire(wire.id)}
      />

      {/* Path visible */}
      <path
        d={path}
        stroke={wire.isValid ? wire.color : '#ff4444'}
        strokeWidth="2"
        fill="none"
        strokeDasharray={wire.isValid ? undefined : '5,5'}
      />

      {/* Endpoints */}
      <circle cx={wire.start.x} cy={wire.start.y} r="3" fill={wire.color} />
      <circle cx={wire.end.x} cy={wire.end.y} r="3" fill={wire.color} />
    </g>
  );
};
```

### Integration with Canvas

**Modificar**: `frontend/src/components/simulator/SimulatorCanvas.tsx`

```typescript
// Agregar import
import { WireLayer } from './WireLayer';

// En el JSX, agregar wire layer DEBAJO de componentes:
<div className="canvas-content" ...>
  {/* Wire layer - z-index: 1 */}
  <WireLayer />

  {/* Arduino Uno - z-index: 2 */}
  <ArduinoUno ... />

  {/* Components */}
  <div className="components-area">
    {components.map(renderComponent)}
  </div>
</div>
```

### Phase 1 Implementation Steps

1. ✅ Crear `types/wire.ts`
2. ✅ Extender Zustand store con wire state
3. ✅ Implementar `pinPositionCalculator.ts`
4. ✅ Implementar `wireColors.ts`
5. ✅ Implementar `wirePathGenerator.ts` (simple)
6. ✅ Crear `WireLayer.tsx`
7. ✅ Crear `WireRenderer.tsx`
8. ✅ Integrar `WireLayer` en `SimulatorCanvas.tsx`
9. ✅ Agregar cables de prueba al store
10. ✅ Verificar rendering y colores

---

## PHASE 2: Wire Editing & Interaction

### Objetivos
- Crear cables haciendo click en pines
- Editar cables con puntos de control violetas
- Arrastrar puntos de control (horizontal ↔ vertical)
- Seleccionar y eliminar cables

### Wire Creation System

**Archivo nuevo**: `frontend/src/components/simulator/PinOverlay.tsx`

Muestra marcadores clickeables en todos los pines cuando se está creando un cable:

```typescript
export const PinOverlay: React.FC = () => {
  const { components, wireInProgress } = useSimulatorStore();

  if (!wireInProgress) return null;

  return (
    <div className="pin-overlay" style={{ zIndex: 10 }}>
      {components.map(component => {
        const pins = getAllPinPositions(component.id, component.x, component.y);

        return pins.map(pin => (
          <div
            key={`${component.id}-${pin.name}`}
            className="pin-marker"
            style={{
              position: 'absolute',
              left: pin.x - 6,
              top: pin.y - 6,
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: '2px solid #00ff00',
              backgroundColor: 'rgba(0, 255, 0, 0.3)',
              pointerEvents: 'all',
              cursor: 'crosshair',
            }}
            onClick={(e) => handlePinClick(component.id, pin.name, e)}
          />
        ));
      })}
    </div>
  );
};
```

**Archivo nuevo**: `frontend/src/components/simulator/WireCreationHandler.tsx`

Hook para manejar la creación de cables:

```typescript
export const useWireCreation = () => {
  const {
    components,
    wireInProgress,
    startWireCreation,
    finishWireCreation,
    cancelWireCreation,
    addWire,
  } = useSimulatorStore();

  const handlePinClick = useCallback((
    componentId: string,
    pinName: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();

    const component = components.find(c => c.id === componentId);
    if (!component) return;

    const pinPosition = calculatePinPosition(
      componentId, pinName, component.x, component.y
    );

    if (!wireInProgress) {
      // Iniciar nuevo cable
      startWireCreation({ componentId, pinName, ...pinPosition });
    } else {
      // Completar cable
      const element = document.getElementById(componentId) as any;
      const pinInfo = element?.pinInfo?.find((p: any) => p.name === pinName);

      const signalType = determineSignalType(pinInfo?.signals || []);

      const newWire = {
        id: uuidv4(),
        start: wireInProgress.startEndpoint,
        end: { componentId, pinName, ...pinPosition },
        controlPoints: [],
        color: getWireColor(signalType),
        signalType,
        isValid: true,  // Phase 3 agregará validación
      };

      addWire(newWire);
      cancelWireCreation();
    }
  }, [wireInProgress, components]);

  // Mouse move para mostrar preview
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!wireInProgress) return;

    const canvas = document.querySelector('.canvas-content');
    const rect = canvas.getBoundingClientRect();
    updateWireInProgress(
      event.clientX - rect.left,
      event.clientY - rect.top
    );
  }, [wireInProgress]);

  // ESC para cancelar
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && wireInProgress) {
      cancelWireCreation();
    }
  }, [wireInProgress]);

  return { handlePinClick };
};
```

### Control Points

**Archivo nuevo**: `frontend/src/components/simulator/ControlPoint.tsx`

```typescript
export const ControlPoint: React.FC<{
  x: number;
  y: number;
  onDrag: (newX: number, newY: number) => void;
}> = ({ x, y, onDrag }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const canvas = document.querySelector('.canvas-content');
    const rect = canvas.getBoundingClientRect();

    const newX = e.clientX - rect.left;
    const newY = e.clientY - rect.top;

    // Snap to grid (20px)
    const snappedX = Math.round(newX / 20) * 20;
    const snappedY = Math.round(newY / 20) * 20;

    onDrag(snappedX, snappedY);
  }, [isDragging, onDrag]);

  return (
    <circle
      cx={x}
      cy={y}
      r="6"
      fill="#8b5cf6"  // Morado como en Wokwi
      stroke="white"
      strokeWidth="2"
      style={{ cursor: 'move', pointerEvents: 'all' }}
      onMouseDown={() => setIsDragging(true)}
    />
  );
};
```

### Multi-segment Path Generation

Actualizar `wirePathGenerator.ts`:

```typescript
function generateMultiSegmentPath(
  start: { x: number; y: number },
  controlPoints: WireControlPoint[],
  end: { x: number; y: number }
): string {
  let path = `M ${start.x} ${start.y}`;

  // Agregar control points con restricción ortogonal
  for (let i = 0; i < controlPoints.length; i++) {
    const cp = controlPoints[i];
    const prev = i === 0 ? start : controlPoints[i - 1];

    // Forzar segmentos horizontales o verticales
    if (Math.abs(cp.x - prev.x) > Math.abs(cp.y - prev.y)) {
      path += ` L ${cp.x} ${prev.y} L ${cp.x} ${cp.y}`;
    } else {
      path += ` L ${prev.x} ${cp.y} L ${cp.x} ${cp.y}`;
    }
  }

  // Conectar al endpoint
  const lastPoint = controlPoints[controlPoints.length - 1];
  if (Math.abs(end.x - lastPoint.x) > Math.abs(end.y - lastPoint.y)) {
    path += ` L ${end.x} ${lastPoint.y} L ${end.x} ${end.y}`;
  } else {
    path += ` L ${lastPoint.x} ${end.y} L ${end.x} ${end.y}`;
  }

  return path;
}
```

### Phase 2 Implementation Steps

1. ✅ Implementar `useWireCreation` hook
2. ✅ Crear `PinOverlay.tsx`
3. ✅ Crear `WireInProgressRenderer.tsx`
4. ✅ Crear `ControlPoint.tsx`
5. ✅ Actualizar `WireRenderer.tsx` para mostrar control points
6. ✅ Implementar selección de cables
7. ✅ Agregar keyboard handlers (ESC, Delete)
8. ✅ Implementar drag de control points con grid snapping
9. ✅ Actualizar `generateMultiSegmentPath()`
10. ✅ Agregar botón para insertar control points en el medio

---

## PHASE 3: Smart Routing & Validation

### Objetivos
- A* pathfinding para evitar componentes
- Validación estricta de conexiones eléctricas
- Feedback visual para conexiones inválidas
- Auto-rerouting cuando componentes se mueven

### Connection Validation

**Archivo nuevo**: `frontend/src/utils/connectionValidator.ts`

```typescript
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export function validateConnection(
  startSignals: PinSignalInfo[],
  endSignals: PinSignalInfo[]
): ValidationResult {
  const startType = determineSignalType(startSignals);
  const endType = determineSignalType(endSignals);

  // Regla 1: No conectar VCC a VCC
  if (startType === 'power-vcc' && endType === 'power-vcc') {
    return { isValid: false, error: 'Cannot connect VCC to VCC directly' };
  }

  // Regla 2: No conectar GND a GND
  if (startType === 'power-gnd' && endType === 'power-gnd') {
    return { isValid: false, error: 'Cannot connect GND to GND directly' };
  }

  // Regla 3: No hacer cortocircuito VCC-GND
  if (startType === 'power-vcc' && endType === 'power-gnd') {
    return { isValid: false, error: 'Cannot short VCC to GND' };
  }

  // Regla 4: Compatibilidad de señales
  if (!areSignalsCompatible(startType, endType)) {
    return {
      isValid: false,
      error: `Incompatible signal types: ${startType} and ${endType}`,
    };
  }

  // Regla 5: Validación de buses (I2C, SPI)
  const busError = validateBusProtocols(startSignals, endSignals);
  if (busError) {
    return { isValid: false, error: busError };
  }

  return { isValid: true };
}

function areSignalsCompatible(
  type1: WireSignalType,
  type2: WireSignalType
): boolean {
  // Power puede conectar a digital/analog pero no a otro power
  // Digital es universal
  // PWM compatible con digital y analog
  // Protocolos específicos deben coincidir
}
```

### A* Pathfinding

**Archivo nuevo**: `frontend/src/utils/pathfinding.ts`

```typescript
const GRID_SIZE = 20;  // Coincidir con grid del canvas

export function findWirePath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  components: Component[],
  excludeComponents: string[] = []
): { x: number; y: number }[] {
  // Snap to grid
  const gridStartX = Math.round(startX / GRID_SIZE);
  const gridStartY = Math.round(startY / GRID_SIZE);
  const gridEndX = Math.round(endX / GRID_SIZE);
  const gridEndY = Math.round(endY / GRID_SIZE);

  // Build obstacle map
  const obstacles = buildObstacleMap(components, excludeComponents);

  // Run A*
  const path = aStarSearch(
    { x: gridStartX, y: gridStartY },
    { x: gridEndX, y: gridEndY },
    obstacles
  );

  // Convert back to pixels
  return path.map(p => ({
    x: p.x * GRID_SIZE,
    y: p.y * GRID_SIZE,
  }));
}

function aStarSearch(
  start: { x: number; y: number },
  end: { x: number; y: number },
  obstacles: Set<string>
): { x: number; y: number }[] {
  // Algoritmo A* estándar
  // Heurística: Manhattan distance
  // Vecinos: 4-directional (arriba, abajo, izq, der)
  // Retorna path simplificado (sin puntos colineales)
}
```

**Archivo nuevo**: `frontend/src/utils/componentBounds.ts`

```typescript
export function getComponentBoundingBox(componentId: string): BoundingBox | null {
  const element = document.getElementById(componentId);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  const canvas = element.closest('.canvas-content');
  const canvasRect = canvas.getBoundingClientRect();

  return {
    x: rect.left - canvasRect.left,
    y: rect.top - canvasRect.top,
    width: rect.width,
    height: rect.height,
  };
}
```

### Auto-rerouting

Actualizar store:

```typescript
updateComponent: (id, updates) => {
  set((state) => ({
    components: state.components.map(c =>
      c.id === id ? { ...c, ...updates } : c
    ),
  }));

  // Re-calcular posiciones de cables conectados
  get().updateWirePositions(id);
},

updateWirePositions: (componentId: string) => {
  set((state) => {
    const component = state.components.find(c => c.id === componentId);
    if (!component) return state;

    const updatedWires = state.wires.map(wire => {
      let updated = { ...wire };

      // Actualizar start endpoint
      if (wire.start.componentId === componentId) {
        const pos = calculatePinPosition(
          componentId, wire.start.pinName, component.x, component.y
        );
        if (pos) updated.start = { ...wire.start, ...pos };
      }

      // Actualizar end endpoint
      if (wire.end.componentId === componentId) {
        const pos = calculatePinPosition(
          componentId, wire.end.pinName, component.x, component.y
        );
        if (pos) updated.end = { ...wire.end, ...pos };
      }

      // OPCIONAL: Re-calcular path con A* si hay componentes en el camino

      return updated;
    });

    return { wires: updatedWires };
  });
},
```

### Phase 3 Implementation Steps

1. ✅ Implementar `connectionValidator.ts`
2. ✅ Integrar validación en wire creation
3. ✅ Mostrar errores de validación (línea roja punteada + tooltip)
4. ✅ Implementar `componentBounds.ts`
5. ✅ Implementar `pathfinding.ts` con A*
6. ✅ Integrar A* en wire creation (hacer toggleable)
7. ✅ Agregar botón "Re-route" para cables existentes
8. ✅ Implementar auto-rerouting cuando componentes se mueven
9. ✅ Agregar tooltip de validación en hover
10. ✅ Panel de settings para toggle smart routing

---

## Critical Files Summary

### Archivos Nuevos (17 archivos)

**Tipos & Utilidades**:
1. `frontend/src/types/wire.ts` - Data structures
2. `frontend/src/utils/pinPositionCalculator.ts` - **CRÍTICO** - Conversión coordenadas
3. `frontend/src/utils/componentBounds.ts` - Bounding boxes
4. `frontend/src/utils/wirePathGenerator.ts` - Generación SVG paths
5. `frontend/src/utils/wireColors.ts` - Mapeo de colores
6. `frontend/src/utils/connectionValidator.ts` - Validación eléctrica
7. `frontend/src/utils/pathfinding.ts` - A* algorithm

**Componentes**:
8. `frontend/src/components/simulator/WireLayer.tsx` - Contenedor SVG
9. `frontend/src/components/simulator/WireRenderer.tsx` - **CRÍTICO** - Render individual
10. `frontend/src/components/simulator/WireInProgressRenderer.tsx` - Preview durante creación
11. `frontend/src/components/simulator/ControlPoint.tsx` - Puntos violetas
12. `frontend/src/components/simulator/PinOverlay.tsx` - Marcadores de pines
13. `frontend/src/components/simulator/WireCreationHandler.tsx` - Hook de creación

### Archivos a Modificar (2 archivos)

14. `frontend/src/store/useSimulatorStore.ts` - **CRÍTICO** - Wire state management
15. `frontend/src/components/simulator/SimulatorCanvas.tsx` - Integración WireLayer

### CSS

16. `frontend/src/components/simulator/SimulatorCanvas.css` - Wire styles

---

## Performance Optimizations

1. **React.memo** en WireRenderer con custom comparator
2. **useMemo** para path generation
3. **useCallback** para event handlers
4. **Debounce** (16ms) para control point updates
5. **Virtual rendering** si hay >100 cables

---

## Edge Cases & Error Handling

1. **Component deletion**: Eliminar cables conectados
2. **Invalid pin references**: Marcar cable como inválido
3. **Overlapping wires**: Offset visual
4. **Moving components**: Auto-update wire positions
5. **Undo/Redo**: Guardar historial de cambios

---

## Testing Strategy

**Phase 1**:
- Unit tests para `calculatePinPosition()`
- Unit tests para `determineSignalType()`
- Unit tests para `generateSimplePath()`

**Phase 2**:
- Integration tests para wire creation flow
- Test control point dragging
- Test keyboard shortcuts

**Phase 3**:
- Unit tests para `validateConnection()`
- Unit tests para A* pathfinding
- Performance tests con 50+ cables

---

## Success Criteria

**Phase 1 Done When**:
- ✅ Cables se renderizan con colores correctos
- ✅ Posiciones actualizadas cuando componentes se mueven
- ✅ Puede crear cables manualmente via código

**Phase 2 Done When**:
- ✅ Click pin → drag → click pin crea cable
- ✅ Puntos de control violetas aparecen al seleccionar
- ✅ Drag puntos reshapes cable
- ✅ Delete elimina cable seleccionado

**Phase 3 Done When**:
- ✅ Conexiones inválidas son bloqueadas
- ✅ A* encuentra paths que evitan componentes
- ✅ Mover componente re-route cables automáticamente
- ✅ Tooltips muestran errores de validación
