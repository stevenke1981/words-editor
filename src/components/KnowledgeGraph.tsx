import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KnowledgeEdge, KnowledgeNode } from '../types';

interface KnowledgeGraphProps {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  onNodeClick?: (node: KnowledgeNode) => void;
  onNodesChange?: (nodes: KnowledgeNode[]) => void;
  width?: number;
  height?: number;
  className?: string;
  interactive?: boolean;
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  nodes: initialNodes,
  edges,
  onNodeClick,
  onNodesChange,
  width = 240,
  height = 140,
  className = '',
  interactive = true,
}) => {
  // Internal positions (support dragging)
  const [nodes, setNodes] = useState<KnowledgeNode[]>(initialNodes);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const lastMouse = useRef({ x: 0, y: 0 });
  const dragInfoRef = useRef<{
    nodeId: string | null;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  }>({
    nodeId: null,
    offsetX: 0,
    offsetY: 0,
    moved: false,
  });

  // Sync external nodes if they change (e.g. reset)
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  // Notify parent of position changes (immutable)
  const updateNodes = useCallback(
    (newNodes: KnowledgeNode[]) => {
      setNodes(newNodes);
      onNodesChange?.(newNodes);
    },
    [onNodesChange],
  );

  // Get node by id
  const getNode = useCallback((id: string) => nodes.find((n) => n.id === id), [nodes]);

  // Highlighted edges when a node is selected
  const highlightedEdgeIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    return new Set(
      edges.filter((e) => e.source === selectedId || e.target === selectedId).map((e) => e.id),
    );
  }, [selectedId, edges]);

  // Convert screen coordinates to SVG user space
  const screenToSvg = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };

    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  // Apply pan/zoom limits
  const clampTransform = useCallback((t: Transform): Transform => {
    const minScale = 0.6;
    const maxScale = 2.5;
    const scale = Math.max(minScale, Math.min(maxScale, t.scale));
    // loose bounds
    const maxPan = 120;
    return {
      x: Math.max(-maxPan, Math.min(maxPan, t.x)),
      y: Math.max(-maxPan, Math.min(maxPan, t.y)),
      scale,
    };
  }, []);

  // Zoom handler (wheel)
  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      if (!interactive) return;
      e.preventDefault();

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseSvg = screenToSvg(e.clientX, e.clientY);
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = transform.scale * factor;

      // Zoom towards mouse position
      const newX = mouseSvg.x - (mouseSvg.x - transform.x) * (newScale / transform.scale);
      const newY = mouseSvg.y - (mouseSvg.y - transform.y) * (newScale / transform.scale);

      setTransform(clampTransform({ x: newX, y: newY, scale: newScale }));
    },
    [transform, interactive, screenToSvg, clampTransform],
  );

  // Start pan or node drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!interactive) return;

      const svg = svgRef.current;
      if (!svg) return;

      const target = e.target as SVGElement;
      const nodeGroup = target.closest('[data-node-id]') as SVGElement | null;
      const nodeId = nodeGroup?.getAttribute('data-node-id');

      const mouseSvg = screenToSvg(e.clientX, e.clientY);

      if (nodeId) {
        // Start dragging a node
        const node = getNode(nodeId);
        if (node) {
          setDragNodeId(nodeId);
          dragInfoRef.current = {
            nodeId,
            offsetX: mouseSvg.x - node.x,
            offsetY: mouseSvg.y - node.y,
            moved: false,
          };
          setSelectedId(nodeId);
        }
      } else {
        // Start panning the view
        setIsPanning(true);
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
    },
    [interactive, screenToSvg, getNode],
  );

  // Drag / pan move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!interactive) return;

      if (dragNodeId && dragInfoRef.current.nodeId) {
        const mouseSvg = screenToSvg(e.clientX, e.clientY);
        const { offsetX, offsetY } = dragInfoRef.current;
        dragInfoRef.current.moved = true;
        const newX = mouseSvg.x - offsetX;
        const newY = mouseSvg.y - offsetY;

        const newNodes = nodes.map((n) => (n.id === dragNodeId ? { ...n, x: newX, y: newY } : n));
        updateNodes(newNodes);
      } else if (isPanning) {
        const dx = (e.clientX - lastMouse.current.x) / transform.scale;
        const dy = (e.clientY - lastMouse.current.y) / transform.scale;

        setTransform((prev) =>
          clampTransform({
            ...prev,
            x: prev.x + dx,
            y: prev.y + dy,
          }),
        );
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
    },
    [
      interactive,
      dragNodeId,
      nodes,
      updateNodes,
      isPanning,
      transform.scale,
      clampTransform,
      screenToSvg,
    ],
  );

  // End drag/pan
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDragNodeId(null);
    if (dragInfoRef.current.nodeId) {
      setTimeout(() => {
        dragInfoRef.current = { nodeId: null, offsetX: 0, offsetY: 0, moved: false };
      }, 0);
    } else {
      dragInfoRef.current = { nodeId: null, offsetX: 0, offsetY: 0, moved: false };
    }
  }, []);

  // Click on background clears selection (if not dragging)
  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const target = e.target as SVGElement;
      const nodeGroup = target.closest('[data-node-id]');
      if (!nodeGroup && selectedId) {
        setSelectedId(null);
      }
    },
    [selectedId],
  );

  // Node click (for selection + callback, separate from drag)
  const handleNodeClick = useCallback(
    (node: KnowledgeNode, e: React.MouseEvent) => {
      e.stopPropagation();
      if (dragInfoRef.current.nodeId === node.id && dragInfoRef.current.moved) return;

      setSelectedId(node.id === selectedId ? null : node.id);
      onNodeClick?.(node);
      dragInfoRef.current = { nodeId: null, offsetX: 0, offsetY: 0, moved: false };
    },
    [selectedId, onNodeClick],
  );

  // Control buttons
  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
    setSelectedId(null);
  }, []);

  const zoomIn = useCallback(() => {
    setTransform((prev) => clampTransform({ ...prev, scale: prev.scale * 1.2 }));
  }, [clampTransform]);

  const zoomOut = useCallback(() => {
    setTransform((prev) => clampTransform({ ...prev, scale: prev.scale / 1.2 }));
  }, [clampTransform]);

  // Compute node visual size based on label
  const getNodeSize = useCallback((label: string) => {
    const textWidth = Math.max(52, label.length * 6.2 + 18);
    return { w: textWidth, h: 18 };
  }, []);

  // Render edges first (under nodes)
  const renderedEdges = useMemo(() => {
    return edges.map((edge) => {
      const source = getNode(edge.source);
      const target = getNode(edge.target);
      if (!source || !target) return null;

      const isHighlighted = highlightedEdgeIds.has(edge.id);

      return (
        <line
          key={edge.id}
          x1={source.x}
          y1={source.y}
          x2={target.x}
          y2={target.y}
          className={`edge ${isHighlighted ? 'highlighted' : ''}`}
          strokeDasharray={isHighlighted ? 'none' : '2,1'}
        />
      );
    });
  }, [edges, getNode, highlightedEdgeIds]);

  // Render nodes
  const renderedNodes = useMemo(() => {
    return nodes.map((node) => {
      const isSelected = node.id === selectedId;
      const size = getNodeSize(node.label);
      const color = node.color || (node.type === 'concept' ? '#2563eb' : '#64748b');

      return (
        <g
          key={node.id}
          data-node-id={node.id}
          className={`node ${isSelected ? 'selected' : ''}`}
          tabIndex={0}
          onClick={(e) => handleNodeClick(node, e)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelectedId(node.id);
              onNodeClick?.(node);
            }
          }}
          onMouseDown={(_e) => {
            // handled in svg mousedown for consistency
          }}
        >
          {/* Node background pill */}
          <rect
            x={node.x - size.w / 2}
            y={node.y - size.h / 2}
            width={size.w}
            height={size.h}
            rx={9}
            ry={9}
            fill="white"
            stroke={color}
            strokeWidth={isSelected ? 2.5 : 1.5}
            style={{ filter: isSelected ? 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.1))' : undefined }}
          />
          {/* Label */}
          <text
            x={node.x}
            y={node.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9.5"
            fontWeight={600}
            fill={color}
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {node.label}
          </text>
          {/* Small type indicator dot */}
          <circle
            cx={node.x + size.w / 2 - 4}
            cy={node.y - size.h / 2 + 4}
            r={2.5}
            fill={color}
            opacity={0.85}
          />
        </g>
      );
    });
  }, [nodes, selectedId, handleNodeClick, getNodeSize, onNodeClick]);

  const graphContentTransform = `translate(${transform.x} ${transform.y}) scale(${transform.scale})`;

  return (
    <div className={`graph-container relative select-none ${className}`} style={{ width, height }}>
      <svg
        ref={svgRef}
        role="img"
        aria-label="知識關聯圖"
        width={width}
        height={height}
        className="graph-svg"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setSelectedId(null);
        }}
        style={{ touchAction: 'none' }}
      >
        {/* Subtle grid background */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill="url(#grid)" />

        {/* Main transformed group */}
        <g transform={graphContentTransform}>
          {/* Edges */}
          {renderedEdges}

          {/* Nodes */}
          {renderedNodes}
        </g>
      </svg>

      {/* Mini controls - only when interactive */}
      {interactive && (
        <div className="absolute bottom-1 right-1 flex gap-0.5 bg-white/90 backdrop-blur rounded-md shadow-sm border border-slate-200 p-0.5">
          <button
            type="button"
            onClick={zoomOut}
            className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded text-[10px] leading-none"
            title="縮小"
          >
            −
          </button>
          <button
            type="button"
            onClick={resetView}
            className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded text-[9px]"
            title="重置視圖"
          >
            ⟲
          </button>
          <button
            type="button"
            onClick={zoomIn}
            className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded text-[10px] leading-none"
            title="放大"
          >
            +
          </button>
        </div>
      )}

      {/* Selection hint */}
      {selectedId && (
        <div className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100">
          已選取
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraph;
