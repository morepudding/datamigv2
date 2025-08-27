# 🧪 Système de Test - Migration PLM vers IFS

Ce document décrit le système de test complet pour valider le fonctionnement de l'application de migration de données PLM vers IFS.

## 📋 Vue d'ensemble

Le système de test utilise **Jest** avec **TypeScript** pour tester tous les aspects de l'application :

- ✅ **Tests unitaires** pour chaque processeur
- ✅ **Tests d'intégration** pour le pipeline complet  
- ✅ **Validation des données** d'entrée et de sortie
- ✅ **Tests de performance** et de qualité
- ✅ **Rapports détaillés** avec métriques

## 📁 Structure des Tests

```
tests/
├── helpers/
│   └── test-helpers.ts         # Utilitaires de test
├── processors/
│   ├── master-part.test.ts     # Test Master Part
│   └── master-part-all.test.ts # Test Master Part All
├── integration/
│   └── full-system.test.ts     # Test du pipeline complet
├── utils/
│   └── data-validation.test.ts # Validation des données
├── setup.ts                    # Configuration Jest
├── env.setup.js               # Variables d'environnement
└── run-tests.ts               # Script principal
```

## 🚀 Commandes de Test

### Tests Rapides
```bash
# Validation des données d'entrée
npm run test:validate

# Tests d'un processeur spécifique
npm run test:processors

# Tests des utilitaires
npm run test:utils
```

### Tests Complets
```bash
# Test d'intégration complet
npm run test:integration

# Tous les tests avec couverture
npm run test:coverage

# Script de test principal (recommandé)
npm run test:all
```

### Tests en Mode Watch
```bash
# Surveillance des changements
npm run test:watch
```

## 📊 Données de Test

Le système utilise le fichier réel de test :
**`JY5MB_complete_boat_20250428_0927CEST(in).csv`**

### Caractéristiques du fichier :
- **9,834 lignes** de données réelles
- **47 colonnes** incluant tous les attributs PLM
- **Données variées** : Make/Buy, différents états, révisions
- **Cas complexes** : doublons, valeurs manquantes, classifications variées

## 🔍 Types de Tests

### 1. Tests Unitaires (Processeurs)

Chaque processeur est testé individuellement :

```typescript
// Exemple : Master Part Processor
✅ Chargement des données
✅ Filtrage par Source (exclusion Buy)  
✅ Filtrage par Classification (AN29)
✅ Gestion des pièces fantômes
✅ Traitement des révisions
✅ Déduplication
✅ Génération CSV
✅ Validation de la sortie
```

### 2. Test d'Intégration

Pipeline complet avec ordre de dépendances :

```typescript
1. Master Part           → master_part.csv
2. Master Part All       → master_part_all.csv  
3. Technical Specs       → technical_specs_values.csv (utilise master_part)
4. Eng Structure         → eng_part_structure.csv (utilise master_part_all)
5. Inventory Part        → inventory_part.csv
6. Inventory Part Plan   → inventory_part_plan.csv
```

### 3. Validation des Données

```typescript
✅ Structure du fichier CSV
✅ Distribution des données (Source, State, etc.)
✅ Qualité des données (valeurs manquantes, doublons)
✅ Patterns de classification
✅ Validation des champs numériques
```

## 📈 Métriques et Rapports

### Rapport Automatique
Le système génère automatiquement :

```
📊 RAPPORT DE TEST DU SYSTÈME DE MIGRATION
==========================================================
📅 Date: 26/08/2025 14:30:15
📁 Fichier d'entrée: JY5MB_complete_boat_20250428_0927CEST(in).csv

✅ SUCCÈS Master Part
   📄 Fichier: master_part.csv
   📊 Lignes: 1,247

✅ SUCCÈS Master Part All
   📄 Fichier: master_part_all.csv
   📊 Lignes: 2,156

[...autres modules...]

🎯 RÉSULTAT GLOBAL: 6/6 modules réussis
🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !
```

### Couverture de Code
```bash
npm run test:coverage
```

Génère un rapport HTML détaillé dans `coverage/lcov-report/index.html`

## 🔧 Configuration

### Jest Configuration (`jest.config.js`)
- **TypeScript** avec `ts-jest`
- **Timeout** : 30s par test, 2min pour l'intégration
- **Couverture** automatique
- **Chemins d'importation** configurés

### Variables d'Environnement
- `NODE_ENV=test`
- Chemins automatiques vers le fichier de test
- Configuration des dossiers de sortie

## 🎯 Utilisation Recommandée

### 1. Test Rapide de Validation
```bash
npm run test:validate
```
⏱️ ~5 secondes - Vérifie la structure des données

### 2. Test d'un Module Spécifique  
```bash
npm run test:processors -- --testNamePattern="MasterPart"
```
⏱️ ~15 secondes - Test ciblé

### 3. Test Complet du Système
```bash
npm run test:all
```
⏱️ ~2 minutes - Pipeline complet avec rapport

## 🚨 Gestion d'Erreurs

### Erreurs Courantes

1. **Fichier de test manquant**
   ```
   ❌ ERREUR: Fichier de test manquant: JY5MB_complete_boat_...csv
   ```
   👉 Vérifier la présence du fichier CSV dans le dossier racine

2. **Échec de compilation TypeScript**
   ```bash
   npm run type-check
   ```
   👉 Corriger les erreurs de types

3. **Timeout des tests**
   👉 Augmenter le timeout dans la configuration Jest

### Debug des Tests
```bash
# Mode verbose avec détails
npm run test -- --verbose --no-coverage

# Test spécifique avec debug
npm run test -- tests/processors/master-part.test.ts --verbose
```

## 📚 Ajout de Nouveaux Tests

### Nouveau Processeur
1. Créer `tests/processors/nouveau-processeur.test.ts`
2. Suivre le modèle des tests existants
3. Ajouter au test d'intégration

### Nouvelle Validation
1. Ajouter dans `tests/utils/data-validation.test.ts`
2. Ou créer un nouveau fichier de test
3. Utiliser `TestHelpers` pour la cohérence

## 🎉 Résultats Attendus

Avec le fichier de test fourni, les résultats typiques sont :

```
📊 Données d'entrée: 9,834 lignes
📄 Fichiers générés: 6/6
📤 Lignes de sortie totales: ~3,000-5,000
📊 Taux de conversion: 30-50% (filtrage normal)
⏱️ Temps total: <2 minutes
```

## 🔗 Intégration Continue

Le système est prêt pour l'intégration dans un pipeline CI/CD :

```bash
# Dans GitHub Actions ou autre CI
npm install
npm run type-check
npm run test:coverage
```

---

**🎯 Le système de test garantit la qualité et la fiabilité du processus de migration PLM vers IFS**
