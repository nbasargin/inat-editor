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
}
