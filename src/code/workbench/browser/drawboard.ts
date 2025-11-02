import { _theme } from "../common/theme.js";
import {
  IBoundingBox,
  IPoint,
  IShape,
  TDrawingTool,
  TResizeHandle,
  TShapeType,
} from "../workbench.types.js";
import { getThemeIcon } from "./media/icons.js";
import { CoreEl } from "./parts/core.js";

export class Drawboard extends CoreEl {
  private _canvas!: HTMLCanvasElement;
  private _toolbar!: HTMLDivElement;
  private _ctx!: CanvasRenderingContext2D;

  private _currentTool: TDrawingTool = "pen";

  private _isDrawing = false;
  private _isPanning = false;
  private _isDraggingShape = false;
  private _isResizingShape = false;

  private _startX = 0;
  private _startY = 0;

  private _panStartX = 0;
  private _panStartY = 0;

  private _offsetX = 0;
  private _offsetY = 0;

  private _currentPath: IPoint[] = [];
  private _shapes: IShape[] = [];
  private _selectedShape: IShape | null = null;
  private _previewShape: IShape | null = null;

  private _undoStack: IShape[][] = [];
  private _redoStack: IShape[][] = [];

  private _scale = 1;
  private _minScale = 0.5;
  private _maxScale = 3;
  private _scaleStep = 0.1;

  private _resizeHandle: TResizeHandle = null;
  private _resizeStartX = 0;
  private _resizeStartY = 0;
  private _originalBoundingBox: IBoundingBox | null = null;

  private _lineThickness = 2;
  private _thicknessSlider!: HTMLInputElement;
  private _thicknessValue!: HTMLSpanElement;

  constructor() {
    super();
    this._createEl();
    this._setupCanvasEvents();
    this._setupUndoRedoKeybindings();
    this._setupDeleteKeybinding();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "drawboard";
    this._el.tabIndex = 0;

    this._toolbar = document.createElement("div");
    this._toolbar.className = "toolbar";

    const mouseTool = document.createElement("span");
    mouseTool.className = "tool active";
    mouseTool.innerHTML = getThemeIcon("selection");
    mouseTool.title = "Select (V)";
    mouseTool.onclick = () => this._setTool("mouse", mouseTool);
    this._toolbar.appendChild(mouseTool);

    const penTool = document.createElement("span");
    penTool.className = "tool";
    penTool.innerHTML = getThemeIcon("edit");
    penTool.title = "Pen (P)";
    penTool.onclick = () => this._setTool("pen", penTool);
    this._toolbar.appendChild(penTool);

    const rectTool = document.createElement("span");
    rectTool.className = "tool";
    rectTool.innerHTML = getThemeIcon("rectangle");
    rectTool.title = "Rectangle (R)";
    rectTool.onclick = () => this._setTool("rectangle", rectTool);
    this._toolbar.appendChild(rectTool);

    const circleTool = document.createElement("span");
    circleTool.className = "tool";
    circleTool.innerHTML = getThemeIcon("circle");
    circleTool.title = "Circle (C)";
    circleTool.onclick = () => this._setTool("circle", circleTool);
    this._toolbar.appendChild(circleTool);

    const lineTool = document.createElement("span");
    lineTool.className = "tool";
    lineTool.innerHTML = "/";
    lineTool.title = "Line (L)";
    lineTool.onclick = () => this._setTool("line", lineTool);
    this._toolbar.appendChild(lineTool);

    const arrowTool = document.createElement("span");
    arrowTool.className = "tool";
    arrowTool.innerHTML = getThemeIcon("arrow");
    arrowTool.title = "Arrow (A)";
    arrowTool.onclick = () => this._setTool("arrow", arrowTool);
    this._toolbar.appendChild(arrowTool);

    const thicknessControl = document.createElement("div");
    thicknessControl.className = "thickness-control";

    this._thicknessValue = document.createElement("span");
    this._thicknessValue.className = "thickness-value";
    this._thicknessValue.textContent = "2";

    this._thicknessSlider = document.createElement("input");
    this._thicknessSlider.type = "range";
    this._thicknessSlider.min = "1";
    this._thicknessSlider.max = "100";
    this._thicknessSlider.value = "2";
    this._thicknessSlider.style.width = "200px";
    this._thicknessSlider.className = "thickness-slider";
    this._thicknessSlider.title = "Line Thickness";

    this._thicknessSlider.oninput = (e) => {
      const target = e.target as HTMLInputElement;
      this._lineThickness = parseInt(target.value);
      this._thicknessValue.textContent = target.value;
    };

    thicknessControl.appendChild(this._thicknessValue);
    thicknessControl.appendChild(this._thicknessSlider);
    this._toolbar.appendChild(thicknessControl);

    this._canvas = document.createElement("canvas");
    this._canvas.className = "board";
    this._canvas.style.cursor = "default";

    this._el.appendChild(this._canvas);
    this._el.appendChild(this._toolbar);

    this._ctx = this._canvas.getContext("2d")!;

    this._currentTool = "mouse";
  }

  private _setTool(tool: TDrawingTool, element: HTMLElement) {
    this._currentTool = tool;
    this._clearSelection();

    const tools = this._toolbar.querySelectorAll(".tool");
    tools.forEach((t) => t.classList.remove("active"));
    element.classList.add("active");
  }

  private _setupCanvasEvents() {
    this._canvas.onmousemove = (e) => {
      this._updateCursor(e);
      if (this._isPanning) {
        this._onPan(e);
      } else if (this._isDraggingShape) {
        this._onDragShape(e);
      } else if (this._isResizingShape) {
        this._onResizeShape(e);
      } else if (this._isDrawing) {
        this._onMouseMove(e);
      }
    };

    this._canvas.onmousedown = (e) => {
      if (e.button === 1) {
        e.preventDefault();
        this._startPanning(e);
      } else if (e.button === 0) {
        this._onLeftMouseDown(e);
      }
    };

    this._canvas.onmouseup = (e) => {
      if (e.button === 1 && this._isPanning) {
        this._stopPanning();
      } else {
        if (this._isDraggingShape) this._stopDraggingShape();
        if (this._isResizingShape) this._stopResizingShape();
        if (this._isDrawing) this._onMouseUp(e);
      }
    };

    this._canvas.onmouseleave = (e) => {
      if (this._isPanning) this._stopPanning();
      if (this._isDraggingShape) this._stopDraggingShape();
      if (this._isResizingShape) this._stopResizingShape();
      if (this._isDrawing) this._onMouseUp(e);
    };

    this._canvas.onwheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const zoomAmount = e.deltaY < 0 ? this._scaleStep : -this._scaleStep;
        this._scale += zoomAmount;
        this._scale = Math.min(
          Math.max(this._scale, this._minScale),
          this._maxScale
        );
        this._redrawCanvas();
      }
    };

    this._canvas.style.userSelect = "none";
  }

  private _setupUndoRedoKeybindings() {
    this._canvas.addEventListener("keydown", (e) => {
      if (!e.ctrlKey && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "v":
            e.preventDefault();
            this._setToolByKey("mouse");
            break;
          case "p":
            e.preventDefault();
            this._setToolByKey("pen");
            break;
          case "r":
            e.preventDefault();
            this._setToolByKey("rectangle");
            break;
          case "c":
            e.preventDefault();
            this._setToolByKey("circle");
            break;
          case "l":
            e.preventDefault();
            this._setToolByKey("line");
            break;
          case "a":
            e.preventDefault();
            this._setToolByKey("arrow");
            break;
        }
      }

      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      } else if (
        e.ctrlKey &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        this.redo();
      }
    });
  }

  private _setToolByKey(tool: TDrawingTool) {
    const tools = this._toolbar.querySelectorAll(".tool");
    const toolIndex = [
      "mouse",
      "pen",
      "rectangle",
      "circle",
      "line",
      "arrow",
    ].indexOf(tool);
    if (toolIndex >= 0 && tools[toolIndex]) {
      this._setTool(tool, tools[toolIndex] as HTMLElement);
    }
  }

  private _setupDeleteKeybinding() {
    this._el!.addEventListener("keydown", (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        this._deleteSelectedShape();
      }
    });
  }

  private _deleteSelectedShape() {
    if (!this._selectedShape) return;
    this._shapes = this._shapes.filter((s) => s !== this._selectedShape);
    this._selectedShape = null;
    this._pushUndoState();
    this._redrawCanvas();
  }

  private _startPanning(e: MouseEvent) {
    this._isPanning = true;
    this._panStartX = e.clientX;
    this._panStartY = e.clientY;
    this._canvas.style.cursor = "grabbing";
  }

  private _stopPanning() {
    this._isPanning = false;
    this._canvas.style.cursor = "default";
  }

  private _onPan(e: MouseEvent) {
    const deltaX = e.clientX - this._panStartX;
    const deltaY = e.clientY - this._panStartY;
    this._offsetX += deltaX;
    this._offsetY += deltaY;
    this._panStartX = e.clientX;
    this._panStartY = e.clientY;
    this._redrawCanvas();
  }

  private _updateCursor(e: MouseEvent) {
    if (
      this._isPanning ||
      this._isDraggingShape ||
      this._isResizingShape ||
      this._isDrawing
    ) {
      return;
    }

    const rect = this._canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - this._offsetX) / this._scale;
    const y = (e.clientY - rect.top - this._offsetY) / this._scale;

    if (this._currentTool === "mouse") {
      const hitHandle = this._getResizeHandleHit(x, y);
      if (hitHandle) {
        switch (hitHandle) {
          case "nw":
          case "se":
            this._canvas.style.cursor = "nwse-resize";
            break;
          case "ne":
          case "sw":
            this._canvas.style.cursor = "nesw-resize";
            break;
          default:
            this._canvas.style.cursor = "default";
        }
        return;
      }

      const hitShape = this._hitTest(x, y);
      this._canvas.style.cursor = hitShape ? "move" : "default";
    } else {
      this._canvas.style.cursor = "crosshair";
    }
  }

  private _onLeftMouseDown(e: MouseEvent) {
    const rect = this._canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - this._offsetX) / this._scale;
    const y = (e.clientY - rect.top - this._offsetY) / this._scale;

    if (this._currentTool === "mouse") {
      const hitHandle = this._getResizeHandleHit(x, y);
      if (hitHandle && this._selectedShape) {
        this._resizeHandle = hitHandle;
        this._isResizingShape = true;
        this._resizeStartX = x;
        this._resizeStartY = y;
        this._originalBoundingBox = { ...this._selectedShape.boundingBox };
        return;
      }

      const hitShape = this._hitTest(x, y);
      if (hitShape) {
        this._selectShape(hitShape);
        this._startX = x;
        this._startY = y;
        this._isDraggingShape = true;
        return;
      }

      this._clearSelection();
    } else {
      this._clearSelection();
      this._isDrawing = true;
      this._startX = x;
      this._startY = y;
      this._currentPath = [{ x, y }];
    }
  }

  private _onMouseMove(e: MouseEvent) {
    if (!this._isDrawing) return;

    const rect = this._canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - this._offsetX) / this._scale;
    const y = (e.clientY - rect.top - this._offsetY) / this._scale;

    if (this._currentTool === "pen") {
      this._currentPath.push({ x, y });
      this._redrawCanvas();

      this._ctx.save();
      this._ctx.translate(this._offsetX, this._offsetY);
      this._ctx.scale(this._scale, this._scale);
      this._ctx.strokeStyle = _theme.getColor(
        "workbench.drawboard.canvas.stroke.foreground"
      );
      this._ctx.lineWidth = this._lineThickness;
      this._ctx.lineCap = "round";
      this._ctx.lineJoin = "round";

      if (this._currentPath.length >= 2) {
        this._ctx.beginPath();
        this._ctx.moveTo(this._currentPath[0]!.x, this._currentPath[0]!.y);
        for (let i = 1; i < this._currentPath.length; i++) {
          this._ctx.lineTo(this._currentPath[i]!.x, this._currentPath[i]!.y);
        }
        this._ctx.stroke();
      }
      this._ctx.restore();
    } else {
      this._previewShape = this._createShape(
        this._currentTool as TShapeType,
        this._startX,
        this._startY,
        x,
        y
      );
      this._redrawCanvas();
    }
  }

  private _onMouseUp(e: MouseEvent) {
    if (!this._isDrawing) return;
    this._isDrawing = false;

    const rect = this._canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - this._offsetX) / this._scale;
    const y = (e.clientY - rect.top - this._offsetY) / this._scale;

    let shape: IShape | null = null;

    if (this._currentTool === "pen") {
      if (this._currentPath.length < 2) return;
      const boundingBox = this._calculateBoundingBox(this._currentPath);
      shape = {
        type: "freehand",
        path: this._currentPath,
        selected: false,
        boundingBox,
        thickness: this._lineThickness,
      };
    } else {
      shape = this._createShape(
        this._currentTool as TShapeType,
        this._startX,
        this._startY,
        x,
        y
      );
    }

    if (shape) {
      this._shapes.push(shape);
      this._pushUndoState();
    }

    this._previewShape = null;
    this._currentPath = [];
    this._redrawCanvas();
  }

  private _createShape(
    type: TShapeType,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): IShape {
    const shape: IShape = {
      type,
      path: [],
      selected: false,
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
      startPoint: { x: startX, y: startY },
      endPoint: { x: endX, y: endY },
      thickness: this._lineThickness,
    };

    switch (type) {
      case "rectangle":
        shape.path = [
          { x: startX, y: startY },
          { x: endX, y: startY },
          { x: endX, y: endY },
          { x: startX, y: endY },
          { x: startX, y: startY },
        ];
        break;

      case "circle":
        const centerX = (startX + endX) / 2;
        const centerY = (startY + endY) / 2;
        const radiusX = Math.abs(endX - startX) / 2;
        const radiusY = Math.abs(endY - startY) / 2;

        const points = 64;
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          shape.path.push({
            x: centerX + Math.cos(angle) * radiusX,
            y: centerY + Math.sin(angle) * radiusY,
          });
        }
        break;

      case "line":
        shape.path = [
          { x: startX, y: startY },
          { x: endX, y: endY },
        ];
        break;

      case "arrow":
        const dx = endX - startX;
        const dy = endY - startY;
        const angle = Math.atan2(dy, dx);
        const arrowLength = 15;
        const arrowAngle = Math.PI / 6;

        shape.path = [
          { x: startX, y: startY },
          { x: endX, y: endY },
          {
            x: endX - arrowLength * Math.cos(angle - arrowAngle),
            y: endY - arrowLength * Math.sin(angle - arrowAngle),
          },
          { x: endX, y: endY },
          {
            x: endX - arrowLength * Math.cos(angle + arrowAngle),
            y: endY - arrowLength * Math.sin(angle + arrowAngle),
          },
        ];
        break;
    }

    shape.boundingBox = this._calculateBoundingBox(shape.path);
    return shape;
  }

  private _hitTest(x: number, y: number): IShape | null {
    for (let i = this._shapes.length - 1; i >= 0; i--) {
      const shape = this._shapes[i];
      const bb = shape!.boundingBox;
      if (
        x >= bb.x &&
        x <= bb.x + bb.width &&
        y >= bb.y &&
        y <= bb.y + bb.height
      ) {
        return shape!;
      }
    }
    return null;
  }

  private _selectShape(shape: IShape) {
    if (this._selectedShape) this._selectedShape.selected = false;
    this._selectedShape = shape;
    shape.selected = true;
    this._redrawCanvas();
  }

  private _clearSelection() {
    if (this._selectedShape) {
      this._selectedShape.selected = false;
      this._selectedShape = null;
      this._redrawCanvas();
    }
  }

  private _moveShape(shape: IShape, dx: number, dy: number) {
    shape.path = shape.path.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    shape.boundingBox.x += dx;
    shape.boundingBox.y += dy;
    if (shape.startPoint) {
      shape.startPoint.x += dx;
      shape.startPoint.y += dy;
    }
    if (shape.endPoint) {
      shape.endPoint.x += dx;
      shape.endPoint.y += dy;
    }
  }

  private _onDragShape(e: MouseEvent) {
    if (!this._selectedShape) return;
    const rect = this._canvas.getBoundingClientRect();

    const x = (e.clientX - rect.left - this._offsetX) / this._scale;
    const y = (e.clientY - rect.top - this._offsetY) / this._scale;

    const dx = x - this._startX;
    const dy = y - this._startY;

    this._moveShape(this._selectedShape, dx, dy);

    this._startX = x;
    this._startY = y;

    this._redrawCanvas();
  }

  private _stopDraggingShape() {
    this._isDraggingShape = false;
    this._pushUndoState();
  }

  private _getResizeHandleHit(x: number, y: number): TResizeHandle {
    if (!this._selectedShape) return null;
    const bb = this._selectedShape.boundingBox;
    const handleSize = 10 / this._scale;

    const corners: { [key in TResizeHandle as any]: IPoint } = {
      nw: { x: bb.x, y: bb.y },
      ne: { x: bb.x + bb.width, y: bb.y },
      sw: { x: bb.x, y: bb.y + bb.height },
      se: { x: bb.x + bb.width, y: bb.y + bb.height },
    };

    for (const [handle, point] of Object.entries(corners)) {
      if (
        x >= point.x - handleSize &&
        x <= point.x + handleSize &&
        y >= point.y - handleSize &&
        y <= point.y + handleSize
      ) {
        return handle as TResizeHandle;
      }
    }
    return null;
  }

  private _onResizeShape(e: MouseEvent) {
    if (
      !this._selectedShape ||
      !this._resizeHandle ||
      !this._originalBoundingBox
    )
      return;
    const rect = this._canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - this._offsetX) / this._scale;
    const y = (e.clientY - rect.top - this._offsetY) / this._scale;

    const dx = x - this._resizeStartX;
    const dy = y - this._resizeStartY;

    let newBB = { ...this._selectedShape.boundingBox };

    switch (this._resizeHandle) {
      case "nw":
        newBB.x += dx;
        newBB.y += dy;
        newBB.width -= dx;
        newBB.height -= dy;
        break;
      case "ne":
        newBB.y += dy;
        newBB.width += dx;
        newBB.height -= dy;
        break;
      case "sw":
        newBB.x += dx;
        newBB.width -= dx;
        newBB.height += dy;
        break;
      case "se":
        newBB.width += dx;
        newBB.height += dy;
        break;
    }

    newBB.width = Math.max(newBB.width, 5);
    newBB.height = Math.max(newBB.height, 5);

    this._resizeShapePath(
      this._selectedShape,
      this._selectedShape.boundingBox,
      newBB
    );
    this._selectedShape.boundingBox = newBB;
    this._redrawCanvas();

    this._resizeStartX = x;
    this._resizeStartY = y;
  }

  private _stopResizingShape() {
    this._isResizingShape = false;
    this._resizeHandle = null;
    this._originalBoundingBox = null;
    this._pushUndoState();
  }

  private _resizeShapePath(
    shape: IShape,
    oldBB: IBoundingBox,
    newBB: IBoundingBox
  ) {
    const scaleX = newBB.width / oldBB.width;
    const scaleY = newBB.height / oldBB.height;
    shape.path = shape.path.map((p) => ({
      x: newBB.x + (p.x - oldBB.x) * scaleX,
      y: newBB.y + (p.y - oldBB.y) * scaleY,
    }));

    if (shape.startPoint) {
      shape.startPoint = {
        x: newBB.x + (shape.startPoint.x - oldBB.x) * scaleX,
        y: newBB.y + (shape.startPoint.y - oldBB.y) * scaleY,
      };
    }
    if (shape.endPoint) {
      shape.endPoint = {
        x: newBB.x + (shape.endPoint.x - oldBB.x) * scaleX,
        y: newBB.y + (shape.endPoint.y - oldBB.y) * scaleY,
      };
    }
  }

  private _calculateBoundingBox(path: IPoint[]): IBoundingBox {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    path.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  private _drawShape(shape: IShape) {
    const ctx = this._ctx;
    if (!shape.path.length) return;

    ctx.save();
    ctx.strokeStyle = _theme.getColor(
      "workbench.drawboard.canvas.stroke.foreground"
    );
    ctx.lineWidth = shape.thickness || 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(shape.path[0]!.x, shape.path[0]!.y);
    for (let i = 1; i < shape.path.length; i++) {
      ctx.lineTo(shape.path[i]!.x, shape.path[i]!.y);
    }
    ctx.stroke();

    ctx.restore();
  }

  private _drawSelectionBox(bb: IBoundingBox) {
    const ctx = this._ctx;
    const scale = this._scale;
    ctx.save();
    ctx.strokeStyle = _theme.getColor("workbench.border.foreground");
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(
      bb.x * scale + this._offsetX,
      bb.y * scale + this._offsetY,
      bb.width * scale,
      bb.height * scale
    );
    ctx.setLineDash([]);

    const handleSize = 8;
    const points = [
      { x: bb.x, y: bb.y, cursor: "nwse-resize" },
      { x: bb.x + bb.width, y: bb.y, cursor: "nesw-resize" },
      { x: bb.x, y: bb.y + bb.height, cursor: "nesw-resize" },
      { x: bb.x + bb.width, y: bb.y + bb.height, cursor: "nwse-resize" },
    ];

    points.forEach((pt) => {
      ctx.fillStyle = _theme.getColor("workbench.foreground");
      ctx.strokeStyle = _theme.getColor("workbench.border.foreground");
      ctx.lineWidth = 1;
      ctx.fillRect(
        pt.x * scale + this._offsetX - handleSize / 2,
        pt.y * scale + this._offsetY - handleSize / 2,
        handleSize,
        handleSize
      );
      ctx.strokeRect(
        pt.x * scale + this._offsetX - handleSize / 2,
        pt.y * scale + this._offsetY - handleSize / 2,
        handleSize,
        handleSize
      );
    });
    ctx.restore();
  }

  private _pushUndoState() {
    this._undoStack.push(
      this._shapes.map(
        (s) =>
          ({
            type: s.type,
            path: s.path.map((p) => ({ ...p })),
            selected: false,
            boundingBox: { ...s.boundingBox },
            startPoint: s.startPoint ? { ...s.startPoint } : undefined,
            endPoint: s.endPoint ? { ...s.endPoint } : undefined,
            thickness: s.thickness,
          }) as any
      )
    );
    this._redoStack = [];
  }

  undo() {
    if (!this._undoStack.length) return;
    const last = this._undoStack.pop()!;
    this._redoStack.push(this._shapes);
    this._shapes = last.map(
      (s) =>
        ({
          type: s.type,
          path: s.path.map((p) => ({ ...p })),
          selected: false,
          boundingBox: { ...s.boundingBox },
          startPoint: s.startPoint ? { ...s.startPoint } : undefined,
          endPoint: s.endPoint ? { ...s.endPoint } : undefined,
          thickness: s.thickness,
        }) as any
    );
    this._selectedShape = null;
    this._redrawCanvas();
  }

  redo() {
    if (!this._redoStack.length) return;
    const redoState = this._redoStack.pop()!;
    this._undoStack.push(this._shapes);
    this._shapes = redoState.map(
      (s) =>
        ({
          type: s.type,
          path: s.path.map((p) => ({ ...p })),
          selected: false,
          boundingBox: { ...s.boundingBox },
          startPoint: s.startPoint ? { ...s.startPoint } : undefined,
          endPoint: s.endPoint ? { ...s.endPoint } : undefined,
          thickness: s.thickness,
        }) as any
    );
    this._selectedShape = null;
    this._redrawCanvas();
  }

  private _drawGrid(spacing = 25) {
    const { width, height } = this._canvas;
    this._ctx.save();
    this._ctx.clearRect(0, 0, width, height);

    this._ctx.strokeStyle = _theme.getColor(
      "workbench.drawboard.canvas.grid.background"
    );
    this._ctx.lineWidth = 1;

    const scaledSpacing = spacing * this._scale;

    for (
      let x = this._offsetX % scaledSpacing;
      x <= width;
      x += scaledSpacing
    ) {
      this._ctx.beginPath();
      this._ctx.moveTo(x, 0);
      this._ctx.lineTo(x, height);
      this._ctx.stroke();
    }

    for (
      let y = this._offsetY % scaledSpacing;
      y <= height;
      y += scaledSpacing
    ) {
      this._ctx.beginPath();
      this._ctx.moveTo(0, y);
      this._ctx.lineTo(width, y);
      this._ctx.stroke();
    }

    this._ctx.restore();
  }

  private _redrawCanvas() {
    const { width, height } = this._canvas;
    this._ctx.clearRect(0, 0, width, height);

    this._drawGrid(90);

    this._ctx.save();
    this._ctx.translate(this._offsetX, this._offsetY);
    this._ctx.scale(this._scale, this._scale);

    for (const shape of this._shapes) {
      this._drawShape(shape);
    }

    if (this._previewShape) {
      this._ctx.save();
      this._ctx.globalAlpha = 0.5;
      this._drawShape(this._previewShape);
      this._ctx.restore();
    }

    this._ctx.restore();

    if (this._selectedShape && this._selectedShape.selected) {
      this._drawSelectionBox(this._selectedShape.boundingBox);
    }
  }

  _updateCanvasSize() {
    const rect = this._el!.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this._canvas.width = rect.width - 1;
    this._canvas.height = rect.height - 2;
    this._redrawCanvas();
    this._el!.tabIndex = 0;
  }
}
