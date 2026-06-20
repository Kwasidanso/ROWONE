import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Sparkles, TrendingUp, DollarSign, Users, Calendar } from 'lucide-react';

export interface MonthlyEarningsData {
  month: string;
  revenue: number;
  viewers: number;
}

const DEFAULT_TREND_DATA: MonthlyEarningsData[] = [
  { month: 'Jan', revenue: 14200, viewers: 15400 },
  { month: 'Feb', revenue: 18500, viewers: 19800 },
  { month: 'Mar', revenue: 24800, viewers: 23200 },
  { month: 'Apr', revenue: 31000, viewers: 31500 },
  { month: 'May', revenue: 42600, viewers: 39100 },
  { month: 'Jun', revenue: 58300, viewers: 48500 },
  { month: 'Jul', revenue: 74200, viewers: 62000 },
];

interface RevenueTrendChartProps {
  data?: MonthlyEarningsData[];
  title?: string;
  subtitle?: string;
}

export default function RevenueTrendChart({
  data = DEFAULT_TREND_DATA,
  title = "Studio Performance Forecast",
  subtitle = "Projected monthly earnings and viewership for Louver-verified distributor accounts"
}: RevenueTrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [metric, setMetric] = useState<'revenue' | 'viewers'>('revenue');
  const [hoveredData, setHoveredData] = useState<MonthlyEarningsData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 600, height: 280 });

  // Update dimensions responsive behavior
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      // Guarantee high limits and elegant dynamic margins
      setDimensions({
        width: Math.max(320, width),
        height: 280
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    // Clear previous drawing
    const svgElement = d3.select(svgRef.current);
    svgElement.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 30, right: 35, bottom: 40, left: 55 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Setup scales
    const xScale = d3.scalePoint()
      .domain(data.map(d => d.month))
      .range([0, chartWidth]);

    const maxValue = d3.max(data, d => metric === 'revenue' ? d.revenue : d.viewers) || 100;
    const yScale = d3.scaleLinear()
      .domain([0, maxValue * 1.15]) // add some padding to the top range
      .range([chartHeight, 0]);

    // Create Main Chart Group
    const g = svgElement.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Define Gradients for Line Area glow
    const defs = svgElement.append('defs');

    // Area Fill Gradient
    const areaGradient = defs.append('linearGradient')
      .attr('id', 'area-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');

    if (metric === 'revenue') {
      areaGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#DDA75F')
        .attr('stop-opacity', 0.28);
      areaGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#DDA75F')
        .attr('stop-opacity', 0.00);
    } else {
      areaGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#8C1C13')
        .attr('stop-opacity', 0.35);
      areaGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#8C1C13')
        .attr('stop-opacity', 0.00);
    }

    // Gridlines Generator (Horizontal)
    const yGrid = d3.axisLeft(yScale)
      .tickSize(-chartWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid-lines')
      .style('stroke', 'rgba(255, 255, 255, 0.05)')
      .style('stroke-dasharray', '3,3')
      .call(yGrid)
      .select('.domain').remove();

    // Custom Axes formatting
    const xAxis = d3.axisBottom(xScale).tickSize(8);
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => {
        const val = +d;
        if (metric === 'revenue') {
          return `$${val >= 1000 ? (val / 1000) + 'k' : val}`;
        } else {
          return `${val >= 1000 ? (val / 1000) + 'k' : val}`;
        }
      });

    // Add Axis X
    const xAxisG = g.append('g')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(xAxis);

    xAxisG.selectAll('text')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '10px')
      .attr('fill', 'rgba(237, 230, 227, 0.6)')
      .attr('dy', '1em');

    xAxisG.selectAll('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.15)');

    xAxisG.select('.domain')
      .attr('stroke', 'rgba(255, 255, 255, 0.15)');

    // Add Axis Y
    const yAxisG = g.append('g')
      .call(yAxis);

    yAxisG.selectAll('text')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '10px')
      .attr('fill', 'rgba(237, 230, 227, 0.6)')
      .attr('dx', '-0.5em');

    yAxisG.selectAll('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.15)');

    yAxisG.select('.domain').remove(); // remove left axis border

    // Line generator
    const lineGenerator = d3.line<MonthlyEarningsData>()
      .x(d => xScale(d.month) || 0)
      .y(d => yScale(metric === 'revenue' ? d.revenue : d.viewers))
      .curve(d3.curveMonotoneX);

    // Area generator (under the line)
    const areaGenerator = d3.area<MonthlyEarningsData>()
      .x(d => xScale(d.month) || 0)
      .y0(chartHeight)
      .y1(d => yScale(metric === 'revenue' ? d.revenue : d.viewers))
      .curve(d3.curveMonotoneX);

    // Append Area under curve
    g.append('path')
      .datum(data)
      .attr('fill', 'url(#area-gradient)')
      .attr('d', areaGenerator);

    // Append beautiful line curve
    const path = g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', metric === 'revenue' ? '#DDA75F' : '#e11d48')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .attr('d', lineGenerator);

    // Add animation to the line drawing!
    const totalLength = path.node()?.getTotalLength() || 0;
    path
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(950)
      .attr('stroke-dashoffset', 0);

    // Add glowing shadow filter beneath line
    g.selectAll('.glow-point')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.month) || 0)
      .attr('cy', d => yScale(metric === 'revenue' ? d.revenue : d.viewers))
      .attr('r', 5)
      .attr('fill', metric === 'revenue' ? '#DDA75F' : '#e11d48')
      .attr('stroke', '#0c0a09')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Overlay vertical interactive guide lines for hover interaction
    const hoverLine = g.append('line')
      .attr('y1', 0)
      .attr('y2', chartHeight)
      .attr('stroke', 'rgba(221, 167, 95, 0.25)')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4')
      .style('display', 'none');

    // Create an invisible overlay rectangle for tracking mouse movements smoothly
    svgElement.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('pointermove', (event) => {
        const [mouseX] = d3.pointer(event);
        const innerX = mouseX - margin.left;

        if (innerX >= 0 && innerX <= chartWidth) {
          // Find closest month point based on coordinate values
          const domain = data.map(d => d.month);
          const range = domain.map(m => xScale(m) || 0);
          
          let closestIndex = 0;
          let minDiff = Infinity;
          range.forEach((r, idx) => {
            const diff = Math.abs(r - innerX);
            if (diff < minDiff) {
              minDiff = diff;
              closestIndex = idx;
            }
          });

          const currentPoint = data[closestIndex];
          const pointX = xScale(currentPoint.month) || 0;
          const pointY = yScale(metric === 'revenue' ? currentPoint.revenue : currentPoint.viewers);

          hoverLine
            .attr('x1', pointX)
            .attr('x2', pointX)
            .style('display', 'block');

          setHoveredData(currentPoint);
          setTooltipPos({
            x: pointX + margin.left,
            y: pointY + margin.top - 15
          });
        }
      })
      .on('pointerleave', () => {
        hoverLine.style('display', 'none');
        setHoveredData(null);
      });

  }, [data, metric, dimensions]);

  const percentageIncrease = 422.5;

  return (
    <div className="bg-gradient-to-br from-[#1a1005] to-[#040201] border border-[#DDA75F]/20 rounded-3xl p-6 shadow-[0_0_40px_rgba(221,167,95,0.05)] w-full select-none relative overflow-hidden" id="d3-revenue-trend-chart">
      {/* Background radial soft light */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#DDA75F]/3 blur-[100px] rounded-full pointer-events-none" />

      {/* Header element */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 pb-4 border-b border-[#DDA75F]/10">
        <div className="space-y-1.5 text-left">
          <div className="inline-flex items-center gap-1 bg-[#DDA75F]/10 border border-[#DDA75F]/25 px-2.5 py-1 rounded-md text-[#DDA75F] font-mono text-[9px] font-black uppercase tracking-widest">
            <Sparkles className="h-3 w-3 text-[#DDA75F]" />
            <span>Interactive Trend Index</span>
          </div>
          <h4 className="font-serif text-lg font-bold text-white tracking-tight leading-snug">{title}</h4>
          <p className="font-sans text-[11px] text-[#EDE6E3]/65 max-w-sm leading-relaxed">{subtitle}</p>
        </div>

        {/* Toggle Controls */}
        <div className="flex bg-black/55 border border-[#DDA75F]/25 p-1 rounded-xl self-start sm:self-auto shrink-0 shadow-inner">
          <button
            type="button"
            onClick={() => setMetric('revenue')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[9px] font-mono font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              metric === 'revenue'
                ? 'bg-[#DDA75F] text-[#0a0502] shadow'
                : 'text-[#EDE6E3]/60 hover:text-white'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>Revenue</span>
          </button>
          <button
            type="button"
            onClick={() => setMetric('viewers')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[9px] font-mono font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              metric === 'viewers'
                ? 'bg-[#8C1C13] text-[#EDE6E3] shadow'
                : 'text-[#EDE6E3]/60 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Viewers</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-left">
        <div className="bg-black/35 border border-white/5 p-3 rounded-xl">
          <span className="text-[8px] font-sans font-extrabold tracking-widest text-[#EDE6E3]/40 uppercase block">Projected Peak</span>
          <span className="font-mono text-sm font-semibold text-[#DDA75F] mt-0.5 block">
            {metric === 'revenue' ? '$74,200.00' : '62.00k users'}
          </span>
        </div>
        <div className="bg-black/35 border border-white/5 p-3 rounded-xl">
          <span className="text-[8px] font-sans font-extrabold tracking-widest text-[#EDE6E3]/40 uppercase block">Scale Multiplier</span>
          <span className="font-mono text-sm font-semibold text-emerald-400 mt-0.5 block flex items-center gap-0.5">
            <TrendingUp className="h-3 w-3 text-emerald-400 shrink-0" />
            <span>5.2x</span>
          </span>
        </div>
        <div className="bg-black/35 border border-white/5 p-3 rounded-xl">
          <span className="text-[8px] font-sans font-extrabold tracking-widest text-[#EDE6E3]/40 uppercase block">Market Trend</span>
          <span className="font-mono text-sm font-semibold text-white mt-0.5 block">Exponential</span>
        </div>
      </div>

      {/* SVGA Container */}
      <div ref={containerRef} className="w-full relative h-[280px]">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="overflow-visible block mx-auto"
        />

        {/* Hover tooltips */}
        {hoveredData && (
          <div
            className="absolute bg-[#181112]/95 border border-[#DDA75F]/40 p-2.5 rounded-xl shadow-2xl pointer-events-none transition-all duration-150 flex flex-col gap-0.5 text-left font-sans z-50 transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y - 10}px`,
            }}
          >
            <span className="text-[8.5px] font-sans font-black text-[#DDA75F] tracking-widest uppercase flex items-center gap-1">
              <Calendar className="h-3 w-3 text-[#DDA75F]" />
              {hoveredData.month} Analytics
            </span>
            <div className="mt-1 space-y-0.5 font-mono">
              <div className="flex gap-4 justify-between text-[10px]">
                <span className="text-zinc-400">Net Revenue:</span>
                <span className="font-bold text-white">${hoveredData.revenue.toLocaleString()}</span>
              </div>
              <div className="flex gap-4 justify-between text-[10px]">
                <span className="text-zinc-400">Total Viewers:</span>
                <span className="font-bold text-white">{hoveredData.viewers.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Swiss footer trend explanation card */}
      <div className="mt-3 text-left">
        <p className="text-[10px] text-[#EDE6E3]/75 font-serif italic max-w-lg leading-relaxed mx-auto text-center border-t border-white/5 pt-3">
          "Verified distributor status unlocks automated syndication algorithms, generating a verified average {percentageIncrease}% increase in monthly virtual theater receipts."
        </p>
      </div>
    </div>
  );
}
