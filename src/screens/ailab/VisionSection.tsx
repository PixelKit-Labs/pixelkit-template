/**
 * @file VisionSection.tsx
 * @description ML Kit vision on the device, plus cloud scene analysis.
 *
 * Each detector takes the same input — a file URI or a base64 image — and reports its own latency,
 * so the on-device and cloud paths can be compared honestly.
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useHaptics } from '@pixelkit-labs/sdk';
import { Colors } from '../../theme/colors';
import { HapticButton } from '../../components/HapticButton';
import { MetricCard } from '../../components/MetricCard';
import { SectionHeader, StatChip } from '../../components/Decor';
import { useVisionAI } from '@pixelkit-labs/sdk/mlkit';
import { styles } from './styles';

type VisionDemoKind = 'ocr' | 'barcode' | 'label' | 'faces' | 'objects' | 'pose' | 'subject' | 'cloud';

export const VisionSection: React.FC<{
  vision: ReturnType<typeof useVisionAI>;
  haptics: ReturnType<typeof useHaptics>;
  signalThinking: () => void;
}> = ({ vision, haptics, signalThinking }) => {
  const [visionKind, setVisionKind] = useState<VisionDemoKind>('ocr');

  const runVisionAction = async (useCamera: boolean) => {
    signalThinking();
    if (visionKind === 'cloud') {
      await vision.captureAndAnalyze(useCamera);
      return;
    }
    const picked = await vision.pickImage(useCamera);
    if (!picked) return;
    const input = picked.base64 ?? picked.uri;

    if (visionKind === 'ocr') {
      await vision.recognizeText(input);
    } else if (visionKind === 'barcode') {
      await vision.scanBarcodes(input);
    } else if (visionKind === 'label') {
      await vision.labelImage(input);
    } else if (visionKind === 'faces') {
      await vision.detectFaces(input);
      await vision.detectFaceMesh(input);
    } else if (visionKind === 'objects') {
      await vision.detectObjects(input);
    } else if (visionKind === 'pose') {
      await vision.detectPose(input);
    } else if (visionKind === 'subject') {
      await vision.segmentSubject(input);
    }
    haptics.playPrimitives([{ primitive: 'CLICK', scale: 1.0 }]);
  };

  return (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <MetricCard
            title="Google ML Kit Vision & OCR"
            value="Tensor Vision Subsystem"
            badge="ON-DEVICE HARDWARE"
            badgeColor={Colors.dark.success}
            subtitle="Text Recognition v2, Barcode Scanning, Image Labeling, Face Mesh & Gemini Multimodal"
            source="hardware"
          />
  
          {/* Vision Demo Selector */}
          <View style={styles.taskSelector}>
            {(['ocr', 'barcode', 'label', 'faces', 'objects', 'pose', 'subject', 'cloud'] as VisionDemoKind[]).map(kind => (
              <TouchableOpacity
                key={kind}
                style={[styles.taskPill, visionKind === kind && styles.taskPillActive]}
                onPress={() => {
                  haptics.playPrimitives([{ primitive: 'CLICK', scale: 0.6 }]);
                  setVisionKind(kind);
                }}
              >
                <Text style={[styles.taskPillText, visionKind === kind && styles.taskPillTextActive]}>
                  {kind.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
  
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <HapticButton
                title="Camera"
                onPress={() => runVisionAction(true)}
                disabled={vision.isAnalyzing || vision.isOnDeviceProcessing}
                variant="primary"
                style={{ flex: 1 }}
              />
              <HapticButton
                title="Photo Gallery"
                onPress={() => runVisionAction(false)}
                disabled={vision.isAnalyzing || vision.isOnDeviceProcessing}
                variant="secondary"
                style={{ flex: 1 }}
              />
            </View>
  
            {(vision.isAnalyzing || vision.isOnDeviceProcessing) && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={Colors.dark.primary} />
                <Text style={styles.loadingText}>Processing visual scene on Tensor G6…</Text>
              </View>
            )}
  
            {vision.selectedImageUri && (
              <Image source={{ uri: vision.selectedImageUri }} style={styles.previewImage} />
            )}
  
            {/* OCR Result */}
            {visionKind === 'ocr' && vision.ocrResult && (
              <View style={styles.analysisBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.analysisTitle}>Recognized Text (OCR v2)</Text>
                  <StatChip label="Latency" value={`${vision.ocrResult.latencyMs} ms`} tone="accent" />
                </View>
                <Text style={styles.analysisText}>{vision.ocrResult.text || '(No text detected in scene)'}</Text>
                <Text style={styles.outputMetaText}>Detected {vision.ocrResult.blocks.length} text blocks</Text>
              </View>
            )}
  
            {/* Barcode Result */}
            {visionKind === 'barcode' && vision.barcodeResult && (
              <View style={styles.analysisBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.analysisTitle}>Barcode & QR Results</Text>
                  <StatChip label="Latency" value={`${vision.barcodeResult.latencyMs} ms`} tone="accent" />
                </View>
                {vision.barcodeResult.barcodes.length === 0 ? (
                  <Text style={styles.analysisText}>(No barcodes detected)</Text>
                ) : (
                  vision.barcodeResult.barcodes.map((b, idx) => (
                    <View key={idx} style={{ marginTop: 6 }}>
                      <Text style={[styles.analysisText, { fontWeight: '700' }]}>{b.displayValue ?? b.rawValue}</Text>
                      <Text style={styles.outputMetaText}>Format: {b.format} • Type: {b.valueType}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
  
            {/* Label Result */}
            {visionKind === 'label' && vision.labelsResult && (
              <View style={styles.analysisBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.analysisTitle}>On-Device Image Labels</Text>
                  <StatChip label="Latency" value={`${vision.labelsResult.latencyMs} ms`} tone="accent" />
                </View>
                <View style={styles.labelsRow}>
                  {vision.labelsResult.labels.map((lbl, idx) => (
                    <View key={idx} style={styles.labelChip}>
                      <Text style={styles.labelChipText}>
                        {lbl.text} ({Math.round(lbl.confidence * 100)}%)
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
  
            {/* Face Result */}
            {visionKind === 'faces' && (vision.facesResult || vision.faceMeshResult) && (
              <View style={styles.analysisBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.analysisTitle}>Face & 3D Mesh Detection</Text>
                  <StatChip
                    label="Latency"
                    value={`${(vision.facesResult?.latencyMs ?? 0) + (vision.faceMeshResult?.latencyMs ?? 0)} ms`}
                    tone="accent"
                  />
                </View>
                <Text style={styles.analysisText}>
                  Detected {vision.facesResult?.faces.length ?? 0} face(s) and {vision.faceMeshResult?.meshes.length ?? 0} 3D face mesh(es).
                </Text>
                {vision.facesResult?.faces.map((f, idx) => (
                  <Text key={idx} style={styles.outputMetaText}>
                    Face #{idx + 1}: Smile: {f.smilingProbability != null ? `${Math.round(f.smilingProbability * 100)}%` : '—'} • Left Eye: {f.leftEyeOpenProbability != null ? `${Math.round(f.leftEyeOpenProbability * 100)}%` : '—'}
                  </Text>
                ))}
              </View>
            )}
  
            {/* Cloud Gemini Multimodal Analysis */}
            {visionKind === 'objects' && vision.objectsResult && (
              <MetricCard
                title="Objects"
                value={vision.objectsResult.objects.length}
                unit={vision.objectsResult.objects.length === 1 ? 'object' : 'objects'}
                badge={`${vision.objectsResult.latencyMs} ms`}
                badgeColor={Colors.dark.success}
                subtitle={
                  vision.objectsResult.objects
                    .map(o => `${o.labels[0]?.text ?? 'unlabelled'}${o.trackingId != null ? ` #${o.trackingId}` : ''}`)
                    .join(' · ') || 'nothing detected in this frame'
                }
                source={vision.objectsResult.source}
              />
            )}
  
            {visionKind === 'pose' && vision.poseResult && (
              <MetricCard
                title="Pose landmarks"
                value={vision.poseResult.landmarks.length}
                unit="of 33"
                badge={`${vision.poseResult.latencyMs} ms`}
                badgeColor={Colors.dark.success}
                subtitle={
                  vision.poseResult.landmarks.length
                    ? `mean in-frame likelihood ${(vision.poseResult.landmarks.reduce((a, l) => a + l.inFrameLikelihood, 0) / vision.poseResult.landmarks.length).toFixed(2)}`
                    : 'no person detected in this frame'
                }
                source={vision.poseResult.source}
              />
            )}
  
            {visionKind === 'subject' && vision.subjectResult && (
              <MetricCard
                title="Subject segmentation"
                value={vision.subjectResult.subjectsCount}
                unit={vision.subjectResult.subjectsCount === 1 ? 'subject' : 'subjects'}
                badge={`${vision.subjectResult.latencyMs} ms`}
                badgeColor={vision.subjectResult.foregroundConfidence ? Colors.dark.success : Colors.dark.warning}
                subtitle={vision.subjectResult.foregroundConfidence ? 'foreground separated from the background' : 'no confident foreground in this frame'}
                source={vision.subjectResult.source}
              />
            )}
  
            {visionKind === 'cloud' && vision.analysis && (
              <View style={styles.analysisBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.analysisTitle}>Gemini Cloud Scene Analysis</Text>
                  <StatChip label="Latency" value={`${vision.analysis.latencyMs} ms`} tone="accent" />
                </View>
                <Text style={styles.analysisText}>{vision.analysis.description}</Text>
                <View style={styles.labelsRow}>
                  {vision.analysis.labels.map((lbl, idx) => (
                    <View key={idx} style={styles.labelChip}>
                      <Text style={styles.labelChipText}>{lbl}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
  
            {vision.error && <Text style={styles.errorText}>{vision.error}</Text>}
          </View>
        </ScrollView>
  );
};
