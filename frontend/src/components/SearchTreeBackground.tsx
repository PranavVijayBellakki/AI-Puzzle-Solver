import React, { useEffect, useRef } from "react";

interface TreeNode {
  id: string;
  x: number;
  y: number;
  color: string;
  children: TreeNode[];
  pulse: number;
}

export const SearchTreeBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Track resizing
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Root tree state
    const root: TreeNode = {
      id: "root",
      x: width / 2,
      y: 80,
      color: "rgba(6, 182, 212, 0.4)", // cyan
      children: [],
      pulse: 0
    };

    // Helper to generate dynamic search trees
    const spawnNodes = (node: TreeNode, depth: number) => {
      if (depth > 5) return;
      if (node.children.length === 0 && Math.random() < 0.05) {
        const childCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < childCount; i++) {
          node.children.push({
            id: Math.random().toString(),
            x: node.x + (Math.random() - 0.5) * (300 / (depth + 1)),
            y: node.y + 80 + (Math.random() - 0.2) * 20,
            color: Math.random() < 0.15 ? "rgba(239, 68, 68, 0.6)" : "rgba(6, 182, 212, 0.4)", // backtrack red or try cyan
            children: [],
            pulse: Math.random() * Math.PI
          });
        }
      }
      node.children.forEach(c => spawnNodes(c, depth + 1));
    };

    // Helper to draw links and node elements
    const drawTree = (context: CanvasRenderingContext2D, node: TreeNode) => {
      node.children.forEach(child => {
        context.beginPath();
        context.moveTo(node.x, node.y);
        context.lineTo(child.x, child.y);
        context.strokeStyle = child.color.includes("239") 
          ? "rgba(239, 68, 68, 0.15)" // faint red link
          : "rgba(139, 92, 246, 0.15)"; // faint purple link
        context.lineWidth = 1.5;
        context.stroke();

        drawTree(context, child);
      });

      // Draw node circle
      context.beginPath();
      context.arc(node.x, node.y, 4 + Math.sin(node.pulse) * 1.5, 0, 2 * Math.PI);
      context.fillStyle = node.color;
      context.shadowColor = node.color;
      context.shadowBlur = 8;
      context.fill();
      context.shadowBlur = 0; // reset blur

      node.pulse += 0.02;
    };

    // Loop at 60 FPS
    const tick = () => {
      ctx.fillStyle = "rgba(7, 9, 19, 0.08)"; // trail decay for glassmorphic visual persistence
      ctx.fillRect(0, 0, width, height);

      // Spawn and draw
      spawnNodes(root, 0);
      drawTree(ctx, root);

      // Prune dead nodes periodically
      if (Math.random() < 0.02) {
        root.children = root.children.filter(() => Math.random() > 0.15);
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
};
