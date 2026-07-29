import React, { useEffect, useRef } from "react";

interface Node {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  label: string;
  type: "root" | "expand" | "backtrack" | "success";
  pulse: number;
}

interface Edge {
  source: string;
  target: string;
}

export const InteractiveSearchCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Initial graph nodes (search tree root and first branch layers)
    const nodes: Node[] = [
      { id: "root", x: width / 2, y: height / 2 - 100, vx: 0, vy: 0, radius: 22, label: "Root", type: "root", pulse: 0 },
      { id: "var_1", x: width / 2 - 150, y: height / 2, vx: 0, vy: 0, radius: 16, label: "Var A", type: "expand", pulse: 1 },
      { id: "var_2", x: width / 2 + 150, y: height / 2, vx: 0, vy: 0, radius: 16, label: "Var B", type: "expand", pulse: 2 },
      { id: "val_1_1", x: width / 2 - 250, y: height / 2 + 120, vx: 0, vy: 0, radius: 12, label: "A=1", type: "success", pulse: 3 },
      { id: "val_1_2", x: width / 2 - 80, y: height / 2 + 120, vx: 0, vy: 0, radius: 12, label: "A=2", type: "backtrack", pulse: 4 },
      { id: "val_2_1", x: width / 2 + 80, y: height / 2 + 120, vx: 0, vy: 0, radius: 12, label: "B=1", type: "expand", pulse: 5 },
      { id: "val_2_2", x: width / 2 + 250, y: height / 2 + 120, vx: 0, vy: 0, radius: 12, label: "B=2", type: "backtrack", pulse: 6 }
    ];

    const edges: Edge[] = [
      { source: "root", target: "var_1" },
      { source: "root", target: "var_2" },
      { source: "var_1", target: "val_1_1" },
      { source: "var_1", target: "val_1_2" },
      { source: "var_2", target: "val_2_1" },
      { source: "var_2", target: "val_2_2" }
    ];

    // Interaction tracking
    let draggingNodeId: string | null = null;
    let dragOffset = { x: 0, y: 0 };
    let mouseX = -1000;
    let mouseY = -1000;

    const getClickedNode = (mx: number, my: number): Node | null => {
      for (const node of nodes) {
        const dx = node.x - mx;
        const dy = node.y - my;
        if (Math.sqrt(dx * dx + dy * dy) < node.radius + 10) {
          return node;
        }
      }
      return null;
    };

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const clicked = getClickedNode(mx, my);

      if (clicked) {
        draggingNodeId = clicked.id;
        dragOffset.x = clicked.x - mx;
        dragOffset.y = clicked.y - my;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;

      if (draggingNodeId) {
        const node = nodes.find(n => n.id === draggingNodeId);
        if (node) {
          node.x = mouseX + dragOffset.x;
          node.y = mouseY + dragOffset.y;
          // Keep root or dragged nodes semi-static during drag
          node.vx = 0;
          node.vy = 0;
        }
      }
    };

    const handleMouseUp = () => {
      draggingNodeId = null;
    };

    // Double click spawns new backtrack node from selected or hovered node
    const handleDoubleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const parent = getClickedNode(mx, my);

      if (parent) {
        const childId = `node_${Math.random().toString(36).substr(2, 5)}`;
        const types: Array<"expand" | "backtrack" | "success"> = ["expand", "backtrack", "success"];
        const randType = types[Math.floor(Math.random() * types.length)];
        const labels = {
          expand: `SubVar ${nodes.length}`,
          backtrack: "Conflict",
          success: "Solution"
        };

        const newNode: Node = {
          id: childId,
          x: parent.x + (Math.random() - 0.5) * 80,
          y: parent.y + 70 + Math.random() * 20,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 2,
          radius: randType === "success" ? 14 : 11,
          label: labels[randType],
          type: randType,
          pulse: Math.random() * 10
        };

        nodes.push(newNode);
        edges.push({ source: parent.id, target: childId });
      }
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("dblclick", handleDoubleClick);

    // Dynamic AI explore simulator running on background
    let tickCounter = 0;
    const tick = () => {
      ctx.fillStyle = "rgba(7, 9, 19, 0.15)"; // background decay
      ctx.fillRect(0, 0, width, height);

      tickCounter++;

      // Force Directed Layout calculations (Spring Physics)
      const k = 100; // Optimal length of springs
      const cRepulsion = 150000; // Repulsion constant
      const cSpring = 0.05; // Spring force constant
      const damping = 0.85;

      // 1. Repulsion force between ALL pairs of nodes
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          if (dist < 350) {
            const force = cRepulsion / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (n1.id !== draggingNodeId && n1.id !== "root") {
              n1.vx += fx * 0.1;
              n1.vy += fy * 0.1;
            }
            if (n2.id !== draggingNodeId && n2.id !== "root") {
              n2.vx -= fx * 0.1;
              n2.vy -= fy * 0.1;
            }
          }
        }
      }

      // 2. Attraction forces along edges
      edges.forEach(edge => {
        const n1 = nodes.find(n => n.id === edge.source);
        const n2 = nodes.find(n => n.id === edge.target);
        if (!n1 || !n2) return;

        const dx = n1.x - n2.x;
        const dy = n1.y - n2.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Hooke's Law: Force proportional to displacement
        const displacement = dist - k;
        const force = cSpring * displacement;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (n1.id !== draggingNodeId && n1.id !== "root") {
          n1.vx -= fx;
          n1.vy -= fy;
        }
        if (n2.id !== draggingNodeId && n2.id !== "root") {
          n2.vx += fx;
          n2.vy += fy;
        }
      });

      // 3. Gravity/Center-attraction to prevent node drifting
      nodes.forEach(node => {
        if (node.id === "root") {
          // Keep root centered near top
          const targetX = width / 2;
          const targetY = 120;
          node.x += (targetX - node.x) * 0.1;
          node.y += (targetY - node.y) * 0.1;
          return;
        }

        const centerForce = 0.005;
        node.vx += (width / 2 - node.x) * centerForce;
        node.vy += (height / 2 - node.y) * centerForce;

        // Apply friction and update coordinates
        if (node.id !== draggingNodeId) {
          node.x += node.vx;
          node.y += node.vy;
          node.vx *= damping;
          node.vy *= damping;
        }

        // Clamp inside frame
        node.x = Math.max(node.radius + 10, Math.min(width - node.radius - 10, node.x));
        node.y = Math.max(node.radius + 10, Math.min(height - node.radius - 10, node.y));
      });

      // Draw Edges
      edges.forEach(edge => {
        const n1 = nodes.find(n => n.id === edge.source);
        const n2 = nodes.find(n => n.id === edge.target);
        if (!n1 || !n2) return;

        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.strokeStyle = n2.type === "backtrack"
          ? "rgba(239, 68, 68, 0.25)"
          : n2.type === "success"
          ? "rgba(34, 197, 94, 0.25)"
          : "rgba(99, 102, 241, 0.2)";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw Nodes
      nodes.forEach(node => {
        node.pulse += 0.03;
        const pulseRadius = node.radius + Math.sin(node.pulse) * 1.5;

        // Draw shadow glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, pulseRadius, 0, 2 * Math.PI);
        ctx.shadowColor = node.type === "root"
          ? "#22d3ee" // Cyan
          : node.type === "backtrack"
          ? "#ef4444" // Red
          : node.type === "success"
          ? "#22c55e" // Green
          : "#6366f1"; // Indigo
        ctx.shadowBlur = 15;
        
        ctx.fillStyle = node.type === "root"
          ? "rgba(34, 211, 238, 0.85)"
          : node.type === "backtrack"
          ? "rgba(239, 68, 68, 0.8)"
          : node.type === "success"
          ? "rgba(34, 197, 94, 0.85)"
          : "rgba(99, 102, 241, 0.75)";
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Draw Node border if selected
        if (node.id === draggingNodeId) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Draw Node Label text
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.label, node.x, node.y);
      });

      // Draw instruction tooltip on screen
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Interactive Constraint Search Graph: Drag nodes to test constraints • Double-click node to spawn branch", width / 2, height - 40);

      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("dblclick", handleDoubleClick);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-auto z-0" />;
};
