"use client";
import { useGetScreenSize } from "@/hooks/useGetScreenSize";

import React, { useEffect, useRef, useState } from "react";

interface Shape {
  type: ToolType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  height: number;
  text: string;
}
type ToolType = "rect" | "circle" | "line" | "arrow" | "text" | "eraser";

const Home = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<ToolType>("rect");
  const windowSize = useGetScreenSize();
  const [shapes, setShapes] = useState<Shape[]>([]);
  const isDrawingRef = useRef(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const currentShapeRef = useRef<Shape | null>(null);
  const isPointInShape = (x: number, y: number, shape: Shape) => {
    switch (shape.type) {
      case "rect":
        const minX = Math.min(shape.startX, shape.startX + shape.width);
        const maxX = Math.max(shape.startX, shape.startX + shape.width);
        const minY = Math.min(shape.startY, shape.startY + shape.height);
        const maxY = Math.max(shape.startY, shape.startY + shape.height);
        return x >= minX && x <= maxX && y >= minY && y <= maxY;

      case "circle":
        const centerX = shape.startX + shape.width / 2;
        const centerY = shape.startY + shape.height / 2;
        const radius = Math.max(
          Math.abs(shape.width / 2),
          Math.abs(shape.height / 2)
        );
        const distance = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );
        return distance <= radius;
      case "line":
      case "arrow":
        const startX = shape.startX;
        const startY = shape.startY;
        const endX = shape.startX + shape.width;
        const endY = shape.startY + shape.height;

        const dx = endX - startX;
        const dy = endY - startY;

        const numerator = Math.abs(
          dy * x - dx * y + endX * startY - endY * startX
        );
        const denominator = Math.sqrt(dx * dx + dy * dy);

        const distanceToLine = numerator / denominator;
        return distanceToLine <= 5;
      case "text":
        const padding = 5; // Add some padding around the text
        const textminX = Math.min(
          shape.startX - padding,
          shape.startX + shape.width + padding
        );
        const textmaxX = Math.max(
          shape.startX - padding,
          shape.startX + shape.width + padding
        );
        const textminY = Math.min(
          shape.startY - padding,
          shape.startY + shape.height + padding
        );
        const textmaxY = Math.max(
          shape.startY - padding,
          shape.startY + shape.height + padding
        );

        return x >= textminX && x <= textmaxX && y >= textminY && y <= textmaxY;
      default:
        return false;
    }
  };

  function drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
    const { type, startX, startY, endX, endY, width, height, text } = shape;

    if (type === "rect") {
      ctx.strokeRect(startX, startY, width, height);
    } else if (type === "circle") {
      const centerX = startX + width / 2;
      const centerY = startY + height / 2;
      const radius = Math.max(Math.abs(width / 2), Math.abs(height / 2));
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    switch (type) {
      case "rect":
        ctx.strokeRect(startX, startY, width, height);
        break;
      case "circle":
        const centerX = startX + width / 2;
        const centerY = startY + height / 2;
        const radius = Math.max(Math.abs(width / 2), Math.abs(height / 2));
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "line":
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + width, startY + height);
        ctx.stroke();
        break;
      case "arrow":
        ctx.beginPath();

        ctx.moveTo(startX, startY);

        ctx.lineTo(endX, endY);

        // Calculate angle for arrowhead

        const angle = Math.atan2(endY - startY, endX - startX);

        // Draw arrowhead lines

        ctx.lineTo(
          endX - Math.cos(angle - Math.PI / 6) * 10,

          endY - Math.sin(angle - Math.PI / 6) * 10
        );

        ctx.moveTo(endX, endY);

        ctx.lineTo(
          endX - Math.cos(angle + Math.PI / 6) * 10,

          endY - Math.sin(angle + Math.PI / 6) * 10
        );

        ctx.stroke();
        break;
      case "eraser":
        const index = shapes.findIndex((shape) =>
          isPointInShape(endX, endY, shape)
        );

        if (index !== -1) {
          setShapes(shapes.filter((_, i) => index !== i));
        }
        break;
      case "text":
        ctx.font = "20px Arial";
        ctx.fillStyle = "black";
        ctx.fillText(text, startX, startY);

        break;

      default:
        break;
    }
  }
  // Separate useEffect for drawing saved shapes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    // Clear and redraw all saved shapes
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    shapes?.forEach((shape) => drawShape(ctx, shape));
  }, [shapes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "black";

    const drawCurrentShape = () => {
      if (!currentShapeRef.current) return;

      // Clear only the area where we're drawing the current rectangle
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Redraw all saved rectangles
      shapes.forEach((shape) => {
        drawShape(ctx, shape);
      });

      // Draw the current shape
      const curr = currentShapeRef.current;
      curr.text = textAreaRef.current?.value || "text";

      drawShape(ctx, {
        type: tool,
        startX: curr.startX,
        startY: curr.startY,
        endX: curr.endX,
        endY: curr.endY,
        width: curr.width,
        height: curr.height,
        text: curr.text,
      });
    };

    const handleMouseDown = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const startX = event.clientX - rect.left;
      const startY = event.clientY - rect.top;

      isDrawingRef.current = true;

      currentShapeRef.current = {
        type: tool,
        startX,
        startY,
        endX: startX + 5,
        endY: startY + 5,
        width: 0,
        height: 0,
        text: "",
      };
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDrawingRef.current || !currentShapeRef.current) return;

      const client = canvas.getBoundingClientRect();
      const currentX = event.clientX - client.left;
      const currentY = event.clientY - client.top;

      currentShapeRef.current.endX = currentX;
      currentShapeRef.current.endY = currentY;

      currentShapeRef.current.width = currentX - currentShapeRef.current.startX;
      currentShapeRef.current.height =
        currentY - currentShapeRef.current.startY;

      drawCurrentShape();
    };

    const handleMouseUp = () => {
      if (currentShapeRef.current && tool !== "eraser") {
        const newRect = { ...currentShapeRef.current };
        setShapes((prev) => [...prev, newRect]);
        currentShapeRef.current = null;
      }
      isDrawingRef.current = false;
    };

    const handleMouseLeave = () => {
      if (isDrawingRef.current) {
        handleMouseUp();
      }
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [shapes, tool]);

  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <nav className="absolute top-10 px-4 py-2 text-base transition-all text-black shadow-xs rounded-md shadow-black bg-primary-400  border-2 border-black hover:bg-primary-500 flex gap-3 ">
        <button
          className="bg-slate-300 rounded-md py-1 px-2"
          onClick={(e) => {
            e.stopPropagation();
            setTool("text");
          }}
        >
          <p className="text-2xl">A</p>
        </button>
        <button
          className="bg-slate-300 rounded-md py-1 px-2"
          onClick={(e) => {
            e.stopPropagation();
            setTool("circle");
          }}
        >
          <p className="text-2xl">◯</p>
        </button>
        <button
          className="bg-slate-300 rounded-md py-1 px-2"
          onClick={(e) => {
            e.stopPropagation();
            setTool("rect");
          }}
        >
          <p className="text-2xl">▢</p>
        </button>
        <button
          className="bg-slate-300 rounded-md py-1 px-2"
          onClick={(e) => {
            e.stopPropagation();
            setTool("line");
          }}
        >
          <p className="text-2xl">—</p>
        </button>
        <button
          className="bg-slate-300 rounded-md py-1 px-2"
          onClick={(e) => {
            e.stopPropagation();
            setTool("arrow");
          }}
        >
          <p className="text-2xl">→</p>
        </button>
        <button
          className="bg-slate-300 rounded-md py-1 px-2"
          onClick={(e) => {
            e.stopPropagation();
            setTool("eraser");
          }}
        >
          <p className="text-2xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-eraser"
            >
              <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
              <path d="M22 21H7" />
              <path d="m5 11 9 9" />
            </svg>
          </p>
        </button>
        <button
          className="bg-slate-300 rounded-md py-1 px-2"
          onClick={(e) => {
            e.stopPropagation();
            setShapes([]);
          }}
        >
          <p className="text-2xl">↻</p>
        </button>
      </nav>
      {tool === "text" && (
        <div
          className="fixed m-0 p-0 "
          style={{
            top: windowSize.height / 2 + 250,
            left: windowSize.width / 2 - 200,
          }}
        >
          <textarea
            ref={textAreaRef}
            autoFocus
            className="  border outline-none resize text-black overflow-hidden whitespace-pre text-clip bg-slate-100 z-10 border-black rounded-md w-96 "
          />
        </div>
      )}
      <div className=" border-gray-600 rounded-md">
        <canvas
          ref={canvasRef}
          width={windowSize.width || 0}
          height={windowSize.height || 0}
          style={{
            cursor: tool === "eraser" ? "pointer" : "crosshair",
          }}
        />
      </div>
    </div>
  );
};

export default Home;
