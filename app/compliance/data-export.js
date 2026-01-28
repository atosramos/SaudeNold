/**
 * Data Export Screen - LGPD Compliance
 * 
 * Tela para exportar dados pessoais (Direito à Portabilidade).
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function DataExportScreen() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExports();
  }, []);

  const loadExports = async () => {
    try {
      const response = await api.get('/api/compliance/data-exports');
      setExports(response.data);
    } catch (error) {
      console.error('Error loading exports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (exportType = 'full', format = 'json') => {
    try {
      setExporting(true);
      
      const response = await api.post('/api/compliance/export-data', {
        export_type: exportType,
        format: format,
        include_audit_logs: true
      });

      Alert.alert(
        'Exportação Iniciada',
        'Sua exportação está sendo preparada. Você receberá uma notificação quando estiver pronta.',
        [{ text: 'OK' }]
      );

      // Recarregar lista
      await loadExports();
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Erro', 'Não foi possível exportar os dados');
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = async (exportId, filePath) => {
    try {
      const response = await api.get(`/api/compliance/download-export/${exportId}`, {
        responseType: 'blob'
      });

      // Salvar arquivo
      const filename = filePath.split('/').pop();
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      await FileSystem.writeAsStringAsync(fileUri, response.data, {
        encoding: FileSystem.EncodingType.Base64
      });

      // Compartilhar
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Sucesso', 'Arquivo salvo em: ' + fileUri);
      }
    } catch (error) {
      console.error('Error downloading export:', error);
      Alert.alert('Erro', 'Não foi possível baixar o arquivo');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exportar Dados</Text>
      <Text style={styles.subtitle}>
        Direito à Portabilidade (LGPD) - Exporte todos os seus dados em formato portável
      </Text>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Exportação</Text>
          
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => handleExport('full', 'json')}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.exportButtonText}>
                Exportar Tudo (JSON)
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => handleExport('full', 'zip')}
            disabled={exporting}
          >
            <Text style={styles.exportButtonText}>
              Exportar Tudo (ZIP)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportButton, styles.secondaryButton]}
            onPress={() => handleExport('access_report', 'json')}
            disabled={exporting}
          >
            <Text style={styles.secondaryButtonText}>
              Relatório de Acessos (12 meses)
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exportações Anteriores</Text>
          
          {loading ? (
            <ActivityIndicator size="small" color="#4ECDC4" />
          ) : exports.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma exportação anterior</Text>
          ) : (
            exports.map((exp) => (
              <View key={exp.id} style={styles.exportItem}>
                <Text style={styles.exportType}>
                  {exp.export_type === 'full' ? 'Exportação Completa' : 'Relatório de Acessos'}
                </Text>
                <Text style={styles.exportDate}>
                  {new Date(exp.created_at).toLocaleString('pt-BR')}
                </Text>
                <Text style={styles.exportFormat}>Formato: {exp.format.toUpperCase()}</Text>
                
                {exp.download_url && (
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => handleDownload(exp.id, exp.file_path)}
                  >
                    <Text style={styles.downloadButtonText}>Baixar</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20
  },
  content: {
    flex: 1
  },
  section: {
    marginBottom: 30
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333'
  },
  exportButton: {
    backgroundColor: '#4ECDC4',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  secondaryButton: {
    backgroundColor: '#95E1D3'
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 20,
    fontWeight: 'bold'
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
    marginTop: 20
  },
  exportItem: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  },
  exportType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  exportDate: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5
  },
  exportFormat: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10
  },
  downloadButton: {
    backgroundColor: '#4ECDC4',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center'
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  }
});
