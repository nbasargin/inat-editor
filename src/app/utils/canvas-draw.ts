import { CanvasXY } from './canvas-coordinates';

export class CanvasDraw {
  static clearCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  static drawDashedLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.setLineDash([]); // solid
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = 'black';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  static drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, fillStyle: string = 'red') {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  static drawDashedBox(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
    // lines from start to intermediate points
    CanvasDraw.drawDashedLine(ctx, x0, y0, x1, y0);
    CanvasDraw.drawDashedLine(ctx, x0, y0, x0, y1);
    // lines from end to intermediate points
    CanvasDraw.drawDashedLine(ctx, x1, y1, x0, y1);
    CanvasDraw.drawDashedLine(ctx, x1, y1, x1, y0);
  }

  static drawBoxOversizeCorners(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
    const halfWidth = 2;
    const xMin = Math.min(x0, x1) - halfWidth;
    const xMax = Math.max(x0, x1) + halfWidth;
    const yMin = Math.min(y0, y1) - halfWidth;
    const yMax = Math.max(y0, y1) + halfWidth;
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = halfWidth * 2 + 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    // top left corner
    ctx.moveTo(xMin, yMin + 20);
    ctx.lineTo(xMin, yMin);
    ctx.lineTo(xMin + 20, yMin);
    // top right corner
    ctx.moveTo(xMax - 20, yMin);
    ctx.lineTo(xMax, yMin);
    ctx.lineTo(xMax, yMin + 20);
    // bottom left corner
    ctx.moveTo(xMin, yMax - 20);
    ctx.lineTo(xMin, yMax);
    ctx.lineTo(xMin + 20, yMax);
    // bottom right corner
    ctx.moveTo(xMax - 20, yMax);
    ctx.lineTo(xMax, yMax);
    ctx.lineTo(xMax, yMax - 20);
    ctx.stroke();
  }

  static drawThirds(ctx: CanvasRenderingContext2D, corner1: CanvasXY, corner2: CanvasXY) {
    const xMin = Math.round(Math.min(corner1.canvasX, corner2.canvasX));
    const yMin = Math.round(Math.min(corner1.canvasY, corner2.canvasY));
    const width = Math.abs(corner1.canvasX - corner2.canvasX);
    const height = Math.abs(corner1.canvasY - corner2.canvasY);
    const x0 = Math.round(xMin + width / 3);
    const x1 = Math.round(xMin + (width * 2) / 3);
    const y0 = Math.round(yMin + height / 3);
    const y1 = Math.round(yMin + (height * 2) / 3);
    // draw
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]); // solid
    ctx.beginPath();
    // x0
    ctx.moveTo(x0, yMin);
    ctx.lineTo(x0, yMin + height);
    // x1
    ctx.moveTo(x1, yMin);
    ctx.lineTo(x1, yMin + height);
    // y0
    ctx.moveTo(xMin, y0);
    ctx.lineTo(xMin + width, y0);
    // y1
    ctx.moveTo(xMin, y1);
    ctx.lineTo(xMin + width, y1);
    ctx.stroke();
  }

  static drawDarkArea(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, corner1: CanvasXY, corner2: CanvasXY) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    const xMin = Math.round(Math.min(corner1.canvasX, corner2.canvasX));
    const xMax = Math.round(Math.max(corner1.canvasX, corner2.canvasX));
    const yMin = Math.round(Math.min(corner1.canvasY, corner2.canvasY));
    const yMax = Math.round(Math.max(corner1.canvasY, corner2.canvasY));
    ctx.fillRect(0, 0, canvas.width, yMin); // top
    ctx.fillRect(0, yMin, xMin, yMax - yMin); // left
    ctx.fillRect(xMax, yMin, canvas.width - xMax, yMax - yMin); // right
    ctx.fillRect(0, yMax, canvas.width, canvas.height - yMax); // bottom
  }
}
