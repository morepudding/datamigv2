# 📋 Documentation - Logique Métier du Système de Migration de Données

## 🎯 Vue d'ensemble du Projet

Ce projet implémente un système de transformation de données PLM (Product Lifecycle Management) vers un format compatible avec le système IFS. Il traite des fichiers Excel contenant des données de nomenclatures et génère plusieurs fichiers CSV structurés selon les exigences IFS.

### 🔄 Processus Global de Migration

```
Fichier Excel (PLM) → Transformation → 5 Fichiers CSV (IFS) → Archive ZIP
```

## 📊 Structure des Données d'Entrée

### Colonnes Clés du Fichier Excel Source
- **Number** : Numéro de pièce unique (clé primaire)
- **Name** : Désignation française de la pièce
- **Part English designation** : Désignation anglaise de la pièce (prioritaire)
- **Classification** : Code de classification hiérarchique (ex: "AN29-02-00")
- **Source** : Type d'approvisionnement ("Buy", "Make", etc.)
- **State** : État du cycle de vie ("Released", "In Work", "Under Review")
- **Version** : Révision de la pièce (A, B, C, D, E, F, etc.)
- **Context** : Contexte métier (5 premiers caractères = code projet)
- **Phantom Manufacturing Part** : Indicateur de pièce fantôme ("Yes", "No")
- **Site IFS** : Code site de destination (6 caractères minimum)
- **Structure Level** : Niveau hiérarchique dans la nomenclature (0, 1, 2, 3...)
- **Quantity** : Quantité requise par niveau de structure

### Colonnes d'Attributs Techniques (via X_attributs.csv)
- **Marque** → BRAND (A)
- **Matière** → MATERIAL (A)
- **Masse** → WEIGHT (N)
- **Thickness** → PANEL THICKNESS (N)
- **Largeur sens du fil** → GRAIN DIR WIDTH (N)
- **Longueur sens du fil** → GRAIN DIR LGTH (N)
- **Working length** → OVERALL LENGTH (N)
- **Surface** → SURFACE (N)
- **Edge banding length** → EDGE LENGTH (N)
- **Edge banding thickness** → EDGE THICKN (N)
- **Edge banding wood type** → EDGE MATERIAL (A)
- **Edge banding width** → EDGE WIDTH (N)
- **Largeur** → WIDTH VNR SHEET (N)
- **Longueur** → LNGH VENEER SHT (N)
- **Profile** → PROFILE CODE (A)
- **Finition face extérieure** → MATRL INT VN F (A)
- **Finition face intérieure** → MATRL OUT VN F (A)
- **Matrice** → MATRIX NUMBER (A)
- **Semelle** → MOLD PLATE (A)
- **Position matrice** → MATRIX POSITION (A)
- **Position moule** → MOLD POSITION (A)
- **Code usinage** → MACHINING CODE (N)
- **Numéro de moule** → MOLD NUMBER (A)
- **Aboutage** → FINGER JOINT (A)
- **Side veneer wood type** → VENEER MATERIAL (A)
- **Side veneer surface** → VENEER AREA (N)
- **Angle de découpe droite** → RIGHT ANGLE (N)
- **Angle de découpe gauche** → LEFT ANGLE (N)
- **Angle de découpe oblique droite** → RIGHT OBLIQUE (N)
- **Angle de découpe oblique gauche** → LEFT OBLIQUE (N)
- **Epaisseur hors tout** → OVERALL THICKN (N)
- **Largeur hors tout** → OVERALL WIDTH (N)
- **Face de placage intérieure** → MATRL INT VN F (A)
- **Face de placage extérieure** → MATRL OUT VN F (A)
- **Section** → SECTION (A)
- **Code boite usinage** → MACHINING BOX (A)
- **Sens du fil** → WOOD GRAIN (A)
- **Surface peinte** → PAINT AERA (N)

## 🏗️ Architecture Logique des Transformations

### 1️⃣ **MASTER PART** - Référentiel Principal des Pièces

#### Objectif
Créer le référentiel maître des pièces manufacturées (hors achats).

#### Règles de Filtrage (Étape par Étape)
```javascript
// ÉTAPE 1 : Exclusion des pièces d'achat
Source !== "Buy" (case insensitive, avec trim)

// ÉTAPE 2 : Filtrage sur classification
Classification.length >= 10 // Minimum 10 caractères
ET Classification.slice(-10).slice(0, 4) === "AN29" // Les 4 premiers des 10 derniers = "AN29"

// ÉTAPE 3 : Exclusion des pièces fantômes spécifiques
SI Classification.slice(-10) === "AN29-02-00" 
   ET PhantomManufacturingPart.toLowerCase().trim() === "no"
   ALORS EXCLURE

// ÉTAPE 4 : Exclusion des révisions A en cours de travail
SI (State.toLowerCase().trim() === "in work" OU State.toLowerCase().trim() === "under review")
   ET Version.trim() === "A"
   ALORS EXCLURE

// ÉTAPE 5 : Déduplication sur colonne "Number"
// Garder uniquement la première occurrence de chaque Number
```

#### Logique de Transformation des Révisions (PART_REV)
```javascript
const versionMapping = {
  F: "E", E: "D", D: "C", C: "B", B: "A", A: "A"
};

// Règle de calcul :
SI State.toLowerCase().trim() === "released" 
   ALORS PART_REV = Version (révision actuelle)
SINON
   SI (State === "in work" OU State === "under review") ET Version existe dans versionMapping
      ALORS PART_REV = versionMapping[Version] (révision - 1)
   SINON PART_REV = Version (inchangé)
```

#### Structure des Colonnes de Sortie (18 colonnes)
1. **PART_NO** : `row["Number"]` ou "" si vide
2. **DESCRIPTION** : **Priorité cascade** : 
   - `row["Part English designation"]` (1ère priorité - désignation anglaise)
   - OU `row["Name"]` (2ème priorité - désignation française)  
   - OU "" (valeur par défaut si les deux sont vides)
3. **INFO_TEXT** : "" (toujours vide)
4. **UNIT_CODE** : "PCS" (toujours fixe)
5. **CONFIGURABLE_DB** : 
   - "CONFIGURED" si `row["Classification"].includes("AN29-02-00")`
   - "NOT CONFIGURED" sinon
6. **SERIAL_TRACKING_CODE_DB** : "NOT SERIAL TRACKING" (toujours fixe)
7. **PROVIDE_DB** : "PHANTOM" (toujours fixe)
8. **PART_REV** : Calculé selon la logique ci-dessus
9. **ASSORTMENT_ID** : "Classification" (toujours fixe)
10. **ASSORTMENT_NODE** : **Extraction sécurisée via regex** :
    - `(row["Classification"].match(/AN\d{2}-\d{2}-\d{2}/) || [""])[0] || ""`
    - Recherche le pattern AN + 2 chiffres + tiret + 2 chiffres + tiret + 2 chiffres
    - Protection contre null avec double fallback
11. **CODE_GTIN** : "" (toujours vide)
12. **PART_MAIN_GROUP** : 
    - 5 premiers caractères du Context si format `[A-Z0-9]{5}`
    - "" sinon
13. **FIRST_INVENTORY_SITE** : "FR008" (toujours fixe)
14. **CONFIG_FAMILY_ID** :
    - "ANY-XX-WOODP-0" si `row["Classification"].includes("AN29-02-00")`
    - "" sinon
15. **ALLOW_CHANGES_TO_CREATED_DOP_STRUCTURE** : "" (toujours vide)
16. **ALLOW_AS_NOT_CONSUMED** : false (toujours fixe)
17. **VOLUME_NET** : 0 (toujours fixe)
18. **WEIGHT_NET** : 0 (toujours fixe)

### 2️⃣ **MASTER PART ALL** - Référentiel Complet

#### Objectif
Version étendue du Master Part incluant toutes les pièces (y compris achats) pour les structures.

#### Différences Critiques avec Master Part (Règles Réelles du Code)
```javascript
// DIFFÉRENCE 1 : AUCUN filtre sur Source (toutes les lignes conservées)
// Commentaire dans le code : "Ici, on ne filtre PAS sur la colonne Source"

// DIFFÉRENCE 2 : Filtrage simplifié sur Classification
classification.includes("AN29") // Contient AN29 n'importe où (pas les 10 derniers)
ET (
  state === "released" 
  OU (state === "in work" ET version !== "A")
)
// Note: Pas de "under review" dans Master Part ALL

// DIFFÉRENCE 3 : Exclusion des fantômes identique mais avec includes()
assortmentNode.includes("AN29-02-00") // includes au lieu de exact match
ET phantomPart === "no"
ALORS EXCLURE

// DIFFÉRENCE 4 : Logique PART_REV différente
SI state !== "released" ET version in versionMapping
   ALORS partRev = versionMapping[version]
SINON partRev = version
// Note: Pas de vérification "in work" ou "under review" spécifique
```

#### Structure des Colonnes
Identique à Master Part (18 colonnes avec mêmes règles de calcul).

#### RÈGLE CRITIQUE pour Master Part ALL
```javascript
// ERREUR DANS LA DOC : Master Part ALL ne conserve PAS la colonne Source
// La colonne Source des données d'origine n'est PAS incluse dans le CSV
// Le filtrage "buy" dans Eng Part Structure se fait donc AUTREMENT

// PROBLÈME IDENTIFIÉ : Le code Eng Part Structure tente d'accéder à 
// masterIndex[partNo]["Source"] mais cette propriété n'existe pas
// dans master_part_all.csv car seules les 18 colonnes standard sont générées
```

### 3️⃣ **ENG PART STRUCTURE** - Structure de Nomenclature

#### Objectif
Définir les liens parent-enfant dans les nomenclatures d'ingénierie.

#### Prérequis Obligatoire
- Le fichier `master_part_all.csv` DOIT exister dans le dossier output
- Lecture et indexation de master_part_all.csv par PART_NO

#### Algorithme de Calcul des Variables Intermédiaires (AX, AY, AZ)

##### Variable AX - Identification du Parent
```javascript
// Pour chaque ligne i du BOM
const structureLevel = parseInt(row["Structure Level"] || "0", 10);

SI structureLevel > 0 ALORS
   // Recherche rétrograde pour trouver le parent
   POUR j = i-1 vers 0 FAIRE
      prevLevel = parseInt(bomData[j]["Structure Level"] || "0", 10);
      SI prevLevel === (structureLevel - 1) ALORS
         AX = bomData[j]["Number"].trim();
         BREAK;
   SINON AX = "";
```

##### Variable AY - Vérification dans Master Part ALL
```javascript
SI AX n'est pas vide ET AX existe dans masterIndex ALORS
   AY = "FOUND";
SINON
   AY = "";
```

##### Variable AZ - Compteur d'Occurrences du Parent
```javascript
SI AY !== "" ALORS
   count = 0;
   POUR k = 0 vers i FAIRE
      SI bomData[k]["Number"].trim() === AX ALORS
         count++;
   AZ = count;
SINON
   AZ = "";
```

#### Structure des Colonnes de Sortie (7 colonnes)

##### Colonne A : PART NO
```javascript
SI AZ === 1 ALORS
   PART_NO = AX; // Le parent à sa première occurrence
SINON
   PART_NO = ""; // Ligne filtrée
```

##### Règles d'Exclusion Supplémentaires (Code Exact)
```javascript
// 1. Exclure si PART_NO est vide
if (!partNo) {
  continue; // Ligne ignorée
}

// 2. Exclure si PART_NO n'existe pas dans Master Part ALL
if (!masterIndex[partNo]) {
  continue; // Ligne ignorée
}

// 3. RÈGLE CRITIQUE : Exclure si Source = "buy" dans Master Part ALL
if ((masterIndex[partNo]["Source"] || "").toLowerCase().trim() === "buy") {
  continue; // Ligne ignorée
}
// Note: Cette règle prouve que Master Part ALL DOIT conserver la colonne Source
// car elle est utilisée ici pour filtrer les relations parent-enfant
```

##### Colonne B : PART REV
```javascript
// Récupéré depuis Master Part ALL
PART_REV = masterIndex[PART_NO]["PART_REV"] || "";
```

##### Colonne C : SUB PART NO
```javascript
// Numéro de la pièce enfant (ligne courante du BOM)
SUB_PART_NO = currentRow["Number"].trim();
```

##### Colonne D : SUB PART REV (Code Exact)
```javascript
// FONCTION EXACTE du code :
function computeSubPartRev(partNo, version, state) {
  if (!partNo) return "";

  // RÈGLE 1: Si State = "Released" (exact, case sensitive)
  if (state === "Released") {
    return version;
  }

  // RÈGLE 2: Switch exact pour décrémenter
  switch (version) {
    case "I": return "H";
    case "H": return "G";
    case "G": return "F";
    case "F": return "E";
    case "E": return "D";
    case "D": return "C";
    case "C": return "B";
    case "B": return "A";
    case "A": return "A"; // Reste A si déjà A
    default: return version; // Si autre chose que A..I, renvoie tel quel
  }
}

// Utilisation EXACTE :
const version = String(currentRow["Version"] || "").trim();
const state = String(currentRow["State"] || "").trim();
const subPartRev = computeSubPartRev(partNo, version, state);
```

##### Colonne E : QTY
```javascript
// Quantité directement depuis le BOM
QTY = currentRow["Quantity"] || "";
```

##### Colonne F : STR COMMENT
```javascript
// Toujours vide
STR_COMMENT = "";
```

##### Colonne G : SORT NO
```javascript
// Calcul basé sur le nombre d'occurrences du PART_NO dans les résultats
function countOccurrencesSoFar(resultsArray, partNo) {
  let count = 0;
  for (const row of resultsArray) {
    if (row["PART NO"] === partNo) {
      count++;
    }
  }
  return count;
}

// Utilisation :
timesSoFar = countOccurrencesSoFar(results, PART_NO);
totalCount = timesSoFar + 1;
SORT_NO = totalCount * 10; // Multiplié par 10
```

### 4️⃣ **INVENTORY PART** - Gestion des Stocks

#### Objectif
Configurer les pièces dans le module de gestion des stocks.

#### Prérequis
Filtrage initial identique à Master Part (Source ≠ "Buy").

#### Fonction extractAV - Règles de Sélection Ultra-Restrictives
```javascript
const extractAV = (row) => {
  // 1. Vérification longueur classification
  const classification = row["Classification"] || "";
  if (classification.length < 10) return "";
  
  // 2. Extraction des 10 derniers caractères
  const lastTen = classification.slice(-10);
  
  // 3. Vérification exacte "AN29-02-00"
  if (lastTen !== "AN29-02-00") return "";
  
  // 4. Vérification Phantom Manufacturing Part
  const phantom = (row["Phantom Manufacturing Part"] || "").toLowerCase().trim();
  if (phantom === "no") return "";
  
  // 5. Exclusion des versions A en cours de travail
  const state = (row["State"] || "").toLowerCase().trim();
  const version = (row["Version"] || "").trim();
  if ((state === "in work" || state === "under review") && version === "A") {
    return "";
  }
  
  // Si toutes les conditions sont remplies
  return lastTen; // "AN29-02-00"
};
```

#### Gestion des Occurrences Multiples
```javascript
// Compteur global pour simuler la numérotation
const occurrenceMap = {};

// Pour chaque ligne filtrée :
let occurrence = 1;
if (occurrenceMap[row["Number"]]) {
  occurrence = occurrenceMap[row["Number"]] + 1;
}
occurrenceMap[row["Number"]] = occurrence;

// Calcul de PART_NO
const avValue = extractAV(row);
const partNo = (occurrence === 1 && avValue === "AN29-02-00") ? row["Number"] : "";
```

#### Calcul du CONTRACT (Code Exact)
```javascript
// RÈGLE EXACTE du code Inventory Part :
let contract = "";
if (row["Number"] && row["Site IFS"]) {
  const lastSix = row["Site IFS"].slice(-6); // Pas de toString() ni length check
  contract = lastSix.slice(0, 5);
}

// Dans la transformation finale :
CONTRACT: row["Number"] ? contract : "", // CONTRACT vide si pas de Number

// DIFFÉRENCE avec Inventory Part Plan :
// Inventory Part Plan vérifie partNo ET siteIFS.length >= 6
if (partNo && siteIFS && siteIFS.length >= 6) {
  const lastSix = siteIFS.slice(-6);
  contract = lastSix.slice(0, 5);
}
```

#### Structure des Colonnes de Sortie (19 colonnes - Code Exact)
1. **CONTRACT** : Calculé selon la règle ci-dessus
2. **PART_NO** : row["Number"] si occurrence === 1 ET avValue === "AN29-02-00", sinon ""
3. **DESCRIPTION** : row["Name"] || ""
4. **PART_STATUS** : "A" (toujours fixe)
5. **PLANNER_BUYER** : "*" (toujours fixe)
6. **UNIT_MEAS** : "PCS" (toujours fixe)
7. **CATCH_UNIT** : "PCS" (toujours fixe)
8. **PART_PRODUCT_CODE** : "BND00" (toujours fixe)
9. **TYPE_CODE_DB** : "4" (toujours fixe)
10. **SAFETY_CODE** : "" (toujours vide)
11. **INVENTORY_VALUATION_METHOD** : "AV" (toujours fixe)
12. **INVENTORY_PART_COST_LEVEL** : "COST PER CONFIGURATION" (toujours fixe)
13. **NB_OF_TROLLEYS_FOR_KIT** : "0" (toujours fixe)
14. **SUPERDES_START_DATE** : "" (toujours vide)
15. **CYCLE_COUNTING** : "N" (toujours fixe)
16. **MRP_TO_DOP** : "FALSE" (toujours fixe)
17. **CUSTOMS_STATISTIC** : "" (toujours vide)
18. **COUNTRY_OF_ORIGI** : "" (toujours vide)
19. **C_PPV_STATUS** : "" (toujours vide)

#### Filtrage Final
Seules les lignes avec PART_NO renseigné sont conservées.

### 5️⃣ **INVENTORY PART PLAN** - Planification des Stocks

#### Objectif
Configurer les paramètres de planification des stocks.

#### Différences Critiques avec Inventory Part (Règles Réelles du Code)
```javascript
// DIFFÉRENCE 1 : Déduplication AVANT transformation
const uniqueData = Array.from(new Map(filteredData.map(row => [row["Number"], row])).values());
// Une seule ligne par Number (première occurrence)

// DIFFÉRENCE 2 : Calcul CONTRACT conditionnel
if (partNo && siteIFS && siteIFS.length >= 6) {
  // CONTRACT calculé SEULEMENT si partNo est renseigné
  // Contrairement à Inventory Part qui calcule CONTRACT pour toutes les lignes
}

// DIFFÉRENCE 3 : Même logique extractAV mais résultat différent
const partNo = (avValue === "AN29-02-00") ? row["Number"] : "";
// Pas de gestion des occurrences multiples (déjà dédupliqué)
```

#### Structure des Colonnes de Sortie (31 colonnes - Code Exact)
1. **CONTRACT** : Même calcul qu'Inventory Part
2. **PART_NO** : row["Number"] si avValue === "AN29-02-00", sinon ""
3. **CARRY_RATE** : "" (toujours vide)
4. **LAST_ACTIVITY_DATE** : "01/01/2020" (toujours fixe)
5. **LOT_SIZE** : 0 (toujours fixe)
6. **LOT_SIZE_AUTO_DB** : "N" (toujours fixe)
7. **MAXWEEK_SUPPLY** : 0 (toujours fixe)
8. **MAX_ORDER_QT** : 0 (toujours fixe)
9. **MIN_ORDER_QTY** : 0 (toujours fixe)
10. **MUL_ORDER_QTY** : 0 (toujours fixe)
11. **ORDER_POINT_QTY** : 0 (toujours fixe)
12. **ORDER_POINT_QTY_AUTO_DB** : "N" (toujours fixe)
13. **ORDER_TRIP_DATE** : "" (toujours vide)
14. **SAFETY_STOCK** : 0 (toujours fixe)
15. **SAFETY_LEAD_TIME** : 0 (toujours fixe)
16. **SAFETY_STOCK_AUTO_DB** : "N" (toujours fixe)
17. **SERVICE_RATE** : "" (toujours vide)
18. **SETUP_COST** : "" (toujours vide)
19. **SHRINKAGE_FAC** : 0 (toujours fixe)
20. **STD_ORDER_SIZE** : 0 (toujours fixe)
21. **ORDER_REQUISITION_DB** : "R" (toujours fixe)
22. **QTY_PREDICTED_CONSUMPTION** : "" (toujours vide)
23. **PLANNING_METHOD** : "P" (toujours fixe)
24. **PROPOSAL_RELEASE_DB** : "RELEASE" (toujours fixe)
25. **PERCENT_MANUFACTURED** : 0 (toujours fixe)
26. **PERCENT_ACQUIRED** : 100 (toujours fixe)
27. **SPLIT_MANUF_ACQUIRED_DB** : "NO_SPLIT" (toujours fixe)
28. **ACQUIRED_SUPPLY_TYPE_DB** : "R" (toujours fixe)
29. **MANUF_SUPPLY_TYPE_DB** : "R" (toujours fixe)
30. **PLANNING_METHOD_AUTO_DB** : "TRUE" (toujours fixe)
31. **SCHED_CAPACITY_DB** : "I" (toujours fixe)

### 6️⃣ **TECHNICAL SPEC VALUES** - Spécifications Techniques

#### Objectif
Migrer les attributs techniques des pièces vers le système IFS.

#### Prérequis Obligatoires
1. Le fichier `master_part.csv` (filtré) DOIT exister dans le dossier output
2. Le fichier `X_attributs.csv` DOIT être présent dans le dossier extractors
3. Filtrage initial : Source ≠ "Buy" (identique aux autres modules)

#### Chargement et Indexation du Mapping d'Attributs
```javascript
// Lecture de X_attributs.csv
const attributeMapping = {};
attributeData.forEach(row => {
  if (row["PLM"] && row["IFS"] && row["TYPE"]) {
    attributeMapping[row["PLM"]] = { 
      name: row["IFS"], 
      type: row["TYPE"] // "A" (Alphanumeric) ou "N" (Numeric)
    };
  }
});
```

#### Filtrage par Existence dans Master Part
```javascript
// Ne conserver que les lignes dont le Number existe dans master_part.csv (FILTRÉ)
// RÈGLE CRITIQUE : Utilise master_part.csv (pas master_part_all.csv)
const filteredData = inputDataFiltered.filter(row => 
  masterPartData.some(mp => mp["PART_NO"] === row["Number"])
);

// Cette étape élimine automatiquement les pièces "Buy" car elles ne sont
// pas présentes dans master_part.csv (qui exclut les achats)
```

#### Nettoyage et Transformation des Valeurs
```javascript
// Pour chaque attribut mappé :
Object.keys(attributeMapping).forEach(attribute => {
  if (row[attribute] !== undefined && row[attribute] !== null) {
    // 1) Conversion en chaîne
    let cleanValue = String(row[attribute]);

    // 2) Suppression des unités physiques
    cleanValue = cleanValue.replace(/m²|m|deg|kg/g, "").trim();

    // 3) Suppression des exposants mathématiques
    cleanValue = cleanValue.replace(/\*\*\d+/g, "").trim();

    // 4) Inclusion conditionnelle (exclure les valeurs vides sauf "0")
    if (cleanValue !== "") {
      results.push({
        MASTER_PART: row["Number"],
        ATTRIBUT: attributeMapping[attribute].name,
        VALEUR: cleanValue,
        TYPE: attributeMapping[attribute].type
      });
    }
  }
});
```

#### Déduplication des Résultats
```javascript
// Élimination des doublons basée sur la clé composite
const uniqueMap = new Map();
results.forEach(item => {
  const key = `${item.MASTER_PART}-${item.ATTRIBUT}-${item.VALEUR}-${item.TYPE}`;
  uniqueMap.set(key, item);
});
const finalResults = Array.from(uniqueMap.values());
```

#### Structure des Colonnes de Sortie (4 colonnes)
1. **MASTER_PART** : row["Number"] (numéro de pièce source)
2. **ATTRIBUT** : Nom IFS de l'attribut (mappé depuis PLM)
3. **VALEUR** : Valeur nettoyée de l'attribut
4. **TYPE** : "A" (Alphanumeric) ou "N" (Numeric)

#### Mapping Complet des Attributs (43 attributs)
```javascript
const completeAttributeMapping = {
  // Attributs matériaux et dimensions
  "Marque": { name: "BRAND", type: "A" },
  "Matière": { name: "MATERIAL", type: "A" },
  "Masse": { name: "WEIGHT", type: "N" },
  "Thickness": { name: "PANEL THICKNESS", type: "N" },
  "Largeur sens du fil": { name: "GRAIN DIR WIDTH", type: "N" },
  "Longueur sens du fil": { name: "GRAIN DIR LGTH", type: "N" },
  "Working length": { name: "OVERALL LENGTH", type: "N" },
  "Surface": { name: "SURFACE", type: "N" },
  
  // Attributs chants et bordures
  "Edge banding length": { name: "EDGE LENGTH", type: "N" },
  "Edge banding thickness": { name: "EDGE THICKN", type: "N" },
  "Edge banding wood type": { name: "EDGE MATERIAL", type: "A" },
  "Edge banding width": { name: "EDGE WIDTH", type: "N" },
  
  // Attributs placage
  "Largeur": { name: "WIDTH VNR SHEET", type: "N" },
  "Longueur": { name: "LNGH VENEER SHT", type: "N" },
  "Side veneer wood type": { name: "VENEER MATERIAL", type: "A" },
  "Side veneer surface": { name: "VENEER AREA", type: "N" },
  "Face de placage intérieure": { name: "MATRL INT VN F", type: "A" },
  "Face de placage extérieure": { name: "MATRL OUT VN F", type: "A" },
  
  // Attributs profil et finition
  "Profile": { name: "PROFILE CODE", type: "A" },
  "Finition face extérieure": { name: "MATRL INT VN F", type: "A" },
  "Finition face intérieure": { name: "MATRL OUT VN F", type: "A" },
  
  // Attributs outillage et fabrication
  "Matrice": { name: "MATRIX NUMBER", type: "A" },
  "Semelle": { name: "MOLD PLATE", type: "A" },
  "Position matrice": { name: "MATRIX POSITION", type: "A" },
  "Position moule": { name: "MOLD POSITION", type: "A" },
  "Code usinage": { name: "MACHINING CODE", type: "N" },
  "Numéro de moule": { name: "MOLD NUMBER", type: "A" },
  "Code boite usinage": { name: "MACHINING BOX", type: "A" },
  
  // Attributs techniques spécifiques
  "Aboutage": { name: "FINGER JOINT", type: "A" },
  "Sens du fil": { name: "WOOD GRAIN", type: "A" },
  "Section": { name: "SECTION", type: "A" },
  "Surface peinte": { name: "PAINT AERA", type: "N" },
  
  // Attributs angles et dimensions hors tout
  "Angle de découpe droite": { name: "RIGHT ANGLE", type: "N" },
  "Angle de découpe gauche": { name: "LEFT ANGLE", type: "N" },
  "Angle de découpe oblique droite": { name: "RIGHT OBLIQUE", type: "N" },
  "Angle de découpe oblique gauche": { name: "LEFT OBLIQUE", type: "N" },
  "Epaisseur hors tout": { name: "OVERALL THICKN", type: "N" },
  "Largeur hors tout": { name: "OVERALL WIDTH", type: "N" }
};
```

## 🚨 INCOHÉRENCE CRITIQUE IDENTIFIÉE

### ⚠️ Problème dans Eng Part Structure
```javascript
// LIGNE 187 du code Eng Part Structure :
if ((masterIndex[partNo]["Source"] || "").toLowerCase().trim() === "buy") {
  continue;
}

// PROBLÈME : master_part_all.csv ne contient PAS la colonne "Source"
// Elle contient seulement les 18 colonnes standard du Master Part
// Cette règle ne peut donc JAMAIS s'exécuter correctement

// RÉSULTAT : masterIndex[partNo]["Source"] sera toujours undefined
// Le filtrage des pièces "buy" ne fonctionne pas comme prévu
```

### 🔧 Solution Nécessaire
Pour que le système fonctionne correctement, il faut SOIT :
1. **Ajouter la colonne Source** dans master_part_all.csv
2. **OU modifier Eng Part Structure** pour ne pas dépendre de cette colonne
3. **OU filtrer "buy" directement dans Master Part ALL**

## ⚠️ Règles Critiques Souvent Oubliées

### 📋 Priorité des Désignations (Master Part)
```javascript
// PRIORITÉ ABSOLUE : "Part English designation" > "Name" > ""
DESCRIPTION = row["Part English designation"] || row["Name"] || ""

// Cette règle s'applique aux deux Master Part (filtré et ALL)
// L'anglais est TOUJOURS prioritaire sur le français
```

### 🔗 Différence Fondamentale Master Part vs Master Part ALL
```javascript
// Master Part (filtré) :
// - Exclut Source = "Buy" 
// - Utilisé par Technical Spec Values
// - Fichier : master_part.csv

// Master Part ALL (non filtré) :
// - INCLUT Source = "Buy" 
// - Utilisé par Eng Part Structure
// - Fichier : master_part_all.csv
// - CONSERVE la colonne Source pour filtrage ultérieur
```

### 📊 Gestion des Regex et Patterns
```javascript
// ASSORTMENT_NODE - Protection double fallback
const assortmentNode = (row["Classification"].match(/AN\d{2}-\d{2}-\d{2}/) || [""])[0] || "";
// 1er fallback : match() peut retourner null
// 2ème fallback : [0] peut être undefined

// PART_MAIN_GROUP - Validation stricte
const contextCode = row["Context"] && row["Context"].length >= 5 
  ? row["Context"].substring(0, 5) 
  : "";
const partMainGroup = /^[A-Z0-9]{5}$/.test(contextCode) ? contextCode : "";
```

### 🏭 Logique Source dans Eng Part Structure
```javascript
// RÈGLE OUBLIÉE : Le filtrage Source = "buy" se fait sur Master Part ALL
// Pas sur le BOM d'entrée, mais sur les données Master Part ALL

if ((masterIndex[PART_NO]["Source"] || "").toLowerCase().trim() === "buy") {
  // Exclure cette relation parent-enfant
  continue;
}
```

### 📋 Calculs Conditionnels Inventory Part
```javascript
// CONTRACT calculé pour TOUTES les lignes (même celles filtrées après)
// PART_NO calculé SEULEMENT si extractAV() = "AN29-02-00" ET occurrence = 1
const contract = calculateContract(row); // Toujours calculé
const partNo = (occurrence === 1 && extractAV(row) === "AN29-02-00") 
  ? row["Number"] : ""; // Conditionnel
```

## 🎯 Règles Métier Transversales

### Gestion des États de Cycle de Vie
```javascript
const stateLogic = {
  "Released": "Utiliser révision actuelle",
  "In Work": "Utiliser révision - 1 (sauf si Version = A → exclusion)",
  "Under Review": "Utiliser révision - 1 (sauf si Version = A → exclusion)"
};
```

### Hiérarchie des Classifications
```
AN29-xx-xx : Famille de produits principale
AN29-02-00 : Sous-famille configurable spécifique
```

### Règles d'Approvisionnement
- **"Buy"** : Pièces achetées → Exclues des processus de fabrication
- **"Make"** : Pièces manufacturées → Incluses dans tous les processus

## 📦 Génération de l'Archive Finale

### Structure de l'Archive
```
Import IFS [CODE]/
├── 01_L_PARTS_MD_004_[CODE]_WOOD.csv           (Master Part - 18 colonnes)
├── 02_L_ENG_PART_STRUCT_[CODE]_WOOD.csv        (Eng Part Structure - 7 colonnes)
├── 03_L_TECHNICAL_CLASS_VALUES_[CODE]_WOOD.csv (Technical Specs - 4 colonnes)
├── 04_L_INVENTORY_PART_[CODE]_WOOD.csv         (Inventory Part - 19 colonnes)
└── 05_L_INVENTORY_PART_PLAN_[CODE]_WOOD.csv    (Inventory Part Plan - 31 colonnes)
```

### Extraction du Code Projet
```javascript
// Lecture de la première ligne du fichier d'entrée
const workbookInput = xlsx.readFile(req.file.path);
const sheetNameInput = workbookInput.SheetNames[0];
const inputData = xlsx.utils.sheet_to_json(workbookInput.Sheets[sheetNameInput], { defval: "" });

// Extraction du code (défaut "XXXXX" si problème)
let code = "XXXXX";
if (inputData.length > 0 && inputData[0]["Context"]) {
  code = inputData[0]["Context"].toString().trim().substring(0, 5);
}
```

### Processus de Renommage et Archivage
```javascript
// 1. Création du dossier d'export
const folderName = `Import IFS ${code}`;
const exportFolder = path.join(outputDir, folderName);

// 2. Renommage selon la convention
const renamedFiles = {
  masterPart: `01_L_PARTS_MD_004_${code}_WOOD.csv`,
  engPart: `02_L_ENG_PART_STRUCT_${code}_WOOD.csv`,
  technicalSpecValues: `03_L_TECHNICAL_CLASS_VALUES_${code}_WOOD.csv`,
  inventoryPart: `04_L_INVENTORY_PART_${code}_WOOD.csv`,
  inventoryPartPlan: `05_L_INVENTORY_PART_PLAN_${code}_WOOD.csv`
};

// 3. Création de l'archive ZIP
const zipPath = path.join(outputDir, `${folderName}.zip`);
// Archive contenant le dossier avec les 5 fichiers renommés
```

## 🔧 Points d'Attention Critiques pour la Réimplémentation

### 1️⃣ Ordre de Traitement OBLIGATOIRE
```
ÉTAPE 1: Master Part (filtré) → Génération de master_part.csv
ÉTAPE 2: Master Part ALL (non filtré) → Génération de master_part_all.csv
ÉTAPE 3: Technical Spec Values → Utilise master_part.csv (DÉPENDANCE FICHIER)
ÉTAPE 4: Eng Part Structure → Utilise master_part_all.csv (DÉPENDANCE FICHIER)
ÉTAPE 5: Inventory Part → Indépendant (aucune dépendance fichier)
ÉTAPE 6: Inventory Part Plan → Indépendant (aucune dépendance fichier)
ÉTAPE 7: Archivage et renommage
```

#### ⚠️ CRITIQUE : Dépendances Fichiers vs Modules
```javascript
// Les étapes 3 et 4 lisent des fichiers CSV générés par les étapes 1 et 2
// Ce ne sont PAS des dépendances mémoire mais des dépendances FICHIER
// Le système de fichiers est utilisé comme interface entre modules

// Technical Spec Values fait :
const masterPartPath = path.join(__dirname, "../../output/master_part.csv");
const masterData = xlsx.readFile(masterPartPath); // LECTURE FICHIER

// Eng Part Structure fait :
const masterPartPath = path.join(__dirname, "../../output/master_part_all.csv");  
const masterData = xlsx.readFile(masterPartPath); // LECTURE FICHIER
```

### 2️⃣ Gestion des Références Croisées
```javascript
// Master Part ALL DOIT être généré AVANT Eng Part Structure
// Technical Spec Values DOIT être généré APRÈS Master Part (filtré)
// Eng Part Structure lit master_part_all.csv via le système de fichiers
// Technical Spec Values lit master_part.csv via le système de fichiers
```

### 3️⃣ Gestion des Copies de Fichiers
```javascript
// Le processus principal crée des copies du fichier source pour chaque module :
const fileCopies = {
  masterPartFile: req.file.path + "_master",
  techSpecFile: req.file.path + "_techspec", 
  engPartFile: req.file.path + "_engpart",
  inventoryPartFile: req.file.path + "_inventoryPart",
  inventoryPartPlanFile: req.file.path + "_inventoryPartPlan",
};

// Chaque module reçoit sa propre copie du fichier source
// Nettoyage obligatoire des fichiers temporaires à la fin
```

### 4️⃣ Délimiteur CSV et Encodage
```javascript
// TOUS les fichiers CSV utilisent :
fieldDelimiter: ";" // Point-virgule obligatoire
encoding: "utf8"     // UTF-8 obligatoire (implicite avec csv-writer)
```

### 5️⃣ Gestion des Valeurs par Défaut
```javascript
// Lors de la lecture Excel :
xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
// defval: "" garantit que les cellules vides deviennent des chaînes vides
```

### 6️⃣ Gestion des Headers CSV
```javascript
// Tous les CSV utilisent des headers dynamiques basés sur les clés d'objet
const csvWriter = createCsvWriter({
  path: csvPath,
  header: Object.keys(transformedData[0]).map(key => ({ id: key, title: key })),
  fieldDelimiter: ";"
});

// Les headers sont générés automatiquement = même ordre que les propriétés d'objet
// CRITIQUE : L'ordre des propriétés dans l'objet définit l'ordre des colonnes CSV
```

### 7️⃣ Cas Particuliers de Nettoyage
```javascript
// Eng Part Structure - Nettoyage fichiers temporaires
fs.unlinkSync(bomPath); // Suppression du fichier uploadé après traitement

// Process Files - Nettoyage multiple
[req.file.path, ...Object.values(fileCopies)].forEach(file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
});
```

## 📈 Métriques et Contrôles Qualité Détaillés

### Compteurs à Surveiller par Module

#### Master Part
- Lignes lues au départ
- Lignes après filtre Source (≠ "Buy")
- Lignes après filtre formule (Classification + State + Version)
- Lignes après suppression doublons sur Number

#### Master Part ALL  
- Lignes lues au départ (identique à Master Part)
- Lignes après premier filtrage (Classification + State)
- Lignes après suppression des interdits (Phantom)
- Lignes après suppression doublons sur Number

#### Eng Part Structure
- Lignes BOM extraites
- Lignes MasterPart ALL extraites
- Nombre d'entrées dans masterIndex
- Lignes avec PART_NO renseigné
- Lignes après exclusion MasterPart inexistant
- Lignes après exclusion Source = "Buy"

#### Inventory Part
- Lignes après filtrage Source (≠ "Buy")
- Lignes avec avValue = "AN29-02-00"
- Lignes avec PART_NO renseigné (après gestion occurrences)

#### Inventory Part Plan
- Lignes après filtrage Source (≠ "Buy")  
- Lignes après déduplication par Number
- Lignes avec PART_NO renseigné

#### Technical Spec Values
- Lignes MasterPart chargées
- Lignes Input après filtre Source
- Lignes après filtrage par existence dans MasterPart
- Nombre de valeurs générées (avec doublons)
- Nombre de valeurs après déduplication

### Validations Recommandées
```javascript
// Cohérence des révisions
versionMapping = { F: "E", E: "D", D: "C", C: "B", B: "A", A: "A" };

// Formats obligatoires
PART_MAIN_GROUP: /^[A-Z0-9]{5}$/ ou ""
ASSORTMENT_NODE: /AN\d{2}-\d{2}-\d{2}/ ou ""
Classification: length >= 10 pour extraction

// Valeurs fixes à contrôler
UNIT_CODE: "PCS"
FIRST_INVENTORY_SITE: "FR008"  
PROVIDE_DB: "PHANTOM"
SERIAL_TRACKING_CODE_DB: "NOT SERIAL TRACKING"
```

---

*Ce document constitue la spécification fonctionnelle complète pour réimplémenter le système dans n'importe quelle technologie en conservant la logique métier exacte et tous les détails d'implémentation.*
