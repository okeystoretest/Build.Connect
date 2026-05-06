import { sanitizeFileName } from '../../../utils/file.js';
import { formatEvaluationNumber, getMatrixDecisionColor } from './evaluation.calculations.js';

export function downloadEvaluationGraphFromPayload(exportPayload) {
  const canvas = document.createElement('canvas');
  const width = 1200;
  const height = 920;
  const plotLeft = 120;
  const plotTop = 210;
  const plotWidth = 860;
  const plotHeight = 600;
  const axisX = plotLeft + (plotWidth / 2);
  const axisY = plotTop + (plotHeight / 2);
  const context = canvas.getContext('2d');

  if (!context) {
    return;
  }

  canvas.width = width;
  canvas.height = height;

  context.fillStyle = '#071229';
  context.fillRect(0, 0, width, height);

  context.fillStyle = '#f7f9fc';
  context.font = '700 44px Arial';
  context.textAlign = 'left';
  context.fillText('Matriz de Decisão', 70, 74);

  context.fillStyle = '#b7c2d1';
  context.font = '500 23px Arial';
  context.fillText(`Respondente: ${exportPayload.respondentName || 'Não identificado'}`, 70, 124);
  context.fillText(`Avaliado: ${exportPayload.evaluateeName || 'Não identificado'}`, 70, 158);
  context.fillText(`Resultado: ${exportPayload.decisionLabel}`, 690, 124);
  context.fillText(`Técnico ${formatEvaluationNumber(exportPayload.technicalAverage)} · Emocional ${formatEvaluationNumber(exportPayload.emotionalAverage)}`, 690, 158);

  context.fillStyle = '#0d1a38';
  context.strokeStyle = '#223454';
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(plotLeft, plotTop, plotWidth, plotHeight, 26);
  context.fill();
  context.stroke();

  const zones = [
    { x: plotLeft, y: axisY, w: plotWidth / 2, h: plotHeight / 2, color: 'rgba(223, 91, 91, 0.12)' },
    { x: plotLeft, y: plotTop, w: plotWidth / 2, h: plotHeight / 2, color: 'rgba(95, 127, 191, 0.13)' },
    { x: axisX, y: axisY, w: plotWidth / 2, h: plotHeight / 2, color: 'rgba(85, 184, 122, 0.13)' },
    { x: axisX, y: plotTop, w: plotWidth / 2, h: plotHeight / 2, color: 'rgba(212, 162, 87, 0.14)' },
  ];

  zones.forEach((zone) => {
    context.fillStyle = zone.color;
    context.fillRect(zone.x, zone.y, zone.w, zone.h);
  });

  context.strokeStyle = 'rgba(255,255,255,0.08)';
  context.lineWidth = 1;
  context.fillStyle = '#8f9ab0';
  context.font = '600 17px Arial';
  for (let index = 0; index <= 10; index += 1) {
    const x = plotLeft + ((plotWidth / 10) * index);
    const y = plotTop + plotHeight - ((plotHeight / 10) * index);
    context.beginPath();
    context.moveTo(x, plotTop);
    context.lineTo(x, plotTop + plotHeight);
    context.stroke();
    context.beginPath();
    context.moveTo(plotLeft, y);
    context.lineTo(plotLeft + plotWidth, y);
    context.stroke();
    context.fillText(String(index), x - 5, plotTop + plotHeight + 28);
    context.fillText(String(index), plotLeft - 32, y + 5);
  }

  context.strokeStyle = '#d4a257';
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(axisX, plotTop);
  context.lineTo(axisX, plotTop + plotHeight);
  context.stroke();
  context.beginPath();
  context.moveTo(plotLeft, axisY);
  context.lineTo(plotLeft + plotWidth, axisY);
  context.stroke();

  context.strokeStyle = '#d4a257';
  context.lineWidth = 2;
  const stepX = plotWidth / 10;
  const stepY = plotHeight / 10;
  context.beginPath();
  context.moveTo(plotLeft + (stepX * 7), plotTop + (stepY * 3));
  context.lineTo(plotLeft + (stepX * 7), plotTop + (stepY * 2));
  context.lineTo(plotLeft + (stepX * 8), plotTop + (stepY * 2));
  context.lineTo(plotLeft + (stepX * 8), plotTop + stepY);
  context.lineTo(plotLeft + (stepX * 9), plotTop + stepY);
  context.lineTo(plotLeft + (stepX * 9), plotTop);
  context.stroke();

  context.fillStyle = '#dbe2ee';
  context.font = '700 23px Arial';
  context.fillText('Treinamento técnico', plotLeft + 90, plotTop + 165);
  context.fillText('Demissão', plotLeft + 115, plotTop + 438);
  context.fillText('Treinamento emocional', axisX + 90, plotTop + 438);
  context.fillText('Reconhecer', axisX + 125, plotTop + 165);
  context.fillText('Investir', axisX + 235, plotTop + 102);
  context.fillText('Promover', axisX + 318, plotTop + 52);

  const pointColor = getMatrixDecisionColor(exportPayload.decisionId);
  const pointX = plotLeft + ((plotWidth / 10) * Math.max(0, Math.min(10, exportPayload.technicalAverage)));
  const pointY = plotTop + plotHeight - ((plotHeight / 10) * Math.max(0, Math.min(10, exportPayload.emotionalAverage)));

  context.strokeStyle = pointColor;
  context.lineWidth = 4;
  context.beginPath();
  context.arc(pointX, pointY, 17, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = pointColor;
  context.beginPath();
  context.arc(pointX, pointY, 8, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#f7f9fc';
  context.font = '700 22px Arial';
  context.textAlign = 'center';
  context.fillText('Competências técnicas', plotLeft + (plotWidth / 2), height - 46);

  context.save();
  context.translate(44, plotTop + (plotHeight / 2));
  context.rotate(-Math.PI / 2);
  context.textAlign = 'center';
  context.fillText('Competências emocionais', 0, 0);
  context.restore();

  canvas.toBlob((blob) => {
    if (!blob) {
      return;
    }

    const downloadLink = document.createElement('a');
    const safeRespondent = sanitizeFileName(exportPayload.respondentName || 'respondente');
    const safeEvaluatee = sanitizeFileName(exportPayload.evaluateeName || 'avaliado');
    const objectUrl = URL.createObjectURL(blob);
    downloadLink.href = objectUrl;
    downloadLink.download = `matriz-decisao-${safeEvaluatee}-${safeRespondent}.png`;
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }, 'image/png');
}
