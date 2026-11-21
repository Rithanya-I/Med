import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let firebaseConfig: any = {
  projectId: 'famous-parsec-gr8gb',
};

try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch {
  // Use fallback configuration
}

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId || 'famous-parsec-gr8gb',
  });
}

export const adminAuth = getAuth();
