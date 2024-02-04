import { CanvasXY } from './canvas-coordinates';

export class CanvasDraw {
  static clearCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  static drawDashedLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
    ctx.strokeStyle = 'white';
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

  static drawDarkArea(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, corner1: CanvasXY, corner2: CanvasXY) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    const xMin = Math.round(Math.min(corner1.canvasX, corner2.canvasX));
    const xMax = Math.round(Math.max(corner1.canvasX, corner2.canvasX));
    const yMin = Math.round(Math.min(corner1.canvasY, corner2.canvasY));
    const yMax = Math.round(Math.max(corner1.canvasY, corner2.canvasY));
    // top
    ctx.fillRect(0, 0, canvas.width, yMin);
    // left
    ctx.fillRect(0, yMin, xMin, yMax - yMin);
    // right
    ctx.fillRect(xMax, yMin, canvas.width - xMax, yMax - yMin);
    // bottom
    ctx.fillRect(0, yMax, canvas.width, canvas.height - yMax);
  }
}
