import { AnalysisResult } from './types';

let _analysis: AnalysisResult | null = null;
let _imageUri: string | null = null;

export function setAnalysis(analysis: AnalysisResult, imageUri: string) {
  _analysis = analysis;
  _imageUri = imageUri;
}

export function getAnalysis(): { analysis: AnalysisResult | null; imageUri: string | null } {
  return { analysis: _analysis, imageUri: _imageUri };
}

export function clearAnalysis() {
  _analysis = null;
  _imageUri = null;
}
