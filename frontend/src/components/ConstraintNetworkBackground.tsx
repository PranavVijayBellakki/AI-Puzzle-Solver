import React, { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isConstraintCheck: boolean;
  pulseSpeed: number;
  pulseTime: number;
}

export const ConstraintNetworkBackground: React.FC = () => {
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

    // Mouse coordinate tracker
    const mouse = { x: -1000, y: -1000, radius: 180 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    // Generate constraint nodes
    const nodeCount = Math.min(80, Math.floor((width * height) / 18000));
    const nodes: Node[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const isConstraintCheck = Math.random() < 0.15;
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: isConstraintCheck ? 5 + Math.random() * 3 : 2 + Math.random() * 2,
        color: isConstraintCheck
          ? "rgba(168, 85, 247, 0.6)" // Purple for constraint clues
          : "rgba(6, 182, 212, 0.4)", // Cyan for ordinary variables
        isConstraintCheck,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        pulseTime: Math.random() * Math.PI,
      });
    }

    const tick = () => {
      ctx.fillStyle = "rgba(7, 9, 19, 0.2)"; // subtle trail decay for smoother frame blending
      ctx.fillRect(0, 0, width, height);

      // Draw Grid lines representing constraint boundaries
      ctx.strokeStyle = "rgba(6, 182, 212, 0.03)";
      ctx.lineWidth = 1;
      const gridSize = 80;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update and draw nodes
      nodes.forEach((node) => {
        // Move nodes
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off bounds
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Clamp inside bounds
        node.x = Math.max(0, Math.min(width, node.x));
        node.y = Math.max(0, Math.min(height, node.y));

        // Physics interaction with mouse (slight attraction/repulsion constraint)
        const dx = node.x - mouse.x;
        const dy = node.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          // Slowly pull nodes towards mouse to symbolize focus/selection search
          node.x -= (dx / dist) * force * 0.5;
          node.y -= (dy / dist) * force * 0.5;
        }

        // Pulse constraint check nodes
        if (node.isConstraintCheck) {
          node.pulseTime += node.pulseSpeed;
          node.radius = 5 + Math.sin(node.pulseTime) * 2;
        }

        // Draw connections (edges of the constraint graph)
        nodes.forEach((other) => {
          if (node === other) return;
          const odx = node.x - other.x;
          const ody = node.y - other.y;
          const odist = Math.sqrt(odx * odx + ody * ody);

          // Connection range
          const maxDist = 140;
          if (odist < maxDist) {
            const alpha = (1 - odist / maxDist) * 0.12;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = node.isConstraintCheck || other.isConstraintCheck
              ? `rgba(168, 85, 247, ${alpha})`
              : `rgba(6, 182, 212, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });

        // Draw connections to mouse
        if (dist < mouse.radius) {
          const alpha = (1 - dist / mouse.radius) * 0.25;
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Render the node itself
        ctx.beginPath();
        if (node.isConstraintCheck) {
          // Render constraint as square/diamond checkpoint
          ctx.rect(node.x - node.radius, node.y - node.radius, node.radius * 2, node.radius * 2);
          ctx.fillStyle = "rgba(168, 85, 247, 0.85)";
          ctx.shadowColor = "#a855f7";
        } else {
          // Render ordinary variable node
          ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
          ctx.fillStyle = "rgba(6, 182, 212, 0.75)";
          ctx.shadowColor = "#06b6d4";
        }
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
};
