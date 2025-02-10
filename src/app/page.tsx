"use client";
import { useGetScreenSize } from "@/hooks/useGetScreenSize";

import React, {
  useEffect,
  useRef,
  useState,
  MouseEvent as ReactMouseEvent,
} from "react";

import {
  ArrowDownLeft,
  Circle,
  EraserIcon,
  Move,
  PenLineIcon,
  RectangleHorizontal,
  RotateCw,
  ZoomIn,
} from "lucide-react";


interface Shape {
  id: number;
  type: ToolType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  height: number;
  text: string;
}
type CursorStyle =
  | "pan"
  | "grabbing"
  | "grab"
  | "zoom-in"
  | "zoom-out"
  | "crosshair"
  | "default"
  | "text";
type ToolType =
  | "rect"
  | "circle"
  | "line"
  | "arrow"
  | "text"
  | "eraser"
  | "pan"
  | "zoom";

interface CanvasState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const Home = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<ToolType>("rect");
  const windowSize = useGetScreenSize();
  const [shapes, setShapes] = useState<Shape[]>([]);
  const isDrawingRef = useRef(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const currentShapeRef = useRef<Shape | null>(null);
  const [cursorStyle, setCursorStyle] = useState<CursorStyle>("default");
  const shapeIdCounter = useRef(0);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

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

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;

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
  const getTransformedCoordinates = (
    event: MouseEvent | ReactMouseEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const x =
      (event.clientX - rect.left - canvasState.offsetX) / canvasState.scale;
    const y =
      (event.clientY - rect.top - canvasState.offsetY) / canvasState.scale;

    return { x, y };
  };

  const handlePan = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || tool !== "pan") return;
    event.preventDefault();
    if (event.type === "mousedown") {
      panStartRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
      setCursorStyle("grabbing");
      document.addEventListener("mousemove", handlePanMove);
      document.addEventListener("mouseup", handlePanEnd);
    }
  };
  const handlePanMove = (event: MouseEvent) => {
    if (!panStartRef.current) return;
    const deltaX = event.clientX - panStartRef.current!.x;
    const deltaY = event.clientY - panStartRef.current!.y;

    setCanvasState((prev) => ({
      ...prev,
      offsetX: prev.offsetX + deltaX,
      offsetY: prev.offsetY + deltaY,
    }));
    panStartRef.current = { x: event.clientX, y: event.clientY };
  };
  const handlePanEnd = () => {
    setCursorStyle("grab");
    panStartRef.current = null;
    document.removeEventListener("mousemove", handlePanMove);
    document.removeEventListener("mouseup", handlePanEnd);
  };
  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (tool !== "zoom" || !canvas) return;

    const rect = canvas?.getBoundingClientRect();
    const x =
      (event.clientX - rect.left - canvasState.offsetX) / canvasState.scale;
    const y =
      (event.clientY - rect.top - canvasState.offsetY) / canvasState.scale;
    const scaleDelta = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(
      0.1,
      Math.min(canvasState.scale * scaleDelta, 10)
    );
    if (newScale > canvasState.scale) {
      setCursorStyle("zoom-in");
    } else {
      setCursorStyle("zoom-out");
    }

    const newOffsetX = event.clientX - rect.left - x * newScale;
    const newOffsetY = event.clientY - rect.top - y * newScale;
    setCanvasState((prev) => ({
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    // Clear and redraw all saved shapes
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvasState.offsetX, canvasState.offsetY);
    ctx.scale(canvasState.scale, canvasState.scale);
    shapes?.forEach((shape) => drawShape(ctx, shape));
  }, [shapes, canvasState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "black";

    const handleMouseDown = (event: MouseEvent) => {
      if (tool === "pan") return;
      const { x, y } = getTransformedCoordinates(event, canvas);

      isDrawingRef.current = true;

      currentShapeRef.current = {
        id: shapeIdCounter.current++,
        type: tool,
        startX: x,
        startY: y,
        endX: x + 5,
        endY: y + 5,
        width: 0,
        height: 0,
        text: textAreaRef.current?.value || "",
      };
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDrawingRef.current || !currentShapeRef.current || tool === "pan")
        return;

      const { x, y } = getTransformedCoordinates(event, canvas);

      currentShapeRef.current.endX = x;
      currentShapeRef.current.endY = y;

      currentShapeRef.current.width = x - currentShapeRef.current.startX;
      currentShapeRef.current.height = y - currentShapeRef.current.startY;

      const curr = currentShapeRef.current;
      curr.text = textAreaRef.current?.value || "text";

      // setShapes((prev) => {
      //   const filteredShapes = prev.filter(
      //     (shape) => shape.id !== currentShapeRef.current?.id
      //   );

      //   if (currentShapeRef.current) {
      //     return [
      //       ...filteredShapes,
      //       {
      //         ...currentShapeRef.current,
      //         text: textAreaRef.current?.value || "text",
      //       },
      //     ];
      //   }

      //   return prev;
      // });
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      shapes.forEach((shape) => drawShape(ctx, shape));

      drawShape(ctx, curr);
    };

    const handleMouseUp = () => {
      if (tool === "pan") return;

      if (currentShapeRef.current && tool !== "eraser") {
        const newShape = { ...currentShapeRef.current };
        setShapes((prev) => [...prev, newShape]);
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

  const resetView = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.transform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setShapes([]);
  };
  useEffect(() => {
    const cursorStyle: CursorStyle = (() => {
      switch (tool) {
        case "eraser":
          return "default";
        case "arrow":
        case "line":
        case "circle":
        case "rect":
          return "crosshair";
        case "text":
          return "text";
        case "pan":
          return "grab";
        case "zoom":
          return "zoom-in";
        default:
          return "default";
      }
    })();
    setCursorStyle(cursorStyle);
  }, [tool]);

  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <nav className="absolute top-10 px-4 py-2 text-base transition-all text-black shadow-xs rounded-md shadow-black bg-primary-400  border-2 border-black hover:bg-primary-500 flex gap-3 ">
        <button
          className="bg-slate-300 rounded-md py-1 px-2"
          onClick={(e) => {
            e.preventDefault();
            setTool("text");
          }}
        >
          <p className="text-2xl">A</p>
        </button>
        <button
          className="bg-slate-300 rounded-md py-1 px-2"
          onClick={(e) => {
            e.preventDefault();
            setTool("circle");
          }}
        >
          <p className="text-2xl">
            <Circle />
          </p>
        </button>
        <button
          className="bg-slate-300 rounded-md py-1 px-2"
          onClick={(e) => {
            e.preventDefault();
            setTool("rect");
          }}
        >
          <p className="text-2xl">
            <RectangleHorizontal />
          </p>
        </button>
        <button
          className="bg-slate-300 rounded-md py-1 px-2"
          onClick={(e) => {
            e.preventDefault();
            setTool("line");
          }}
        >
          <p className="text-2xl">
            <PenLineIcon />
          </p>
        </button>
        <button
          className="bg-slate-300 rounded-md py-1 px-2"
          onClick={(e) => {
            e.preventDefault();
            setTool("arrow");
          }}
        >
          <p className="text-2xl">
            <ArrowDownLeft />
          </p>
        </button>
        <button
          className="bg-slate-300 rounded-md py-1 px-2"
          onClick={(e) => {
            e.preventDefault();
            setTool("eraser");
          }}
        >
          <p className="text-2xl">
            <EraserIcon />
          </p>
        </button>
        <button
          className="bg-slate-300 rounded-md py-1 px-2"
          onClick={(e) => {
            e.preventDefault();
            setTool("pan");
          }}
        >
          <p className="text-2xl">
            <Move />
          </p>
        </button>
        <button
          className="bg-slate-300 rounded-md py-1 px-2"
          onClick={(e) => {
            e.preventDefault();
            setTool("zoom");
          }}
        >
          <p className="text-2xl">
            <ZoomIn />
          </p>
        </button>
        <button
          className="bg-slate-300 rounded-md py-1 px-2"
          onClick={(e) => {
            e.preventDefault();
            resetView();
          }}
        >
          <p className="text-2xl">
            <RotateCw />
          </p>
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
            cursor: cursorStyle,
          }}
          onMouseDown={handlePan}
          onWheel={handleWheel}
        />
      </div>
    </div>
  );
};

export default Home;
