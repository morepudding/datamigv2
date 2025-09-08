# Fix pour le script post-build.js

Si vous avez un projet avec une erreur `require is not defined in ES module scope`, voici comment corriger le script `post-build.js` :

## Changer de :
```javascript
const fs = require('fs');
const path = require('path');
```

## Vers :
```javascript
import fs from 'fs';
import path from 'path';
```

## Ou renommer le fichier :
Renommez `post-build.js` en `post-build.cjs` et mettez à jour le script dans `package.json` :

```json
{
  "scripts": {
    "postbuild": "node scripts/post-build.cjs"
  }
}
```

## Pour le projet DataMigV2 actuel :
Le projet DataMigV2/datamigv2 fonctionne correctement et n'a pas ce problème. Le déploiement Vercel pointe vers le mauvais repository.
