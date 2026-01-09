import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Circle, Text as SvgText, G } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');
const CHART_WIDTH = screenWidth - 48; // padding
const CHART_HEIGHT = 300;
const PADDING = 40;
const CHART_INNER_WIDTH = CHART_WIDTH - PADDING * 2;
const CHART_INNER_HEIGHT = CHART_HEIGHT - PADDING * 2;

export default function LineChart({ data, unit, referenceRange }) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>Nenhum dado disponível para gráfico</Text>
      </View>
    );
  }

  // Converter datas para timestamps e valores para números
  const processedData = data
    .map((point, index) => ({
      date: new Date(point.exam_date),
      value: parseFloat(point.numeric_value || point.value) || 0,
      originalValue: point.value,
      index,
    }))
    .filter(p => !isNaN(p.value) && !isNaN(p.date.getTime()))
    .sort((a, b) => a.date - b.date); // Ordenar por data

  if (processedData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>Dados inválidos para gráfico</Text>
      </View>
    );
  }

  // Calcular min e max dos valores
  const values = processedData.map(p => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1; // Evitar divisão por zero

  // Adicionar margem de 10% acima e abaixo
  const margin = valueRange * 0.1;
  const chartMinValue = minValue - margin;
  const chartMaxValue = maxValue + margin;
  const chartValueRange = chartMaxValue - chartMinValue || 1;

  // Calcular posições X e Y
  const points = processedData.map((point, index) => {
    const x = PADDING + (index / (processedData.length - 1 || 1)) * CHART_INNER_WIDTH;
    const normalizedValue = (point.value - chartMinValue) / chartValueRange;
    const y = PADDING + CHART_INNER_HEIGHT - (normalizedValue * CHART_INNER_HEIGHT);
    return { x, y, ...point };
  });

  // Criar string de pontos para Polyline
  const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');

  // Calcular posições das linhas de referência
  let refMinY = null;
  let refMaxY = null;
  if (referenceRange?.min && referenceRange?.max) {
    const refMin = parseFloat(referenceRange.min);
    const refMax = parseFloat(referenceRange.max);
    if (!isNaN(refMin) && !isNaN(refMax)) {
      const normalizedMin = (refMin - chartMinValue) / chartValueRange;
      const normalizedMax = (refMax - chartMinValue) / chartValueRange;
      refMinY = PADDING + CHART_INNER_HEIGHT - (normalizedMin * CHART_INNER_HEIGHT);
      refMaxY = PADDING + CHART_INNER_HEIGHT - (normalizedMax * CHART_INNER_HEIGHT);
    }
  }

  // Formatar data para exibição
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short' 
    });
  };

  // Formatar valor
  const formatValue = (value) => {
    if (value % 1 === 0) {
      return value.toString();
    }
    return value.toFixed(2);
  };

  return (
    <View style={styles.container}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {/* Grade de fundo - linhas horizontais */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = PADDING + CHART_INNER_HEIGHT - (ratio * CHART_INNER_HEIGHT);
          const value = chartMinValue + (ratio * chartValueRange);
          return (
            <G key={`grid-${index}`}>
              <Line
                x1={PADDING}
                y1={y}
                x2={PADDING + CHART_INNER_WIDTH}
                y2={y}
                stroke="#e0e0e0"
                strokeWidth="1"
                strokeDasharray="5,5"
              />
              <SvgText
                x={PADDING - 10}
                y={y + 5}
                fill="#666"
                fontSize="12"
                textAnchor="end"
              >
                {formatValue(value)}
              </SvgText>
            </G>
          );
        })}

        {/* Linhas de referência */}
        {refMinY !== null && refMaxY !== null && (
          <>
            <Line
              x1={PADDING}
              y1={refMinY}
              x2={PADDING + CHART_INNER_WIDTH}
              y2={refMinY}
              stroke="#FF9800"
              strokeWidth="2"
              strokeDasharray="3,3"
            />
            <Line
              x1={PADDING}
              y1={refMaxY}
              x2={PADDING + CHART_INNER_WIDTH}
              y2={refMaxY}
              stroke="#FF9800"
              strokeWidth="2"
              strokeDasharray="3,3"
            />
          </>
        )}

        {/* Linha do gráfico */}
        <Polyline
          points={pointsString}
          fill="none"
          stroke="#9B59B6"
          strokeWidth="3"
        />

        {/* Pontos */}
        {points.map((point, index) => (
          <Circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="6"
            fill="#9B59B6"
            stroke="#fff"
            strokeWidth="2"
          />
        ))}

        {/* Eixos */}
        <Line
          x1={PADDING}
          y1={PADDING}
          x2={PADDING}
          y2={PADDING + CHART_INNER_HEIGHT}
          stroke="#333"
          strokeWidth="2"
        />
        <Line
          x1={PADDING}
          y1={PADDING + CHART_INNER_HEIGHT}
          x2={PADDING + CHART_INNER_WIDTH}
          y2={PADDING + CHART_INNER_HEIGHT}
          stroke="#333"
          strokeWidth="2"
        />
      </Svg>

      {/* Legenda de datas */}
      <View style={styles.xAxisLabels}>
        {points.map((point, index) => {
          // Mostrar apenas algumas datas para não ficar muito cheio
          const showLabel = index === 0 || index === points.length - 1 || points.length <= 5 || index % Math.ceil(points.length / 5) === 0;
          if (!showLabel) return null;
          
          return (
            <Text key={index} style={styles.xAxisLabel}>
              {formatDate(point.date)}
            </Text>
          );
        })}
      </View>

      {/* Informações de referência */}
      {referenceRange?.min && referenceRange?.max && (
        <View style={styles.referenceInfo}>
          <View style={styles.referenceLine}>
            <View style={[styles.referenceColor, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.referenceText}>
              Faixa de referência: {referenceRange.min} - {referenceRange.max} {unit || ''}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 18,
    color: '#999',
    padding: 40,
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: PADDING,
  },
  xAxisLabel: {
    fontSize: 12,
    color: '#666',
    transform: [{ rotate: '-45deg' }],
    width: 60,
    textAlign: 'center',
  },
  referenceInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  referenceLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  referenceColor: {
    width: 20,
    height: 3,
    marginRight: 8,
  },
  referenceText: {
    fontSize: 14,
    color: '#666',
  },
});

